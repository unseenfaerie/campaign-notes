const fs = require('fs');
const os = require('os');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { BackupService } = require('../backupService');

function run(database, sql) {
    return new Promise((resolve, reject) => {
        database.run(sql, (error) => (error ? reject(error) : resolve()));
    });
}

function close(database) {
    return new Promise((resolve, reject) => {
        database.close((error) => (error ? reject(error) : resolve()));
    });
}

describe('BackupService', () => {
    let temporaryDirectory;
    let sourceDatabase;

    beforeEach(async () => {
        temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'campaign-notes-backup-'));
        sourceDatabase = new sqlite3.Database(':memory:');
        await run(sourceDatabase, 'CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT NOT NULL)');
        await run(sourceDatabase, "INSERT INTO notes (body) VALUES ('test note')");
    });

    afterEach(async () => {
        await close(sourceDatabase);
        fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    });

    it('creates a consistent SQLite backup in the configured directory', async () => {
        const service = new BackupService({
            database: sourceDatabase,
            sourcePath: ':memory:',
            backupDir: path.join(temporaryDirectory, 'backups'),
        });

        const backupPath = await service.createBackup('test');
        expect(fs.existsSync(backupPath)).toBe(true);

        const backupDatabase = new sqlite3.Database(backupPath);
        await expect(new Promise((resolve, reject) => {
            backupDatabase.get('SELECT body FROM notes WHERE id = 1', (error, row) => {
                if (error) reject(error);
                else resolve(row.body);
            });
        })).resolves.toBe('test note');
        await close(backupDatabase);
    });

    it('prunes only old backup files', () => {
        const backupDir = path.join(temporaryDirectory, 'backups');
        fs.mkdirSync(backupDir);
        const oldBackup = path.join(backupDir, 'campaign_backup_old.db');
        const recentBackup = path.join(backupDir, 'campaign_backup_recent.db');
        fs.writeFileSync(oldBackup, 'old');
        fs.writeFileSync(recentBackup, 'recent');
        const oldTime = (Date.now() - 2 * 24 * 60 * 60 * 1000) / 1000;
        fs.utimesSync(oldBackup, oldTime, oldTime);

        const service = new BackupService({
            database: sourceDatabase,
            sourcePath: ':memory:',
            backupDir,
        });

        expect(service.pruneOldBackups(1)).toBe(1);
        expect(fs.existsSync(oldBackup)).toBe(false);
        expect(fs.existsSync(recentBackup)).toBe(true);
    });
});