const { domainManifest } = require('../../common/domainManifest');

function runStatement(database, sql, params = []) {
    return new Promise((resolve, reject) => {
        database.run(sql, params, (error) => (error ? reject(error) : resolve()));
    });
}

function getRows(database, sql, params = []) {
    return new Promise((resolve, reject) => {
        database.all(sql, params, (error, rows) => (error ? reject(error) : resolve(rows || [])));
    });
}

// Safe to call even if schemaBuilder already created the column on a fresh database.
async function addColumnIfMissing(database, table, columnName, columnSql) {
    const existingColumns = await getRows(database, `PRAGMA table_info(${table})`);
    if (existingColumns.some((column) => column.name === columnName)) {
        return;
    }

    await runStatement(database, `ALTER TABLE ${table} ADD COLUMN ${columnSql}`);
}

function getAllManifestTables(manifest) {
    const tables = [];
    for (const entityDef of Object.values(manifest.entities)) {
        tables.push(entityDef.table);
    }
    for (const relationDef of Object.values(manifest.relations)) {
        tables.push(relationDef.table);
    }
    return tables;
}

module.exports = {
    version: 2,
    description: 'Add last_edited_by/last_edited_at audit columns and the edit_proposals table',

    async up(database) {
        for (const table of getAllManifestTables(domainManifest)) {
            await addColumnIfMissing(database, table, 'last_edited_by', 'last_edited_by TEXT');
            await addColumnIfMissing(database, table, 'last_edited_at', 'last_edited_at TEXT');
        }

        await runStatement(database, `CREATE TABLE IF NOT EXISTS edit_proposals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            target_kind TEXT NOT NULL CHECK(target_kind IN ('entity', 'relation')),
            resource_name TEXT NOT NULL,
            target_key TEXT NOT NULL,
            base_snapshot TEXT NOT NULL,
            proposed_changes TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected')),
            proposed_by TEXT NOT NULL,
            proposed_at TEXT NOT NULL,
            reviewed_by TEXT,
            reviewed_at TEXT,
            review_note TEXT,
            FOREIGN KEY(proposed_by) REFERENCES users(id),
            FOREIGN KEY(reviewed_by) REFERENCES users(id)
        )`);

        await runStatement(
            database,
            `CREATE UNIQUE INDEX IF NOT EXISTS idx_edit_proposals_pending_unique
                ON edit_proposals(resource_name, target_key)
                WHERE status = 'pending'`
        );
    },
};
