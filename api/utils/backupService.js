const fs = require('fs');
const path = require('path');

class BackupService {
    constructor({ database, sourcePath, backupDir }) {
        if (!database || typeof database.backup !== 'function') {
            throw new Error('A live SQLite database connection is required for backups');
        }

        this.database = database;
        this.sourcePath = sourcePath;
        this.backupDir = backupDir;
    }

    ensureBackupDirectory() {
        fs.mkdirSync(this.backupDir, { recursive: true, mode: 0o750 });
    }

    createBackup(label = '') {
        this.ensureBackupDirectory();

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const suffix = label ? `_${label}` : '';
        const backupPath = path.join(this.backupDir, `campaign_backup_${timestamp}${suffix}.db`);

        return new Promise((resolve, reject) => {
            const backup = this.database.backup(backupPath);
            backup.step(-1, (error) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(backupPath);
            });
        });
    }

    pruneOldBackups(retentionDays) {
        if (!Number.isInteger(retentionDays) || retentionDays < 1) {
            throw new Error('Backup retention must be a positive whole number');
        }

        if (!fs.existsSync(this.backupDir)) return 0;

        const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
        let removed = 0;

        for (const filename of fs.readdirSync(this.backupDir)) {
            if (!filename.startsWith('campaign_backup_') || !filename.endsWith('.db')) continue;

            const backupPath = path.join(this.backupDir, filename);
            const stats = fs.statSync(backupPath);
            if (stats.isFile() && stats.mtimeMs < cutoff) {
                fs.unlinkSync(backupPath);
                removed += 1;
            }
        }

        return removed;
    }
}

module.exports = { BackupService };