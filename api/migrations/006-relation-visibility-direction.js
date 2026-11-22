const { domainManifest } = require('../../common/domainManifest');
const { runStatement } = require('../utils/migrationService');

function getColumns(database, table) {
    return new Promise((resolve, reject) => {
        database.all(`PRAGMA table_info(${table})`, (error, rows) => error ? reject(error) : resolve(rows));
    });
}

module.exports = {
    version: 6,
    description: 'Add per-record relation visibility direction',

    async up(database) {
        for (const relation of Object.values(domainManifest.relations)) {
            const columns = await getColumns(database, relation.table);
            if (!columns.some((column) => column.name === 'visibility_direction')) {
                await runStatement(database,
                    `ALTER TABLE ${relation.table} ADD COLUMN visibility_direction TEXT NOT NULL DEFAULT 'both'`);
            }
        }
    },
};
