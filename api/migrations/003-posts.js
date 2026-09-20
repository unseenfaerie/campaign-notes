function runStatement(database, sql, params = []) {
    return new Promise((resolve, reject) => {
        database.run(sql, params, (error) => (error ? reject(error) : resolve()));
    });
}

module.exports = {
    version: 3,
    description: 'Add posts table for DM home page updates',

    async up(database) {
        await runStatement(database, `CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL,
            last_edited_by TEXT,
            last_edited_at TEXT,
            FOREIGN KEY(created_by) REFERENCES users(id),
            FOREIGN KEY(last_edited_by) REFERENCES users(id)
        )`);
    },
};
