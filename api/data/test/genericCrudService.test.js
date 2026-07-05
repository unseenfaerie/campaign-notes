const sqlite3 = require('sqlite3').verbose();

jest.mock('../db', () => ({
    db: {
        run: jest.fn((sql, params, callback) => {
            const cb = typeof params === 'function' ? params : callback;
            if (cb) cb(null);
        }),
        get: jest.fn(),
        all: jest.fn(),
    },
    initializeDatabase: jest.fn(),
}));

const { createManifestCrudService } = require('../genericCrudService');
const { buildAllCreateTableSql } = require('../schemaBuilder');

const testManifest = {
    entities: {
        Character: {
            table: 'test_characters',
            route: 'characters',
            idField: 'id',
            fields: {
                id: { type: 'string', primary: true, required: true },
                name: { type: 'string', required: true },
                level: { type: 'number' },
            },
        },
        Item: {
            table: 'test_items',
            route: 'items',
            idField: 'id',
            fields: {
                id: { type: 'string', primary: true, required: true },
                name: { type: 'string', required: true },
            },
        },
        Alias: {
            table: 'test_aliases',
            route: 'aliases',
            idField: 'id',
            fields: {
                id: { type: 'number', primary: true, required: true, autoIncrement: true },
                entity_id: { type: 'string', required: true },
                alias: { type: 'string', required: true },
            },
        },
    },
    relations: {
        CharacterItem: {
            kind: 'history',
            table: 'test_character_items',
            members: [
                { entity: 'Character', key: 'character_id', route: 'items' },
                { entity: 'Item', key: 'item_id', route: 'characters' },
            ],
            historyKey: 'acquired_date',
            keys: ['character_id', 'item_id', 'acquired_date'],
            payload: {
                acquired_date: { type: 'string', required: true },
                short_description: { type: 'string', required: true },
            },
        },
    },
};

function runStatement(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
}

function closeDatabase(db) {
    return new Promise((resolve, reject) => {
        db.close((err) => {
            if (err) return reject(err);
            resolve();
        });
    });
}

async function createTestContext() {
    const db = new sqlite3.Database(':memory:');
    await runStatement(db, 'PRAGMA foreign_keys = ON');

    for (const sql of buildAllCreateTableSql(testManifest)) {
        await runStatement(db, sql);
    }

    return {
        db,
        service: createManifestCrudService(testManifest, db),
    };
}

describe('genericCrudService with isolated manifest and in-memory db', () => {
    let db;
    let service;

    beforeEach(async () => {
        const context = await createTestContext();
        db = context.db;
        service = context.service;
    });

    afterEach(async () => {
        await closeDatabase(db);
    });

    it('inserts and reads an entity using the manifest schema', async () => {
        const inserted = await service.insert('Character', {
            id: 'char-1',
            name: 'Aster',
            level: 3,
        });

        expect(inserted).toEqual({
            id: 'char-1',
            name: 'Aster',
            level: 3,
        });

        await expect(service.getOne('Character', { id: 'char-1' })).resolves.toEqual({
            id: 'char-1',
            name: 'Aster',
            level: 3,
        });
    });

    it('supports empty and filtered reads', async () => {
        await service.insert('Character', { id: 'char-1', name: 'Aster', level: 3 });
        await service.insert('Character', { id: 'char-2', name: 'Bryn', level: 5 });

        await expect(service.getMany('Character')).resolves.toEqual([
            { id: 'char-1', name: 'Aster', level: 3 },
            { id: 'char-2', name: 'Bryn', level: 5 },
        ]);

        await expect(service.getMany('Character', { level: 5 })).resolves.toEqual([
            { id: 'char-2', name: 'Bryn', level: 5 },
        ]);
    });

    it('rejects unknown fields and missing required fields as defined by the manifest', async () => {
        await expect(
            service.insert('Character', { id: 'char-1', nickname: 'Ash' })
        ).rejects.toThrow('Unknown field for Character: nickname');

        await expect(
            service.insert('Character', { id: 'char-1' })
        ).rejects.toThrow('Missing required field: name');
    });

    it('prevents primary key updates but allows non-key updates', async () => {
        await service.insert('Character', { id: 'char-1', name: 'Aster', level: 3 });

        await expect(
            service.update('Character', { id: 'char-1' }, { id: 'char-2' })
        ).rejects.toThrow('Primary key updates are not allowed: id');

        await expect(
            service.update('Character', { id: 'char-1' }, { level: 4 })
        ).resolves.toEqual({
            updated: 1,
            record: { id: 'char-1', name: 'Aster', level: 4 },
        });
    });

    it('persists composite-key history relations as defined by manifest', async () => {
        await service.insert('Character', { id: 'char-1', name: 'Aster' });
        await service.insert('Item', { id: 'item-1', name: 'Moonblade' });

        await service.insert('CharacterItem', {
            character_id: 'char-1',
            item_id: 'item-1',
            acquired_date: '200-01-01',
            short_description: 'Found in the ruins',
        });

        await service.insert('CharacterItem', {
            character_id: 'char-1',
            item_id: 'item-1',
            acquired_date: '200-02-01',
            short_description: 'Recovered after it was lost',
        });

        await expect(
            service.getMany('CharacterItem', {
                character_id: 'char-1',
                item_id: 'item-1',
            })
        ).resolves.toEqual([
            {
                character_id: 'char-1',
                item_id: 'item-1',
                acquired_date: '200-01-01',
                short_description: 'Found in the ruins',
            },
            {
                character_id: 'char-1',
                item_id: 'item-1',
                acquired_date: '200-02-01',
                short_description: 'Recovered after it was lost',
            },
        ]);

        await expect(
            service.getOne('CharacterItem', {
                character_id: 'char-1',
                item_id: 'item-1',
                acquired_date: '200-02-01',
            })
        ).resolves.toEqual({
            character_id: 'char-1',
            item_id: 'item-1',
            acquired_date: '200-02-01',
            short_description: 'Recovered after it was lost',
        });
    });

    it('handles auto-increment entities', async () => {
        const inserted = await service.insert('Alias', {
            entity_id: 'char-1',
            alias: 'The Lantern',
        });

        expect(inserted).toEqual({
            entity_id: 'char-1',
            alias: 'The Lantern',
        });

        await expect(service.getMany('Alias')).resolves.toEqual([
            {
                id: 1,
                entity_id: 'char-1',
                alias: 'The Lantern',
            },
        ]);
    });

    it('deletes from database', async () => {
        await service.insert('Character', { id: 'char-1', name: 'Aster' });

        await expect(service.remove('Character', { id: 'char-1' })).resolves.toEqual({
            deleted: 1,
        });

        await expect(service.getOne('Character', { id: 'char-1' })).resolves.toBeNull();
    });
});