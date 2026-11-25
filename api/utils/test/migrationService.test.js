const sqlite3 = require('sqlite3').verbose();
const { MigrationService } = require('../migrationService');
const { domainManifest } = require('../../../common/domainManifest');
const { buildAllCreateTableSql } = require('../../data/schemaBuilder');
const directionMigration = require('../../migrations/006-relation-visibility-direction');
const secretNotesMigration = require('../../migrations/007-secret-dm-notes');
const containmentMigration = require('../../migrations/008-place-containment');

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

    it('adds secret DM note columns to the seven eligible entity tables without losing rows', async () => {
        const entities = Object.values(domainManifest.entities)
            .filter((entity) => entity.fields.secret_dm_notes?.access?.dmOnly);

        for (const entity of entities) {
            await run(database, `CREATE TABLE ${entity.table} (id TEXT PRIMARY KEY)`);
            await run(database, `INSERT INTO ${entity.table} (id) VALUES ('existing')`);
        }

        await secretNotesMigration.up(database);
        await secretNotesMigration.up(database);

        for (const entity of entities) {
            await expect(get(database, `SELECT id, secret_dm_notes FROM ${entity.table}`))
                .resolves.toEqual({ id: 'existing', secret_dm_notes: null });
        }
    });

    it('migrates place parents, enforcing a single parent, acyclicity and deletion cleanup', async () => {
        await run(database, `CREATE TABLE places (id TEXT PRIMARY KEY, parent_id TEXT, last_edited_by TEXT, last_edited_at TEXT)`);
        await run(database, `CREATE TABLE edit_proposals (id INTEGER PRIMARY KEY, resource_name TEXT, target_kind TEXT, status TEXT, proposed_changes TEXT, base_snapshot TEXT)`);
        await run(database, `INSERT INTO places VALUES ('root', NULL, NULL, NULL), ('child', 'root', 'dm', 'date'), ('leaf', 'child', NULL, NULL)`);
        await run(database, `INSERT INTO edit_proposals VALUES (1, 'Place', 'entity', 'pending', '{"name":"new"}', '{"id":"child","parent_id":"root"}')`);
        const service = new MigrationService(database, { expectedVersion: 8, migrations: [containmentMigration] });
        await service.applyLatest();
        await expect(get(database, `SELECT * FROM place_containment WHERE child_id = 'child'`)).resolves.toEqual({
            child_id: 'child', parent_id: 'root', visibility_direction: 'both', last_edited_by: 'dm', last_edited_at: 'date',
        });
        await expect(get(database, `SELECT parent_id FROM places`)).rejects.toThrow();
        await expect(get(database, `SELECT base_snapshot FROM edit_proposals WHERE id = 1`))
            .resolves.toEqual({ base_snapshot: '{"id":"child"}' });
        await expect(run(database, `INSERT INTO place_containment VALUES ('root', 'leaf', 'both', NULL, NULL)`)).rejects.toThrow('cycle');
        await expect(run(database, `INSERT INTO place_containment VALUES ('root', 'root', 'both', NULL, NULL)`)).rejects.toThrow('cycle');
        await expect(run(database, `INSERT INTO place_containment VALUES ('child', 'leaf', 'both', NULL, NULL)`)).rejects.toThrow();
        await expect(run(database, `INSERT INTO place_containment VALUES ('root', 'missing', 'both', NULL, NULL)`)).rejects.toThrow('does not exist');
        await run(database, `DELETE FROM places WHERE id = 'child'`);
        await expect(get(database, `SELECT COUNT(*) AS count FROM place_containment`)).resolves.toEqual({ count: 0 });
    });

    it('rolls back migration when a pending parent proposal needs review', async () => {
        await run(database, `CREATE TABLE places (id TEXT PRIMARY KEY, parent_id TEXT, last_edited_by TEXT, last_edited_at TEXT)`);
        await run(database, `CREATE TABLE edit_proposals (id INTEGER PRIMARY KEY, resource_name TEXT, target_kind TEXT, status TEXT, proposed_changes TEXT, base_snapshot TEXT)`);
        await run(database, `INSERT INTO edit_proposals VALUES (1, 'Place', 'entity', 'pending', '{"parent_id":"root"}', '{}')`);
        const service = new MigrationService(database, { expectedVersion: 8, migrations: [containmentMigration] });
        await expect(service.applyLatest()).rejects.toThrow('Resolve pending Place parent proposals');
        await expect(get(database, `SELECT name FROM sqlite_master WHERE name = 'place_containment'`)).resolves.toBeNull();
        await expect(get(database, `SELECT parent_id FROM places`)).resolves.toBeNull();
    });

    it('refuses to migrate a cyclic legacy hierarchy without losing parent data', async () => {
        await run(database, `CREATE TABLE places (id TEXT PRIMARY KEY, parent_id TEXT, last_edited_by TEXT, last_edited_at TEXT)`);
        await run(database, `CREATE TABLE edit_proposals (id INTEGER PRIMARY KEY, resource_name TEXT, target_kind TEXT, status TEXT, proposed_changes TEXT, base_snapshot TEXT)`);
        await run(database, `INSERT INTO places VALUES ('a', 'b', NULL, NULL), ('b', 'a', NULL, NULL)`);
        const service = new MigrationService(database, { expectedVersion: 8, migrations: [containmentMigration] });
        await expect(service.applyLatest()).rejects.toThrow('cycle');
        await expect(get(database, `SELECT parent_id FROM places WHERE id = 'a'`)).resolves.toEqual({ parent_id: 'b' });
        await expect(get(database, `SELECT name FROM sqlite_master WHERE name = 'place_containment'`)).resolves.toBeNull();
    });
});