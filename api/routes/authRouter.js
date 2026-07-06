const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { get, run } = require('../data/sqliteAsync');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me';
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '15m';
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || '30d';
const REFRESH_COOKIE_NAME = 'refresh_token';

function isCookieSecure() {
  if (process.env.COOKIE_SECURE === 'true') return true;
  if (process.env.COOKIE_SECURE === 'false') return false;
  return process.env.NODE_ENV === 'production';
}

function getCookieSameSite() {
  return process.env.COOKIE_SAMESITE || 'strict';
}

function getRefreshCookieOptions() {
  return {
    httpOnly: true,
    secure: isCookieSecure(),
    sameSite: getCookieSameSite(),
    path: '/api/auth',
  };
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function isIsoExpired(iso) {
  return Date.parse(iso) <= Date.now();
}

function signAccessToken(user, sessionId) {
  return jwt.sign(
    {
      role: user.role,
      username: user.username,
      sid: sessionId,
    },
    ACCESS_SECRET,
    {
      subject: user.id,
      expiresIn: ACCESS_TOKEN_TTL,
    }
  );
}

function signRefreshToken(user, sessionId) {
  return jwt.sign(
    {
      type: 'refresh',
      role: user.role,
      username: user.username,
      sid: sessionId,
    },
    REFRESH_SECRET,
    {
      subject: user.id,
      expiresIn: REFRESH_TOKEN_TTL,
    }
  );
}

function buildRefreshResponse(accessToken) {
  return {
    tokenType: 'Bearer',
    accessToken,
    expiresIn: ACCESS_TOKEN_TTL,
  };
}

async function insertRefreshSession({ sessionId, userId, refreshToken, rotatedFrom = null }) {
  const refreshHash = hashToken(refreshToken);
  const nowIso = new Date().toISOString();
  const decoded = jwt.decode(refreshToken);
  const expiresIso = new Date((decoded.exp || 0) * 1000).toISOString();

  await run(
    `INSERT INTO refresh_sessions (id, user_id, refresh_hash, expires_at, revoked_at, rotated_from, rotated_to, created_at)
     VALUES (?, ?, ?, ?, NULL, ?, NULL, ?)`,
    [sessionId, userId, refreshHash, expiresIso, rotatedFrom, nowIso]
  );
}

router.post('/token', async (req, res) => {
  try {
    const username = req.body && typeof req.body.username === 'string' ? req.body.username.trim() : '';
    const password = req.body && typeof req.body.password === 'string' ? req.body.password : '';

    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    const user = await get(
      'SELECT id, username, password_hash, role, disabled FROM users WHERE username = ?',
      [username]
    );

    if (!user || user.disabled) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const sessionId = crypto.randomUUID();
    const refreshToken = signRefreshToken(user, sessionId);
    const accessToken = signAccessToken(user, sessionId);

    await insertRefreshSession({
      sessionId,
      userId: user.id,
      refreshToken,
    });

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
    return res.json(buildRefreshResponse(accessToken));
  } catch (err) {
    return res.status(500).json({ error: 'Failed to issue token' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies ? req.cookies[REFRESH_COOKIE_NAME] : null;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Missing refresh token' });
    }

    let payload;
    try {
      payload = jwt.verify(refreshToken, REFRESH_SECRET);
    } catch (_err) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    if (!payload || payload.type !== 'refresh' || !payload.sid || !payload.sub) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const session = await get(
      'SELECT id, user_id, refresh_hash, expires_at, revoked_at, rotated_to FROM refresh_sessions WHERE id = ?',
      [payload.sid]
    );

    if (!session) {
      return res.status(401).json({ error: 'Invalid refresh session' });
    }

    const incomingHash = hashToken(refreshToken);
    if (
      session.user_id !== payload.sub ||
      session.refresh_hash !== incomingHash ||
      session.revoked_at ||
      session.rotated_to ||
      isIsoExpired(session.expires_at)
    ) {
      return res.status(401).json({ error: 'Refresh session is not valid' });
    }

    const user = await get(
      'SELECT id, username, role, disabled FROM users WHERE id = ?',
      [session.user_id]
    );

    if (!user || user.disabled) {
      return res.status(401).json({ error: 'Invalid user session' });
    }

    const newSessionId = crypto.randomUUID();
    const newRefreshToken = signRefreshToken(user, newSessionId);
    const newAccessToken = signAccessToken(user, newSessionId);

    await run('UPDATE refresh_sessions SET revoked_at = ?, rotated_to = ? WHERE id = ?', [
      new Date().toISOString(),
      newSessionId,
      session.id,
    ]);

    await insertRefreshSession({
      sessionId: newSessionId,
      userId: user.id,
      refreshToken: newRefreshToken,
      rotatedFrom: session.id,
    });

    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, getRefreshCookieOptions());
    return res.json(buildRefreshResponse(newAccessToken));
  } catch (_err) {
    return res.status(500).json({ error: 'Failed to refresh token' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const refreshToken = req.cookies ? req.cookies[REFRESH_COOKIE_NAME] : null;

    if (refreshToken) {
      try {
        const payload = jwt.verify(refreshToken, REFRESH_SECRET);
        if (payload && payload.sid) {
          await run('UPDATE refresh_sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL', [
            new Date().toISOString(),
            payload.sid,
          ]);
        }
      } catch (_err) {
        // Ignore invalid token on logout; cookie is still cleared below.
      }
    }

    res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions());
    return res.status(204).send();
  } catch (_err) {
    return res.status(500).json({ error: 'Failed to logout' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await get('SELECT id, username, role, disabled FROM users WHERE id = ?', [req.auth.userId]);

    if (!user || user.disabled) {
      return res.status(401).json({ error: 'Invalid user session' });
    }

    return res.json({
      id: user.id,
      username: user.username,
      role: user.role,
    });
  } catch (_err) {
    return res.status(500).json({ error: 'Failed to load current user' });
  }
});

module.exports = router;