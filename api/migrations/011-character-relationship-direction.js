const { runStatement } = require('../utils/migrationService');

module.exports = {
    version: 11,
    description: 'Make character relationships origin-to-target',

    async up(database) {
        await runStatement(database,
            "UPDATE character_relationships SET visibility_direction = 'first_to_second' WHERE visibility_direction IS NOT 'first_to_second'");
    },
};
