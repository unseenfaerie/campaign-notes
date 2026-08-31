const express = require('express');
const bcrypt = require('bcryptjs');
const { manifestCrudService } = require('../data/genericCrudService');
const {
    findUserById,
    getUserWithPasswordById,
    listUsers,
    createUser,
    updateUser,
    deleteUser,
    listCharacterAnchors,
    listCharacterAnchorsByUserId,
    upsertUserCharacterAnchor,
    removeUserCharacterAnchor,
    revokeAllRefreshSessionsByUserId,
} = require('../data/authRepository');
const { requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

const VALID_ROLES = new Set(['dm', 'player']);

function isSqliteConstraint(err) {
    return err && err.code === 'SQLITE_CONSTRAINT';
}

function parseBoolean(value) {
    if (typeof value === 'boolean') {
        return value;
    }

    if (value === 1 || value === '1') {
        return true;
    }

    if (value === 0 || value === '0') {
        return false;
    }

    return null;
}

function normalizeUsername(username) {
    return typeof username === 'string' ? username.trim() : '';
}

function toSafeUser(user) {
    if (!user) {
        return null;
    }

    return {
        id: user.id,
        username: user.username,
        role: user.role,
        disabled: Boolean(user.disabled),
        createdAt: user.created_at,
        updatedAt: user.updated_at,
    };
}

async function ensureActiveUser(userId) {
    const user = await findUserById(userId);
    if (!user || user.disabled) {
        return null;
    }

    return user;
}

router.patch('/me/username', async (req, res) => {
    try {
        const user = await ensureActiveUser(req.auth.userId);
        if (!user) {
            return res.status(401).json({ error: 'Invalid user session' });
        }

        const username = normalizeUsername(req.body && req.body.username);
        if (!username) {
            return res.status(400).json({ error: 'username is required' });
        }

        await updateUser(req.auth.userId, {
            username,
            nowIso: new Date().toISOString(),
        });

        const updated = await findUserById(req.auth.userId);
        return res.json({
            id: updated.id,
            username: updated.username,
            role: updated.role,
        });
    } catch (err) {
        if (isSqliteConstraint(err)) {
            return res.status(409).json({ error: 'username is already in use' });
        }

        return res.status(500).json({ error: 'Failed to update username' });
    }
});

router.patch('/me/password', async (req, res) => {
    try {
        const currentPassword = req.body && typeof req.body.currentPassword === 'string' ? req.body.currentPassword : '';
        const newPassword = req.body && typeof req.body.newPassword === 'string' ? req.body.newPassword : '';

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'currentPassword and newPassword are required' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'newPassword must be at least 8 characters' });
        }

        const user = await getUserWithPasswordById(req.auth.userId);
        if (!user || user.disabled) {
            return res.status(401).json({ error: 'Invalid user session' });
        }

        const currentMatches = await bcrypt.compare(currentPassword, user.password_hash);
        if (!currentMatches) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        const passwordHash = await bcrypt.hash(newPassword, 12);

        await updateUser(req.auth.userId, {
            passwordHash,
            nowIso: new Date().toISOString(),
        });

        await revokeAllRefreshSessionsByUserId({
            userId: req.auth.userId,
            revokedAtIso: new Date().toISOString(),
        });

        return res.status(204).send();
    } catch (_err) {
        return res.status(500).json({ error: 'Failed to update password' });
    }
});

router.get('/users', requireRole(['dm']), async (_req, res) => {
    try {
        const users = await listUsers();
        return res.json(users.map(toSafeUser));
    } catch (_err) {
        return res.status(500).json({ error: 'Failed to list users' });
    }
});

