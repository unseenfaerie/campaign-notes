const { runStatement } = require('../utils/migrationService');

function getRow(database, sql) {
    return new Promise((resolve, reject) => {
        database.get(sql, (error, row) => error ? reject(error) : resolve(row));
    });
}

module.exports = {
    version: 11,
    description: 'Make character relationships origin-to-target',

    async up(database) {
        const conflict = await getRow(database, `SELECT character_id, related_id, visibility_direction
            FROM character_relationships
            WHERE visibility_direction IS NULL OR visibility_direction NOT IN ('first_to_second', 'both')
            LIMIT 1`);
        if (conflict) {
            throw new Error(`Review character relationship ${conflict.character_id} -> ${conflict.related_id}: ` +
                `visibility direction ${conflict.visibility_direction} cannot be migrated without changing who can see it`);
        }
        await runStatement(database,
            "UPDATE character_relationships SET visibility_direction = 'first_to_second' WHERE visibility_direction = 'both'");
    },
};
