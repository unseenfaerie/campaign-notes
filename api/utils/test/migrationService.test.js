const sqlite3 = require('sqlite3').verbose();
const { MigrationService } = require('../migrationService');
const { domainManifest } = require('../../../common/domainManifest');
const { buildAllCreateTableSql } = require('../../data/schemaBuilder');
const directionMigration = require('../../migrations/006-relation-visibility-direction');

function run(database, sql, params = []) {
    return new Promise((resolve, reject) => {
        database.run(sql, params, (error) => (error ? reject(error) : resolve()));
    });
}

function get(database, sql, params = []) {
    return new Promise((resolve, reject) => {
        database.get(sql, params, (error, row) => (error ? reject(error) : resolve(row || null)));
    });
}

function close(database) {
    return new Promise((resolve, reject) => {
        database.close((error) => (error ? reject(error) : resolve()));
    });
}

describe('MigrationService', () => {
    let database;

    beforeEach(() => {
        database = new sqlite3.Database(':memory:');
    });

    afterEach(async () => {
        await close(database);
    });

    it('applies the v1 baseline once and is idempotent', async () => {
        const service = new MigrationService(database, {
            expectedVersion: 1,
            migrations: [{ version: 1, description: 'baseline', async up() { } }],
        });

        await expect(service.applyLatest()).resolves.toBe(1);
        await expect(service.applyLatest()).resolves.toBe(1);
        await expect(get(database, 'SELECT COUNT(*) AS count FROM schema_migrations')).resolves.toEqual({ count: 1 });
    });

    it('rolls back a failed migration and does not record it', async () => {
        const service = new MigrationService(database, {
            expectedVersion: 2,
            migrations: [
                { version: 1, description: 'baseline', async up() { } },
                {
                    version: 2,
                    description: 'failed change',
                    async up(currentDatabase) {
                        await run(currentDatabase, 'CREATE TABLE should_rollback (id INTEGER)');
                        throw new Error('migration failed');
                    },
                },
            ],
        });

        await expect(service.applyLatest()).rejects.toThrow('migration failed');
        await expect(get(database, "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'should_rollback'")).resolves.toBeNull();
        await expect(get(database, 'SELECT COUNT(*) AS count FROM schema_migrations')).resolves.toEqual({ count: 1 });
    });

    it('refuses a database created by a newer application', async () => {
        const service = new MigrationService(database, {
            expectedVersion: 1,
            migrations: [{ version: 1, description: 'baseline', async up() { } }],
        });
        await service.ensureLedger();
        await run(database, 'INSERT INTO schema_migrations (version, description, applied_at) VALUES (2, ?, ?)', [
            'future change',
            new Date().toISOString(),
        ]);

        await expect(service.applyLatest()).rejects.toThrow(/newer than application version 1/);
    });

    it('backfills every existing relation table with bidirectional visibility', async () => {
        for (const relation of Object.values(domainManifest.relations)) {
            await run(database, `CREATE TABLE ${relation.table} (value TEXT)`);
            await run(database, `INSERT INTO ${relation.table} (value) VALUES ('existing')`);
        }
        await directionMigration.up(database);
        for (const relation of Object.values(domainManifest.relations)) {
            await expect(get(database, `SELECT visibility_direction FROM ${relation.table}`))
                .resolves.toEqual({ visibility_direction: 'both' });
        }
    });

    it('accepts fresh manifest-generated tables without adding the column twice', async () => {
        for (const sql of buildAllCreateTableSql()) await run(database, sql);
        await expect(directionMigration.up(database)).resolves.toBeUndefined();
        await expect(directionMigration.up(database)).resolves.toBeUndefined();
    });
});