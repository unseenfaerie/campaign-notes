const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { dbPath } = require('../config');

async function copyDatabase(source, destination) {
    const database = await new Promise((resolve, reject) => {
        const connection = new sqlite3.Database(source, sqlite3.OPEN_READONLY, (error) => {
            if (error) reject(error);
            else resolve(connection);
        });
    });

    try {
        await new Promise((resolve, reject) => {
            const backup = database.backup(destination);
            backup.step(-1, (stepError) => {
                backup.finish((finishError) => {
                    if (stepError || finishError) reject(stepError || finishError);
                    else resolve();
                });
            });
        });
    } finally {
        await new Promise((resolve, reject) => {
            database.close((error) => (error ? reject(error) : resolve()));
        });
    }
}

async function main() {
    const [action, directory] = process.argv.slice(2);
    if (!['snapshot', 'restore'].includes(action) || !directory || !process.env.DB_PATH || !path.isAbsolute(process.env.DB_PATH)) {
        throw new Error('Usage: DB_PATH=<absolute persistent database path> node deploymentDatabase.js snapshot|restore <snapshot directory>');
    }

    const backupPath = path.join(directory, 'database.db');
    const absentMarker = path.join(directory, 'database-absent');
    const metadataPath = path.join(directory, 'metadata.json');
    if (action === 'snapshot') {
        if (fs.existsSync(dbPath)) {
            const { uid, gid, mode } = fs.statSync(dbPath);
            await copyDatabase(dbPath, backupPath);
            fs.writeFileSync(metadataPath, JSON.stringify({ uid, gid, mode }), { flag: 'wx' });
        } else {
            for (const suffix of ['-wal', '-shm', '-journal']) {
                if (fs.existsSync(dbPath + suffix)) {
                    throw new Error(`Database is missing but ${dbPath + suffix} exists`);
                }
            }
            fs.writeFileSync(absentMarker, '', { flag: 'wx' });
        }
    } else if (fs.existsSync(absentMarker)) {
        for (const suffix of ['', '-wal', '-shm', '-journal']) {
            fs.rmSync(dbPath + suffix, { force: true });
        }
    } else {
        const { uid, gid, mode } = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        if (!fs.existsSync(backupPath)) throw new Error('Database snapshot is missing');
        if (!fs.existsSync(dbPath)) {
            fs.closeSync(fs.openSync(dbPath, 'wx', mode));
            fs.chownSync(dbPath, uid, gid);
        }
        await copyDatabase(backupPath, dbPath);
    }
}

main().catch((error) => {
    console.error(`Deployment database operation failed: ${error.message}`);
    process.exitCode = 1;
});
