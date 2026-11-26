const sqlite3 = require('sqlite3');
const express = require('express');
const request = require('supertest');

jest.mock('../../data/db', () => ({ db: new (require('sqlite3').Database)(':memory:') }));

const { db } = require('../../data/db');
const { buildAllCreateTableSql } = require('../../data/schemaBuilder');
const proposalMigration = require('../../migrations/002-audit-and-proposals');
const containmentMigration = require('../../migrations/008-place-containment');
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
    await containmentMigration.up(db);
});

beforeEach(async () => {
    await run('DELETE FROM place_containment');
    await run('DELETE FROM places');
    await run('DELETE FROM character_places');
    await run('DELETE FROM user_character_anchors');
    await run('DELETE FROM characters');
    await run(`INSERT INTO places (id, name, type, is_public, short_description) VALUES
        ('root', 'Root', 'country', 1, 'root'),
        ('child', 'Child', 'city', 1, 'child'),
        ('other', 'Other', 'city', 1, 'other'),
        ('secret', 'Secret', 'city', 0, 'secret')`);
});

afterAll(() => new Promise((resolve, reject) => db.close((error) => error ? reject(error) : resolve())));

test('creates containment from either role and enforces the hierarchy', async () => {
    const created = await request(app).post('/api/places/root/places?anchorMemberIndex=1')
        .send({ id: 'child', visibility_direction: 'both' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ child_id: 'child', parent_id: 'root' });
    const reverse = await request(app).post('/api/places/root/places?anchorMemberIndex=1').send({ id: 'other' });
    expect(reverse.body).toMatchObject({ child_id: 'other', parent_id: 'root', visibility_direction: 'second_to_first' });
    expect((await request(app).post('/api/places/child/places').send({ id: 'other' })).status).toBe(409);
    expect((await request(app).post('/api/places/root/places').send({ id: 'child' })).status).toBe(400);
    expect((await request(app).post('/api/places/root/places').send({ id: 'root' })).status).toBe(400);
    expect((await request(app).post('/api/places/root/places').send({ id: 'missing' })).status).toBe(404);
    const parent = await request(app).get('/api/places/root/full');
    const child = await request(app).get('/api/places/child/full');
    expect(parent.body.related.places[0]).toMatchObject({ id: 'child', relationship: { relationAnchorIndex: 1 } });
    expect(child.body.related.places[0]).toMatchObject({ id: 'root', relationship: { relationAnchorIndex: 0 } });
    expect((await request(app).delete('/api/places/root/places/child?anchorMemberIndex=1')).status).toBe(200);
});

test('filters containment by direction and target visibility', async () => {
    await request(app).post('/api/places/child/places')
        .send({ id: 'root', visibility_direction: 'first_to_second' });
    await request(app).post('/api/places/secret/places')
        .send({ id: 'root', visibility_direction: 'both' });
    const child = await request(app).get('/api/places/child/full').set('x-role', 'player');
    const root = await request(app).get('/api/places/root/full').set('x-role', 'player');
    expect(child.body.related.places).toEqual([expect.objectContaining({ id: 'root' })]);
    expect(root.body.related.places).toEqual([]);
    expect(root.body).not.toHaveProperty('children');
});

test('containment participates in the visibility graph and identifies locked parents', async () => {
    await run(`INSERT INTO characters (id, name, player_character, is_public, deceased, intelligence, short_description)
        VALUES ('hero', 'Hero', 1, 0, 0, 3, 'Hero')`);
    await run(`INSERT INTO user_character_anchors VALUES ('hero', 'dm', 'now')`);
    await run(`INSERT INTO character_places (character_id, place_id, short_description, visibility_direction)
        VALUES ('hero', 'child', 'here', 'first_to_second')`);
    await request(app).post('/api/places/child/places')
        .send({ id: 'secret', visibility_direction: 'first_to_second' });
    const response = await request(app).get('/api/places/child/full').set('x-role', 'player');
    expect(response.status).toBe(200);
    expect(response.body.related.places).toEqual([{
        id: 'secret', name: 'Secret', locked: true, relationship: { relationAnchorIndex: 0 },
    }]);
});
