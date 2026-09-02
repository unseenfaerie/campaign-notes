const fs = require('fs');
const path = require('path');

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

function getRow(database, sql, params = []) {
    return new Promise((resolve, reject) => {
        database.get(sql, params, (error, row) => (error ? reject(error) : resolve(row || null)));
    });
}

class MigrationService {
    constructor(database, { migrationsDir, migrations, expectedVersion } = {}) {
        this.database = database;
        this.migrationsDir = migrationsDir || path.join(__dirname, '../migrations');
        this.migrations = migrations || null;
        this.expectedVersion = expectedVersion;
    }

    async ensureLedger() {
        await runStatement(this.database, `CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            description TEXT NOT NULL,
            applied_at TEXT NOT NULL
        )`);
    }

    loadMigrations() {
        if (this.migrations) {
            return [...this.migrations].sort((left, right) => left.version - right.version);
        }

        const filenames = fs.readdirSync(this.migrationsDir)
            .filter((filename) => /^\d+-.+\.js$/.test(filename))
            .sort();
        const migrations = filenames.map((filename) => require(path.join(this.migrationsDir, filename)));
        const versions = new Set();

        for (const migration of migrations) {
            if (!Number.isInteger(migration.version) || migration.version < 1) {
                throw new Error('Migration versions must be positive integers');
            }
            if (typeof migration.up !== 'function') {
                throw new Error(`Migration ${migration.version} is missing an up function`);
            }
            if (versions.has(migration.version)) {
                throw new Error(`Duplicate migration version: ${migration.version}`);
            }
            versions.add(migration.version);
        }

        return migrations.sort((left, right) => left.version - right.version);
    }

    async getAppliedVersions() {
        await this.ensureLedger();
        return getRows(
            this.database,
            'SELECT version, description, applied_at FROM schema_migrations ORDER BY version ASC'
        );
    }

    async getCurrentVersion() {
        await this.ensureLedger();
        const row = await getRow(
            this.database,
            'SELECT MAX(version) AS version FROM schema_migrations'
        );
        return row && row.version !== null ? row.version : 0;
    }

    async assertCompatible() {
        if (!Number.isInteger(this.expectedVersion)) {
            throw new Error('An expected schema version is required');
        }

        const currentVersion = await this.getCurrentVersion();
        if (currentVersion > this.expectedVersion) {
            throw new Error(
                `Database schema version ${currentVersion} is newer than application version ${this.expectedVersion}`
            );
        }

        return currentVersion;
    }

    async applyMigration(migration) {
        await runStatement(this.database, 'BEGIN IMMEDIATE');

        try {
            await migration.up(this.database);
            await runStatement(
                this.database,
                `INSERT INTO schema_migrations (version, description, applied_at)
                 VALUES (?, ?, ?)`,
                [migration.version, migration.description || '', new Date().toISOString()]
            );
            await runStatement(this.database, 'COMMIT');
        } catch (error) {
            try {
                await runStatement(this.database, 'ROLLBACK');
            } catch (_rollbackError) {
                // Preserve the migration failure; the database may already have rolled back.
            }
            throw error;
        }
    }

    async applyLatest() {
        await this.assertCompatible();
        const migrations = this.loadMigrations();
        const applied = new Set((await this.getAppliedVersions()).map((migration) => migration.version));
        const pending = migrations.filter(
            (migration) => migration.version <= this.expectedVersion && !applied.has(migration.version)
        );

        for (const migration of pending) {
            await this.applyMigration(migration);
        }

        return this.getCurrentVersion();
    }
}

module.exports = {
    MigrationService,
    runStatement,
};