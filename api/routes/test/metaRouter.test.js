const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const { requireAuth } = require('../../middleware/authMiddleware');
const router = require('../metaRouter');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me';

function createTestApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/meta', requireAuth, router);
    return app;
}

const app = createTestApp();

function bearerToken(role = 'dm') {
    const token = jwt.sign({ role, username: 'tester' }, ACCESS_SECRET, {
        subject: 'test-user',
        expiresIn: '5m',
    });
    return `Bearer ${token}`;
}

describe('metaRouter', () => {
    it('returns 401 without a bearer token', async () => {
        const res = await request(app).get('/api/meta');
        expect(res.status).toBe(401);
    });

    it('returns entity form schemas for any authenticated role', async () => {
        const res = await request(app)
            .get('/api/meta')
            .set('Authorization', bearerToken('player'));

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.entities)).toBe(true);
        expect(res.body.entities.length).toBeGreaterThan(0);
    });

    it('projects field metadata in definition order', async () => {
        const res = await request(app)
            .get('/api/meta')
            .set('Authorization', bearerToken());

        expect(res.status).toBe(200);

        const character = res.body.entities.find((entity) => entity.route === 'characters');
        expect(character).toBeDefined();
        expect(character.name).toBe('Character');
        expect(character.idField).toBe('id');

        const fieldNames = character.fields.map((field) => field.name);
        expect(fieldNames.slice(0, 3)).toEqual(['id', 'player_character', 'name']);

        const idField = character.fields.find((field) => field.name === 'id');
        expect(idField).toMatchObject({
            type: 'string',
            required: true,
            primary: true,
            format: 'slug',
        });

        const ageField = character.fields.find((field) => field.name === 'age');
        expect(ageField).toMatchObject({
            type: 'number',
            required: false,
            primary: false,
        });
    });

    it('marks autoIncrement primary keys so forms can skip them', async () => {
        const res = await request(app)
            .get('/api/meta')
            .set('Authorization', bearerToken());

        expect(res.status).toBe(200);

        const alias = res.body.entities.find((entity) => entity.route === 'aliases');
        expect(alias).toBeDefined();

        const idField = alias.fields.find((field) => field.name === 'id');
        expect(idField).toMatchObject({
            type: 'number',
            required: true,
            primary: true,
            autoIncrement: true,
        });
    });

    it('exposes boolean fields so forms can render a checkbox control', async () => {
        const res = await request(app)
            .get('/api/meta')
            .set('Authorization', bearerToken());

        expect(res.status).toBe(200);

        const character = res.body.entities.find((entity) => entity.route === 'characters');
        const deceasedField = character.fields.find((field) => field.name === 'deceased');
        expect(deceasedField).toMatchObject({
            type: 'boolean',
            required: true,
            primary: false,
        });

        const ageField = character.fields.find((field) => field.name === 'age');
        expect(ageField.type).toBe('number');
    });

    it('exposes relation form schemas keyed by entity route', async () => {
        const res = await request(app)
            .get('/api/meta')
            .set('Authorization', bearerToken());

        expect(res.status).toBe(200);
        expect(res.body.relationsByEntityRoute).toBeDefined();

        const characterRelations = res.body.relationsByEntityRoute.characters;
        expect(Array.isArray(characterRelations)).toBe(true);

        const itemsRelation = characterRelations.find((relation) => relation.relatedRoute === 'items');
        expect(itemsRelation).toMatchObject({
            relationName: 'CharacterItem',
            kind: 'history',
            relatedEntityRoute: 'items',
        });

        const fieldNames = itemsRelation.fields.map((field) => field.name);
        expect(fieldNames).toEqual(
            expect.arrayContaining(['acquired_date', 'relinquished_date', 'short_description'])
        );

        const selfRelation = characterRelations.find((relation) => relation.relatedRoute === 'relationships');
        expect(selfRelation).toMatchObject({
            relationName: 'CharacterRelationship',
            kind: 'history',
            relatedEntityRoute: 'characters',
        });
    });
});
