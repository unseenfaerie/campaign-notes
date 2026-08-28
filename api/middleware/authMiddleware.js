const jwt = require('jsonwebtoken');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me';

function parseBearerToken(authHeader) {
  if (!authHeader || typeof authHeader !== 'string') {
    return null;
  }

  const [scheme, token] = authHeader.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}

function requireAuth(req, res, next) {
  const token = parseBearerToken(req.headers.authorization);
  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    req.auth = {
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
      sessionId: payload.sid,
    };

    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired access token' });
  }
}

function requireRole(roles) {
  const allowedRoles = Array.isArray(roles) ? roles : [];

  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.auth.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return next();
  };
}

function requireDmForMutations(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD') {
    return next();
  }

  if (!req.auth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.auth.role !== 'dm') {
    return res.status(403).json({ error: 'Only DM users can directly modify domain resources' });
  }

  return next();
}

module.exports = {
  requireAuth,
  requireRole,
  requireDmForMutations,
};