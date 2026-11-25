const express = require('express');
const request = require('supertest');

jest.mock('../../data/db', () => ({ db: new (require('sqlite3').Database)(':memory:') }));

const { db } = require('../../data/db');
const { buildAllCreateTableSql } = require('../../data/schemaBuilder');
const proposalMigration = require('../../migrations/002-audit-and-proposals');
const sequenceMigration = require('../../migrations/009-event-sequence');
const router = require('../domainRouter');

function run(sql, params = []) {
    return new Promise((resolve, reject) => db.run(sql, params, (error) => error ? reject(error) : resolve()));
}

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
    req.auth = { role: req.get('x-role') || 'dm', username: 'dm', userId: 'dm' };
    next();
});
app.use('/api', router);

beforeAll(async () => {
    for (const sql of buildAllCreateTableSql()) await run(sql);
    await run('CREATE TABLE user_character_anchors (character_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at TEXT NOT NULL)');
    await proposalMigration.up(db);
    await sequenceMigration.up(db);
});

beforeEach(async () => {
    await run('DELETE FROM event_sequence');
    await run('DELETE FROM event_characters');
    await run('DELETE FROM events');
    await run('DELETE FROM user_character_anchors');
    await run('DELETE FROM characters');
    await run(`INSERT INTO events (id, name, is_public, short_description) VALUES
        ('a', 'A', 1, 'a'), ('b', 'B', 1, 'b'), ('c', 'C', 1, 'c'),
        ('d', 'D', 1, 'd'), ('secret', 'Secret', 0, 'secret')`);
});

afterAll(() => new Promise((resolve, reject) => db.close((error) => error ? reject(error) : resolve())));

test('allows branching sequences from either endpoint but rejects duplicates and cycles', async () => {
    const first = await request(app).post('/api/events/b/events?anchorMemberIndex=1')
        .send({ id: 'a', visibility_direction: 'both' });
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({ earlier_id: 'a', later_id: 'b' });
    for (const [earlier, later] of [['a', 'c'], ['d', 'b'], ['b', 'c']]) {
        expect((await request(app).post(`/api/events/${earlier}/events`).send({ id: later, visibility_direction: 'both' })).status).toBe(201);
    }
    expect((await request(app).post('/api/events/a/events').send({ id: 'b' })).status).toBe(409);
    expect((await request(app).post('/api/events/c/events').send({ id: 'a' })).status).toBe(400);
    expect((await request(app).post('/api/events/a/events').send({ id: 'a' })).status).toBe(400);
    expect((await request(app).post('/api/events/a/events').send({ id: 'missing' })).status).toBe(404);
    expect((await request(app).patch('/api/events/a').send({ next_event_id: 'b' })).status).toBe(400);

    const a = await request(app).get('/api/events/a/full');
    const b = await request(app).get('/api/events/b/full');
    expect(a.body.related.events).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: 'b', relationship: expect.objectContaining({ relationAnchorIndex: 0 }) }),
        expect.objectContaining({ id: 'c', relationship: expect.objectContaining({ relationAnchorIndex: 0 }) }),
    ]));
    expect(b.body.related.events).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: 'a', relationship: expect.objectContaining({ relationAnchorIndex: 1 }) }),
        expect.objectContaining({ id: 'd', relationship: expect.objectContaining({ relationAnchorIndex: 1 }) }),
        expect.objectContaining({ id: 'c', relationship: expect.objectContaining({ relationAnchorIndex: 0 }) }),
    ]));
    expect((await request(app).delete('/api/events/b/events/a?anchorMemberIndex=1')).status).toBe(200);
    expect((await request(app).delete('/api/events/c')).status).toBe(200);
    const afterDelete = await request(app).get('/api/events/a/full');
    expect(afterDelete.body.related.events).toEqual([]);
});

test('filters sequence links by visibility direction and target visibility', async () => {
    expect((await request(app).post('/api/events/a/events')
        .send({ id: 'b', visibility_direction: 'first_to_second' })).status).toBe(201);
    expect((await request(app).post('/api/events/secret/events')
        .send({ id: 'a', visibility_direction: 'both' })).status).toBe(201);
    const a = await request(app).get('/api/events/a/full').set('x-role', 'player');
    const b = await request(app).get('/api/events/b/full').set('x-role', 'player');
    expect(a.status).toBe(200);
    expect(a.body.related.events).toEqual([expect.objectContaining({ id: 'b' })]);
    expect(b.body.related.events).toEqual([]);
});

test('sequence links participate in the graph and retain roles for locked targets', async () => {
    await run(`INSERT INTO characters (id, name, player_character, is_public, deceased, intelligence, short_description)
        VALUES ('hero', 'Hero', 1, 0, 0, 3, 'Hero')`);
    await run(`INSERT INTO user_character_anchors VALUES ('hero', 'dm', 'now')`);
    await run(`INSERT INTO event_characters (character_id, event_id, short_description, visibility_direction)
        VALUES ('hero', 'a', 'there', 'first_to_second')`);
    expect((await request(app).post('/api/events/a/events')
        .send({ id: 'secret', visibility_direction: 'first_to_second' })).status).toBe(201);
    const response = await request(app).get('/api/events/a/full').set('x-role', 'player');
    expect(response.status).toBe(200);
    expect(response.body.related.events).toEqual([{
        id: 'secret', name: 'Secret', locked: true, relationship: { relationAnchorIndex: 0 },
    }]);
});
