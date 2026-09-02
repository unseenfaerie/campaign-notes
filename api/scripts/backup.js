require('dotenv').config();

const { db, dbPath, initializeDatabase } = require('../data/db');
const config = require('../config');
const { BackupService } = require('../utils/backupService');

async function closeDatabase() {
    return new Promise((resolve, reject) => {
        db.close((error) => (error ? reject(error) : resolve()));
    });
}

async function main() {
    await initializeDatabase();

    const backupService = new BackupService({
        database: db,
        sourcePath: dbPath,
        backupDir: config.backupDir,
    });
    const backupPath = await backupService.createBackup();
    const removed = backupService.pruneOldBackups(config.backupRetentionDays);

    console.log(`Database backup created: ${backupPath}`);
    console.log(`Old backups removed: ${removed}`);
}

main()
    .catch((error) => {
        console.error('Database backup failed:', error.message);
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