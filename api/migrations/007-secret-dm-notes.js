const { domainManifest } = require('../../common/domainManifest');
const { runStatement } = require('../utils/migrationService');

function getColumns(database, table) {
    return new Promise((resolve, reject) => {
        database.all(`PRAGMA table_info(${table})`, (error, rows) => error ? reject(error) : resolve(rows));
    });
}

module.exports = {
    version: 7,
    description: 'Add secret DM notes to campaign entities',

    async up(database) {
        for (const entity of Object.values(domainManifest.entities)) {
            if (!entity.fields.secret_dm_notes?.access?.dmOnly) continue;

            const columns = await getColumns(database, entity.table);
            if (!columns.some((column) => column.name === 'secret_dm_notes')) {
                await runStatement(database, `ALTER TABLE ${entity.table} ADD COLUMN secret_dm_notes TEXT`);
            }
        }
    },
};
