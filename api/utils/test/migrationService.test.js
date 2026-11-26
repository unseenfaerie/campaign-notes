const sqlite3 = require('sqlite3').verbose();
const { MigrationService } = require('../migrationService');
const { domainManifest } = require('../../../common/domainManifest');
const { buildAllCreateTableSql } = require('../../data/schemaBuilder');
const directionMigration = require('../../migrations/006-relation-visibility-direction');
const secretNotesMigration = require('../../migrations/007-secret-dm-notes');
const containmentMigration = require('../../migrations/008-place-containment');
const eventSequenceMigration = require('../../migrations/009-event-sequence');
const timelineMigration = require('../../migrations/010-relation-timelines');
const characterDirectionMigration = require('../../migrations/011-character-relationship-direction');

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

    it('merges dated records into ordered timeline entries and keeps opposite perspectives', async () => {
        for (const sql of buildAllCreateTableSql()) await run(database, sql);
        await run(database, `CREATE TABLE edit_proposals (id INTEGER, resource_name TEXT, target_kind TEXT, status TEXT)`);
        await run(database, 'DROP TABLE character_relationships');
        await run(database, `CREATE TABLE character_relationships (
            character_id TEXT, related_id TEXT, established_date TEXT, dissolution_date TEXT,
            relationship_type TEXT, short_description TEXT, long_explanation TEXT,
            visibility_direction TEXT, last_edited_by TEXT, last_edited_at TEXT,
            PRIMARY KEY (character_id, related_id, established_date))`);
        await run(database, `INSERT INTO character_relationships VALUES
            ('a', 'b', '0200200001_age-of-descent-default', '0200200003_age-of-descent-default', 'friend', 'Old', 'More', 'first_to_second', 'dm', 'old'),
            ('a', 'b', '0200200004_age-of-descent-default', NULL, 'enemy', 'New', NULL, 'first_to_second', 'dm', 'new'),
            ('b', 'a', '0200200002_age-of-descent-default', NULL, 'friend', 'Other side', NULL, 'first_to_second', 'dm', 'other')`);
        const service = new MigrationService(database, { expectedVersion: 10, migrations: [timelineMigration] });
        await service.applyLatest();
        const forward = await get(database, `SELECT * FROM character_relationships WHERE character_id = 'a'`);
        expect(forward.relationship_type).toBe('enemy');
        expect(forward.short_description).toBe('New');
        expect(JSON.parse(forward.timeline).map(entry => [entry.date, entry.description])).toEqual([
            ['0200200001_age-of-descent-default', 'Established: Old\n\nMore'],
            ['0200200003_age-of-descent-default', 'Dissolved'],
            ['0200200004_age-of-descent-default', 'Established: New'],
        ]);
        const reverse = await get(database, `SELECT * FROM character_relationships WHERE character_id = 'b'`);
        expect(reverse.short_description).toBe('Other side');
        expect(JSON.parse(reverse.timeline)).toHaveLength(1);
        await expect(service.applyLatest()).resolves.toBe(10);
    });

    it('rolls back timeline migration when legacy visibility conflicts or proposals are pending', async () => {
        for (const sql of buildAllCreateTableSql()) await run(database, sql);
        await run(database, `CREATE TABLE edit_proposals (id INTEGER, resource_name TEXT, target_kind TEXT, status TEXT)`);
        await run(database, 'DROP TABLE character_places');
        await run(database, `CREATE TABLE character_places (
            character_id TEXT, place_id TEXT, arrived_date TEXT, left_date TEXT, short_description TEXT,
            long_explanation TEXT, visibility_direction TEXT, last_edited_by TEXT, last_edited_at TEXT)`);
        await run(database, `INSERT INTO character_places VALUES
            ('a', 'p', '0200200001_age-of-descent-default', NULL, 'One', NULL, 'first_to_second', NULL, NULL),
            ('a', 'p', '0200200002_age-of-descent-default', NULL, 'Two', NULL, 'second_to_first', NULL, NULL)`);
        const service = new MigrationService(database, { expectedVersion: 10, migrations: [timelineMigration] });
        await expect(service.applyLatest()).rejects.toThrow('Conflicting visibility directions');
        expect((await get(database, 'SELECT COUNT(*) AS count FROM character_places')).count).toBe(2);
        await run(database, `INSERT INTO edit_proposals VALUES (1, 'CharacterPlace', 'relation', 'pending')`);
        await expect(service.applyLatest()).rejects.toThrow('Resolve pending historical relation proposals');
        expect((await get(database, 'SELECT COUNT(*) AS count FROM character_places')).count).toBe(2);
    });

    it('restricts bidirectional character relationships without changing their origin or timeline', async () => {
        await run(database, `CREATE TABLE character_relationships (
            character_id TEXT, related_id TEXT, visibility_direction TEXT, timeline TEXT)`);
        await run(database, `INSERT INTO character_relationships VALUES
            ('a', 'b', 'both', '[{"description":"met"}]'),
            ('b', 'a', 'first_to_second', '[]')`);
        const service = new MigrationService(database, { expectedVersion: 11, migrations: [characterDirectionMigration] });
        await service.applyLatest();
        await expect(get(database, `SELECT * FROM character_relationships WHERE character_id = 'a'`)).resolves.toEqual({
            character_id: 'a', related_id: 'b', visibility_direction: 'first_to_second', timeline: '[{"description":"met"}]',
        });
        await expect(get(database, `SELECT visibility_direction FROM character_relationships WHERE character_id = 'b'`))
            .resolves.toEqual({ visibility_direction: 'first_to_second' });
    });

    it('does not silently expose a reverse-only character relationship during migration', async () => {
        await run(database, `CREATE TABLE character_relationships (
            character_id TEXT, related_id TEXT, visibility_direction TEXT)`);
        await run(database, `INSERT INTO character_relationships VALUES
            ('a', 'b', 'both'), ('c', 'd', 'second_to_first')`);
        const service = new MigrationService(database, { expectedVersion: 11, migrations: [characterDirectionMigration] });
        await expect(service.applyLatest()).rejects.toThrow('Review character relationship c -> d');
        await expect(get(database, `SELECT visibility_direction FROM character_relationships WHERE character_id = 'a'`))
            .resolves.toEqual({ visibility_direction: 'both' });
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

    it('merges reciprocal and one-sided legacy event links and preserves unrelated pending proposals', async () => {
        await run(database, `CREATE TABLE events (id TEXT PRIMARY KEY, previous_event_id TEXT, next_event_id TEXT)`);
        await run(database, `CREATE INDEX idx_events_previous_event_id ON events(previous_event_id)`);
        await run(database, `CREATE INDEX idx_events_next_event_id ON events(next_event_id)`);
        await run(database, `CREATE TABLE edit_proposals (id INTEGER PRIMARY KEY, resource_name TEXT, target_kind TEXT, status TEXT, proposed_changes TEXT, base_snapshot TEXT)`);
        await run(database, `INSERT INTO events VALUES ('a', NULL, 'b'), ('b', 'a', NULL), ('c', 'a', NULL), ('d', NULL, 'b')`);
        await run(database, `INSERT INTO edit_proposals VALUES (1, 'Event', 'entity', 'pending', '{"name":"new"}', '{"id":"b","previous_event_id":"a","next_event_id":null}')`);
        const service = new MigrationService(database, { expectedVersion: 9, migrations: [eventSequenceMigration] });
        await service.applyLatest();
        await expect(get(database, `SELECT COUNT(*) AS count FROM event_sequence`)).resolves.toEqual({ count: 3 });
        for (const [earlier, later] of [['a', 'b'], ['a', 'c'], ['d', 'b']]) {
            await expect(get(database, `SELECT visibility_direction FROM event_sequence WHERE earlier_id = ? AND later_id = ?`, [earlier, later]))
                .resolves.toEqual({ visibility_direction: 'both' });
        }
        await expect(get(database, `SELECT previous_event_id FROM events`)).rejects.toThrow();
        await expect(get(database, `SELECT next_event_id FROM events`)).rejects.toThrow();
        await expect(get(database, `SELECT base_snapshot FROM edit_proposals WHERE id = 1`)).resolves.toEqual({ base_snapshot: '{"id":"b"}' });
    });

    it.each([
        ['a cycle', `INSERT INTO events VALUES ('a', NULL, 'b'), ('b', NULL, 'a')`, 'cycle'],
        ['a missing event', `INSERT INTO events VALUES ('a', NULL, 'missing')`, 'Event does not exist'],
        ['a self-link', `INSERT INTO events VALUES ('a', 'a', NULL)`, 'cycle'],
    ])('rolls back event migration on %s', async (_label, insert, error) => {
        await run(database, `CREATE TABLE events (id TEXT PRIMARY KEY, previous_event_id TEXT, next_event_id TEXT)`);
        await run(database, `CREATE TABLE edit_proposals (id INTEGER PRIMARY KEY, resource_name TEXT, target_kind TEXT, status TEXT, proposed_changes TEXT, base_snapshot TEXT)`);
        await run(database, insert);
        const service = new MigrationService(database, { expectedVersion: 9, migrations: [eventSequenceMigration] });
        await expect(service.applyLatest()).rejects.toThrow(error);
        await expect(get(database, `SELECT name FROM sqlite_master WHERE name = 'event_sequence'`)).resolves.toBeNull();
        await expect(get(database, `SELECT id FROM events WHERE id = 'a'`)).resolves.toEqual({ id: 'a' });
    });

    it.each(['previous_event_id', 'next_event_id'])('requires review of pending %s proposals', async (field) => {
        await run(database, `CREATE TABLE events (id TEXT PRIMARY KEY, previous_event_id TEXT, next_event_id TEXT)`);
        await run(database, `CREATE TABLE edit_proposals (id INTEGER PRIMARY KEY, resource_name TEXT, target_kind TEXT, status TEXT, proposed_changes TEXT, base_snapshot TEXT)`);
        await run(database, `INSERT INTO edit_proposals VALUES (1, 'Event', 'entity', 'pending', ?, '{}')`,
            [JSON.stringify({ [field]: 'a' })]);
        const service = new MigrationService(database, { expectedVersion: 9, migrations: [eventSequenceMigration] });
        await expect(service.applyLatest()).rejects.toThrow('Resolve pending Event order proposals');
        await expect(get(database, `SELECT name FROM sqlite_master WHERE name = 'event_sequence'`)).resolves.toBeNull();
    });
});