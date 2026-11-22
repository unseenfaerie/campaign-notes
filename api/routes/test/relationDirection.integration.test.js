const express = require('express');
const request = require('supertest');

jest.mock('../../data/db', () => ({
    db: new (require('sqlite3').Database)(':memory:'),
}));
jest.mock('../../data/authRepository', () => ({
    listAnchoredCharacterIdsByUserId: jest.fn().mockResolvedValue(['hero']),
    findUserById: jest.fn(),
}));

const { db } = require('../../data/db');
const { manifestCrudService } = require('../../data/genericCrudService');
const { buildAllCreateTableSql } = require('../../data/schemaBuilder');
const { domainManifest } = require('../../../common/domainManifest');
const { runStatement } = require('../../utils/migrationService');
const proposalMigration = require('../../migrations/002-audit-and-proposals');
const domainRouter = require('../domainRouter');

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
    req.auth = { userId: 'user', username: 'user', role: req.get('x-role') || 'dm' };
    next();
});
app.use('/api', domainRouter);

beforeAll(async () => {
    for (const sql of buildAllCreateTableSql()) await runStatement(db, sql);
    await runStatement(db, 'CREATE TABLE users (id TEXT PRIMARY KEY)');
    await proposalMigration.up(db);
});

beforeEach(async () => {
    await runStatement(db, 'DELETE FROM edit_proposals');
    for (const relation of Object.values(domainManifest.relations)) {
        await runStatement(db, `DELETE FROM ${relation.table}`);
    }
    for (const entity of Object.values(domainManifest.entities)) {
        await runStatement(db, `DELETE FROM ${entity.table}`);
    }
    for (const id of ['hero', 'other', 'third']) {
        await manifestCrudService.insert('Character', {
            id, name: id, player_character: true, is_public: false,
            deceased: false, short_description: id, intelligence: 10,
        });
    }
    await manifestCrudService.insert('Place', {
        id: 'village', name: 'Village', type: 'town', is_public: false, short_description: 'A village',
    });
});

afterAll(async () => {
    await new Promise((resolve, reject) => db.close(error => error ? reject(error) : resolve()));
});

test('creates from both sides and filters relations by their own direction', async () => {
    const first = await request(app).post('/api/characters/hero/places').send({
        id: 'village', arrived_date: '0200200001_age-of-descent-default', short_description: 'Hero visited',
    });
    expect({ status: first.status, body: first.body }).toEqual(expect.objectContaining({ status: 201 }));
    expect(first.body.visibility_direction).toBe('first_to_second');

    const second = await request(app).post('/api/places/village/characters').send({
        id: 'other', arrived_date: '0200200001_age-of-descent-default', short_description: 'Other visited',
    });
    expect(second.status).toBe(201);
    expect(second.body.visibility_direction).toBe('second_to_first');

    const place = await request(app).get('/api/places/village/full').set('x-role', 'player');
    expect(place.status).toBe(200);
    expect(place.body.related.characters.map(record => record.id)).toEqual(['other']);
    expect((await request(app).get('/api/characters/other').set('x-role', 'player')).status).toBe(200);
    expect((await request(app).get('/api/places/village/characters/hero?arrived_date=0200200001_age-of-descent-default').set('x-role', 'player')).status).toBe(404);
    const preview = await request(app).get('/api/places/village/full').set('x-viewing-character', 'hero');
    expect(preview.body.related.characters.map(record => record.id)).toEqual(['other']);

    await manifestCrudService.update('Character', { id: 'hero' }, { intelligence: 3 });
    const limited = await request(app).get('/api/places/village/full').set('x-role', 'player');
    expect(limited.body.related.characters).toEqual([{ id: 'other', name: 'other', locked: true }]);
    await manifestCrudService.update('Character', { id: 'hero' }, { intelligence: 10 });

    const dmPlace = await request(app).get('/api/places/village/full');
    expect(dmPlace.body.related.characters.map(record => record.id).sort()).toEqual(['hero', 'other']);
    const change = await request(app).patch('/api/places/village/characters/hero?arrived_date=0200200001_age-of-descent-default')
        .send({ visibility_direction: 'both' });
    expect(change.status).toBe(200);
    const updated = await request(app).get('/api/places/village/full').set('x-role', 'player');
    expect(updated.body.related.characters.map(record => record.id).sort()).toEqual(['hero', 'other']);

    const invalid = await request(app).patch('/api/places/village/characters/hero?arrived_date=0200200001_age-of-descent-default')
        .send({ visibility_direction: 'sideways' });
    expect(invalid.status).toBe(400);
});