router.post('/users', requireRole(['dm']), async (req, res) => {
    try {
        const id = typeof req.body?.id === 'string' ? req.body.id.trim() : '';
        const username = normalizeUsername(req.body && req.body.username);
        const password = req.body && typeof req.body.password === 'string' ? req.body.password : '';
        const role = typeof req.body?.role === 'string' ? req.body.role.trim() : 'player';
        const hasDisabled = Object.prototype.hasOwnProperty.call(req.body || {}, 'disabled');
        const disabledValue = hasDisabled ? parseBoolean(req.body.disabled) : false;

        if (!id || !username || !password) {
            return res.status(400).json({ error: 'id, username, and password are required' });
        }

        if (!VALID_ROLES.has(role)) {
            return res.status(400).json({ error: 'Invalid role value' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'password must be at least 8 characters' });
        }

        if (disabledValue === null) {
            return res.status(400).json({ error: 'disabled must be a boolean value' });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const created = await createUser({
            id,
            username,
            passwordHash,
            role,
            disabled: disabledValue,
            nowIso: new Date().toISOString(),
        });

        return res.status(201).json(toSafeUser(created));
    } catch (err) {
        if (isSqliteConstraint(err)) {
            return res.status(409).json({ error: 'A user with that id or username already exists' });
        }

        return res.status(500).json({ error: 'Failed to create user' });
    }
});

router.patch('/users/:userId', requireRole(['dm']), async (req, res) => {
    try {
        const userId = req.params.userId;
        const updates = {};

        if (Object.prototype.hasOwnProperty.call(req.body || {}, 'username')) {
            const username = normalizeUsername(req.body.username);
            if (!username) {
                return res.status(400).json({ error: 'username must be a non-empty string' });
            }

            updates.username = username;
        }

        if (Object.prototype.hasOwnProperty.call(req.body || {}, 'role')) {
            const role = typeof req.body.role === 'string' ? req.body.role.trim() : '';
            if (!VALID_ROLES.has(role)) {
                return res.status(400).json({ error: 'Invalid role value' });
            }

            updates.role = role;
        }

        if (Object.prototype.hasOwnProperty.call(req.body || {}, 'disabled')) {
            const disabledValue = parseBoolean(req.body.disabled);
            if (disabledValue === null) {
                return res.status(400).json({ error: 'disabled must be a boolean value' });
            }

            updates.disabled = disabledValue;
        }

        if (Object.prototype.hasOwnProperty.call(req.body || {}, 'password')) {
            const password = typeof req.body.password === 'string' ? req.body.password : '';
            if (password.length < 8) {
                return res.status(400).json({ error: 'password must be at least 8 characters' });
            }

            updates.passwordHash = await bcrypt.hash(password, 12);
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'At least one editable field is required' });
        }

        const existing = await findUserById(userId);
        if (!existing) {
            return res.status(404).json({ error: 'User not found' });
        }

        updates.nowIso = new Date().toISOString();
        await updateUser(userId, updates);

        if (Object.prototype.hasOwnProperty.call(updates, 'passwordHash')) {
            await revokeAllRefreshSessionsByUserId({
                userId,
                revokedAtIso: new Date().toISOString(),
            });
        }

        const updated = await findUserById(userId);
        return res.json(toSafeUser(updated));
    } catch (err) {
        if (isSqliteConstraint(err)) {
            return res.status(409).json({ error: 'username is already in use' });
        }

        return res.status(500).json({ error: 'Failed to update user' });
    }
});

router.delete('/users/:userId', requireRole(['dm']), async (req, res) => {
    try {
        const userId = req.params.userId;
        if (userId === req.auth.userId) {
            return res.status(400).json({ error: 'Cannot delete your own user account' });
        }

        const existing = await findUserById(userId);
        if (!existing) {
            return res.status(404).json({ error: 'User not found' });
        }

        await deleteUser(userId);
        return res.status(204).send();
    } catch (_err) {
        return res.status(500).json({ error: 'Failed to delete user' });
    }
});

router.get('/anchors/characters', requireRole(['dm']), async (_req, res) => {
    try {
        const anchors = await listCharacterAnchors();
        return res.json(anchors);
    } catch (_err) {
        return res.status(500).json({ error: 'Failed to list character anchors' });
    }
});

router.get('/users/:userId/anchors/characters', requireRole(['dm']), async (req, res) => {
    try {
        const existing = await findUserById(req.params.userId);
        if (!existing) {
            return res.status(404).json({ error: 'User not found' });
        }

        const anchors = await listCharacterAnchorsByUserId(req.params.userId);
        return res.json(anchors);
    } catch (_err) {
        return res.status(500).json({ error: 'Failed to list user character anchors' });
    }
});

router.put('/users/:userId/anchors/characters/:characterId', requireRole(['dm']), async (req, res) => {
    try {
        const userId = req.params.userId;
        const characterId = req.params.characterId;

        const user = await findUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const character = await manifestCrudService.getOne('Character', { id: characterId });
        if (!character) {
            return res.status(404).json({ error: 'Character not found' });
        }

        await upsertUserCharacterAnchor({
            userId,
            characterId,
            nowIso: new Date().toISOString(),
        });

        const anchors = await listCharacterAnchorsByUserId(userId);
        const anchor = anchors.find((row) => row.character_id === characterId);

        return res.json(
            anchor || {
                character_id: characterId,
                user_id: userId,
            }
        );
    } catch (err) {
        if (isSqliteConstraint(err)) {
            return res.status(409).json({ error: 'Failed to save character anchor due to data constraints' });
        }

        return res.status(500).json({ error: 'Failed to anchor character to user' });
    }
});

router.delete('/users/:userId/anchors/characters/:characterId', requireRole(['dm']), async (req, res) => {
    try {
        const userId = req.params.userId;
        const characterId = req.params.characterId;

        const anchors = await listCharacterAnchorsByUserId(userId);
        const existing = anchors.find((row) => row.character_id === characterId);
        if (!existing) {
            return res.status(404).json({ error: 'Character anchor not found for user' });
        }

        await removeUserCharacterAnchor(characterId);
        return res.status(204).send();
    } catch (_err) {
        return res.status(500).json({ error: 'Failed to remove character anchor' });
    }
});

router.post('/users/:userId/revoke-sessions', requireRole(['dm']), async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await findUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        await revokeAllRefreshSessionsByUserId({
            userId,
            revokedAtIso: new Date().toISOString(),
        });

        return res.status(204).send();
    } catch (_err) {
        return res.status(500).json({ error: 'Failed to revoke sessions' });
    }
});

module.exports = router;
