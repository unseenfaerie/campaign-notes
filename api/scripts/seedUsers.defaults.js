async function seedUsers({ bcrypt, nowIso, runSql }) {
    const dmPasswordHash = bcrypt.hashSync('change-me-dm-password', 12);
    const playerPasswordHash = bcrypt.hashSync('change-me-player-password', 12);
    const viewerPasswordHash = bcrypt.hashSync('change-me-viewer-password', 12);

    await runSql(
        'Inserting default users...',
        `INSERT INTO users (id, username, password_hash, role, disabled, created_at, updated_at) VALUES
      ('dm-admin', 'dm-admin', ?, 'dm', 0, ?, ?),
      ('player-one', 'player-one', ?, 'player', 0, ?, ?),
      ('viewer-one', 'viewer-one', ?, 'viewer', 0, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
      username = excluded.username,
      password_hash = excluded.password_hash,
      role = excluded.role,
      disabled = excluded.disabled,
      updated_at = excluded.updated_at;`,
        [
            dmPasswordHash,
            nowIso,
            nowIso,
            playerPasswordHash,
            nowIso,
            nowIso,
            viewerPasswordHash,
            nowIso,
            nowIso,
        ]
    );
}

module.exports = { seedUsers };