test('keeps opposite self-relation rows independently editable', async () => {
    for (const [source, target] of [['hero', 'third'], ['third', 'hero']]) {
        const response = await request(app).post(`/api/characters/${source}/characters`).send({
            id: target, established_date: '0200200001_age-of-descent-default', relationship_type: 'friend', short_description: source,
        });
        expect({ status: response.status, body: response.body }).toEqual(expect.objectContaining({ status: 201 }));
    }
    const detail = await request(app).get('/api/characters/hero/full');
    const third = detail.body.related.characters.find(record => record.id === 'third');
    expect(third.history.map(entry => entry.relationAnchorIndex).sort()).toEqual([0, 1]);
    const response = await request(app)
        .patch('/api/characters/hero/characters/third?established_date=0200200001_age-of-descent-default&anchorMemberIndex=1')
        .send({ visibility_direction: 'both' });
    expect(response.status).toBe(200);
    const first = await manifestCrudService.getOne('CharacterRelationship', {
        character_id: 'hero', related_id: 'third', established_date: '0200200001_age-of-descent-default',
    });
    const second = await manifestCrudService.getOne('CharacterRelationship', {
        character_id: 'third', related_id: 'hero', established_date: '0200200001_age-of-descent-default',
    });
    expect(first.visibility_direction).toBe('first_to_second');
    expect(second.visibility_direction).toBe('both');
});

test('does not expose relation details from a locked source or target', async () => {
    await manifestCrudService.insert('CharacterPlace', {
        character_id: 'hero', place_id: 'village', arrived_date: '0200200001_age-of-descent-default',
        short_description: 'Hero visited', visibility_direction: 'first_to_second',
    });
    await manifestCrudService.update('Character', { id: 'hero' }, { intelligence: 1 });
    const list = await request(app).get('/api/places/village/characters').set('x-role', 'player');
    expect(list.status).toBe(404);
    const specific = await request(app)
        .get('/api/characters/hero/places/village?arrived_date=0200200001_age-of-descent-default').set('x-role', 'player');
    expect(specific.status).toBe(404);
    const detail = await request(app).get('/api/characters/hero/full').set('x-role', 'player');
    expect(detail.body.related.places).toEqual([{ id: 'village', name: 'Village', locked: true }]);
});

test('creates and edits a simple relation from its second member', async () => {
    await manifestCrudService.insert('Event', {
        id: 'festival', name: 'Festival', is_public: false, short_description: 'A festival',
    });
    const created = await request(app).post('/api/places/village/events').send({ id: 'festival' });
    expect(created.status).toBe(201);
    expect(created.body.visibility_direction).toBe('second_to_first');
    const place = await request(app).get('/api/places/village/full');
    expect(place.body.related.events[0].relationship.visibility_direction).toBe('second_to_first');
    const updated = await request(app).patch('/api/places/village/events/festival')
        .send({ visibility_direction: 'both' });
    expect(updated.status).toBe(200);
    expect(updated.body.record.visibility_direction).toBe('both');
});

test('players cannot propose a direction change', async () => {
    await manifestCrudService.insert('CharacterPlace', {
        character_id: 'hero', place_id: 'village', arrived_date: '0200200001_age-of-descent-default',
        short_description: 'Hero visited', visibility_direction: 'first_to_second',
    });
    const response = await request(app)
        .post('/api/characters/hero/places/village/propose?arrived_date=0200200001_age-of-descent-default')
        .set('x-role', 'player')
        .send({ visibility_direction: 'both' });
    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/not player-proposable/);
});
