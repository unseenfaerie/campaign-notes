const { get, run } = require('./sqliteAsync');

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

module.exports = {
    findUserByPrincipal,
    findSessionById,
    findUserById,
    createRefreshSession,
    rotateRefreshSession,
    revokeRefreshSession,
};