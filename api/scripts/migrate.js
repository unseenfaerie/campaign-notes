require('dotenv').config();

const { db, initializeDatabase } = require('../data/db');
const { domainManifest } = require('../../common/domainManifest');
const { MigrationService } = require('../utils/migrationService');

function closeDatabase() {
    return new Promise((resolve, reject) => {
        db.close((error) => (error ? reject(error) : resolve()));
    });
}

async function main() {
    const command = process.argv[2] || 'status';

    if (command === 'latest') {
        await initializeDatabase();
    } else if (command !== 'status') {
        throw new Error('Usage: node scripts/migrate.js [status|latest]');
    }

    const service = new MigrationService(db, {
        expectedVersion: domainManifest.schemaVersion,
    });
    const applied = await service.getAppliedVersions();
    const currentVersion = await service.getCurrentVersion();
    console.log(`Current schema version: ${currentVersion}`);
    console.log(`Applied migrations: ${applied.length}`);
}

main()
    .catch((error) => {
        console.error('Migration command failed:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        try {
            await closeDatabase();
        } catch (error) {
            console.error('Failed to close database:', error.message);
            process.exitCode = 1;
        }
    });