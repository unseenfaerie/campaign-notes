const { all, get, run } = require('./sqliteAsync');

async function findUserByPrincipal(principal) {
    return get(
        `SELECT id, username, password_hash, role, disabled
     FROM users
     WHERE username = ? OR id = ?
     ORDER BY CASE WHEN username = ? THEN 0 ELSE 1 END
     LIMIT 1`,
        [principal, principal, principal]
    );
}

async function findSessionById(sessionId) {
    return get(
        'SELECT id, user_id, refresh_hash, expires_at, revoked_at, rotated_to FROM refresh_sessions WHERE id = ?',
        [sessionId]
    );
}

async function findUserById(userId) {
    return get('SELECT id, username, role, disabled FROM users WHERE id = ?', [userId]);
}

async function createRefreshSession({
    sessionId,
    userId,
    refreshHash,
    expiresIso,
    rotatedFrom = null,
    createdAtIso,
}) {
    await run(
        `INSERT INTO refresh_sessions (id, user_id, refresh_hash, expires_at, revoked_at, rotated_from, rotated_to, created_at)
     VALUES (?, ?, ?, ?, NULL, ?, NULL, ?)`,
        [sessionId, userId, refreshHash, expiresIso, rotatedFrom, createdAtIso]
    );
}

async function rotateRefreshSession({ oldSessionId, newSessionId, revokedAtIso }) {
    await run('UPDATE refresh_sessions SET revoked_at = ?, rotated_to = ? WHERE id = ?', [
        revokedAtIso,
        newSessionId,
        oldSessionId,
    ]);
}

async function revokeRefreshSession({ sessionId, revokedAtIso }) {
    await run('UPDATE refresh_sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL', [
        revokedAtIso,
        sessionId,
    ]);
}

async function revokeAllRefreshSessionsByUserId({ userId, revokedAtIso }) {
    return run(
        'UPDATE refresh_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL',
        [revokedAtIso, userId]
    );
}

async function listAnchoredCharacterIdsByUserId(userId) {
    const rows = await all(
        `SELECT character_id
         FROM user_character_anchors
         WHERE user_id = ?`,
        [userId]
    );

    return rows.map((row) => row.character_id);
}

async function listUsers() {
    return all(
        `SELECT id, username, role, disabled, created_at, updated_at
         FROM users
         ORDER BY username ASC`
    );
}

async function createUser({ id, username, passwordHash, role, disabled = 0, nowIso }) {
    await run(
        `INSERT INTO users (id, username, password_hash, role, disabled, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, username, passwordHash, role, disabled ? 1 : 0, nowIso, nowIso]
    );

    return findUserById(id);
}

async function updateUser(userId, updates = {}) {
    const setClauses = [];
    const values = [];

    if (Object.prototype.hasOwnProperty.call(updates, 'username')) {
        setClauses.push('username = ?');
        values.push(updates.username);
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'role')) {
        setClauses.push('role = ?');
        values.push(updates.role);
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'disabled')) {
        setClauses.push('disabled = ?');
        values.push(updates.disabled ? 1 : 0);
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'passwordHash')) {
        setClauses.push('password_hash = ?');
        values.push(updates.passwordHash);
    }

    if (setClauses.length === 0) {
        return { changes: 0 };
    }

    setClauses.push('updated_at = ?');
    values.push(updates.nowIso || new Date().toISOString());
    values.push(userId);

    return run(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`, values);
}

async function deleteUser(userId) {
    await run('DELETE FROM refresh_sessions WHERE user_id = ?', [userId]);
    await run('DELETE FROM user_character_anchors WHERE user_id = ?', [userId]);
    return run('DELETE FROM users WHERE id = ?', [userId]);
}

async function getUserWithPasswordById(userId) {
    return get('SELECT id, username, password_hash, role, disabled FROM users WHERE id = ?', [userId]);
}

async function upsertUserCharacterAnchor({ userId, characterId, nowIso }) {
    return run(
        `INSERT INTO user_character_anchors (character_id, user_id, created_at)
         VALUES (?, ?, ?)
         ON CONFLICT(character_id) DO UPDATE SET
           user_id = excluded.user_id`,
        [characterId, userId, nowIso]
    );
}

async function removeUserCharacterAnchor(characterId) {
    return run('DELETE FROM user_character_anchors WHERE character_id = ?', [characterId]);
}

async function listCharacterAnchors() {
    return all(
        `SELECT character_id, user_id, created_at
         FROM user_character_anchors
         ORDER BY created_at DESC`
    );
}

async function listCharacterAnchorsByUserId(userId) {
    return all(
        `SELECT character_id, user_id, created_at
         FROM user_character_anchors
         WHERE user_id = ?
         ORDER BY created_at DESC`,
        [userId]
    );
}

module.exports = {
    findUserByPrincipal,
    findSessionById,
    findUserById,
    createRefreshSession,
    rotateRefreshSession,
    revokeRefreshSession,
    revokeAllRefreshSessionsByUserId,
    listAnchoredCharacterIdsByUserId,
    listUsers,
    createUser,
    updateUser,
    deleteUser,
    getUserWithPasswordById,
    upsertUserCharacterAnchor,
    removeUserCharacterAnchor,
    listCharacterAnchors,
    listCharacterAnchorsByUserId,
};