const request = require('supertest');
const express = require('express');

jest.mock('../../data/genericCrudService', () => ({
    manifestCrudService: {
        insert: jest.fn(),
        getMany: jest.fn(),
        getOne: jest.fn(),
        update: jest.fn(),
        remove: jest.fn(),
    },
}));

jest.mock('../../data/authRepository', () => ({
    listAnchoredCharacterIdsByUserId: jest.fn(),
}));

jest.mock('../../utils/manifestHelpers', () => ({
    coerceValueByType: jest.fn(),
    getEntityByRoute: jest.fn(),
    getRelationMembers: jest.fn(),
    getRelationByRoutes: jest.fn(),
    conformObjectToEntity: jest.fn(),
    omitKeys: jest.fn((record, keys) => {
        const normalized = { ...record };
        for (const key of keys) {
            delete normalized[key];
        }
        return normalized;
    }),
    dedupeRows: jest.fn((rows) => {
        const seen = new Set();
        const deduped = [];

        for (const row of rows) {
            const key = JSON.stringify(row);
            if (seen.has(key)) continue;
            seen.add(key);
            deduped.push(row);
        }

        return deduped;
    }),
    getRelationContext: jest.fn((members, anchorMemberIndex) => ({
        anchorMember: members[anchorMemberIndex],
        relatedMember: members[anchorMemberIndex === 0 ? 1 : 0],
    })),
    getRelationsForEntityRoute: jest.fn(),
    getRelatedIdForRow: jest.fn((row, members, sourceId, anchorMemberIndex) => {
        const anchorMember = members[anchorMemberIndex];
        const relatedMember = members[anchorMemberIndex === 0 ? 1 : 0];

        if (anchorMember.entity === relatedMember.entity) {
            const anchorMatches = row[anchorMember.key] === sourceId;
            const relatedMatches = row[relatedMember.key] === sourceId;

            if (anchorMatches && relatedMatches) {
                return sourceId;
            }

            if (anchorMatches) {
                return row[relatedMember.key];
            }

            if (relatedMatches) {
                return row[anchorMember.key];
            }

            return null;
        }

        return row[relatedMember.key];
    }),
}));

jest.mock('../../../common/domainManifest', () => ({
    domainManifest: {
        entities: {
            Character: {
                idField: 'id',
                route: 'characters',
                fields: { id: { type: 'string' } },
            },
            Item: {
                idField: 'id',
                route: 'items',
                fields: { id: { type: 'string' } },
            },
            Deity: {
                idField: 'id',
                route: 'deities',
                fields: { id: { type: 'string' } },
            },
            Place: {
                idField: 'id',
                route: 'places',
                fields: { id: { type: 'string' }, parent_id: { type: 'string' } },
            },
            Alias: {
                idField: 'id',
                route: 'aliases',
                fields: { id: { type: 'number' } },
            },
        },
        relations: {
            CharacterItem: {
                kind: 'history',
                members: [
                    { entity: 'Character', key: 'character_id', route: 'items' },
                    { entity: 'Item', key: 'item_id', route: 'characters' },
                ],
            },
            EventCharacter: {
                kind: 'relationship',
                members: [
                    { entity: 'Deity', key: 'deity_id', route: 'characters' },
                    { entity: 'Character', key: 'character_id', route: 'deities' },
                ],
            },
        },
    },
}));

const { manifestCrudService } = require('../../data/genericCrudService');
const { listAnchoredCharacterIdsByUserId } = require('../../data/authRepository');
const manifestHelpers = require('../../utils/manifestHelpers');
const router = require('../domainRouter');

function createTestApp() {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
        req.auth = {
            userId: req.headers['x-test-user'] || 'dm-admin',
            role: req.headers['x-test-role'] || 'dm',
        };
        next();
    });
    app.use('/api', router);
    return app;
}

const app = createTestApp();

function buildEntity(entityName, route, idType = 'string') {
    return {
        entityName,
        entityDef: {
            route,
            idField: 'id',
            fields: {
                id: { type: idType },
            },
        },
    };
}

beforeEach(() => {
    jest.resetAllMocks();
    listAnchoredCharacterIdsByUserId.mockResolvedValue([]);

    manifestHelpers.coerceValueByType.mockImplementation((type, value) => {
        if (type === 'number') {
            const n = Number(value);
            if (Number.isNaN(n)) {
                throw new Error(`Invalid number value: ${value}`);
            }
            return n;
        }
        return value;
    });

    manifestHelpers.getEntityByRoute.mockImplementation((entityRoute) => {
        if (entityRoute === 'characters') return buildEntity('Character', 'characters', 'string');
        if (entityRoute === 'items') return buildEntity('Item', 'items', 'string');
        if (entityRoute === 'deities') return buildEntity('Deity', 'deities', 'string');
        if (entityRoute === 'places') return buildEntity('Place', 'places', 'string');
        if (entityRoute === 'aliases') return buildEntity('Alias', 'aliases', 'number');
        throw new Error(`Unknown entity route: ${entityRoute}`);
    });

    manifestHelpers.getRelationMembers.mockImplementation((relationDef) => relationDef.members);

    manifestHelpers.getRelationByRoutes.mockImplementation((entityRoute, relatedRoute) => {
        throw new Error(`Unknown related route for ${entityRoute}: ${relatedRoute}`);
    });

    manifestHelpers.conformObjectToEntity.mockImplementation((obj) => obj);
    manifestHelpers.omitKeys.mockImplementation((record, keys) => {
        const normalized = { ...record };
        for (const key of keys) {
            delete normalized[key];
        }
        return normalized;
    });
    manifestHelpers.dedupeRows.mockImplementation((rows) => {
        const seen = new Set();
        const deduped = [];

        for (const row of rows) {
            const key = JSON.stringify(row);
            if (seen.has(key)) continue;
            seen.add(key);
            deduped.push(row);
        }

        return deduped;
    });
    manifestHelpers.getRelationContext.mockImplementation((members, anchorMemberIndex) => ({
        anchorMember: members[anchorMemberIndex],
        relatedMember: members[anchorMemberIndex === 0 ? 1 : 0],
    }));
    manifestHelpers.getRelationsForEntityRoute.mockImplementation((entityRoute, manifest) => {
        const relations = [];

        for (const [relationName, relationDef] of Object.entries(manifest.relations || {})) {
            const members = relationDef.members;

            for (let anchorMemberIndex = 0; anchorMemberIndex < members.length; anchorMemberIndex += 1) {
                const anchorMember = members[anchorMemberIndex];
                const anchorEntityDef = manifest.entities[anchorMember.entity];

                if (!anchorEntityDef || anchorEntityDef.route !== entityRoute) {
                    continue;
                }

                const relatedMember = members[anchorMemberIndex === 0 ? 1 : 0];
                const relatedEntityDef = manifest.entities[relatedMember.entity];

                relations.push({
                    relationName,
                    relationDef,
                    anchorMemberIndex,
                    relatedRoute: anchorMember.route,
                    relatedEntityName: relatedMember.entity,
                    relatedEntityRoute: relatedEntityDef.route,
                    relatedIdField: relatedEntityDef.idField,
                });

                break;
            }
        }

        return relations;
    });
    manifestHelpers.getRelatedIdForRow.mockImplementation((row, members, sourceId, anchorMemberIndex) => {
        const anchorMember = members[anchorMemberIndex];
        const relatedMember = members[anchorMemberIndex === 0 ? 1 : 0];

        if (anchorMember.entity === relatedMember.entity) {
            const anchorMatches = row[anchorMember.key] === sourceId;
            const relatedMatches = row[relatedMember.key] === sourceId;

            if (anchorMatches && relatedMatches) {
                return sourceId;
            }

            if (anchorMatches) {
                return row[relatedMember.key];
            }

            if (relatedMatches) {
                return row[anchorMember.key];
            }

            return null;
        }

        return row[relatedMember.key];
    });
});

describe('domainRouter isolated unit tests', () => {
    it('GET /:entityRoute returns collection for mapped entity route', async () => {
        manifestCrudService.getMany.mockResolvedValueOnce([{ id: 'c1', name: 'A' }]);

        const response = await request(app).get('/api/characters');

        expect(response.status).toBe(200);
        expect(response.body).toEqual([{ id: 'c1', name: 'A' }]);
        expect(manifestHelpers.getEntityByRoute).toHaveBeenCalledWith('characters');
        expect(manifestCrudService.getMany).toHaveBeenCalledWith('Character');
    });

    it('POST /:entityRoute returns 400 when primary id slug format is invalid', async () => {
        manifestHelpers.conformObjectToEntity.mockImplementationOnce(() => {
            throw new Error('Invalid slug id format for field id: Bad ID');
        });

        const response = await request(app)
            .post('/api/characters')
            .send({ id: 'Bad ID', name: 'Test' });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Invalid slug id format for field id: Bad ID' });
        expect(manifestCrudService.insert).not.toHaveBeenCalled();
    });

    it('POST /places rejects a parent that does not exist', async () => {
        manifestCrudService.getOne.mockResolvedValueOnce(null);

        const response = await request(app)
            .post('/api/places')
            .send({ id: 'new-place', name: 'New Place', parent_id: 'missing-place' });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Parent place does not exist: missing-place' });
        expect(manifestCrudService.insert).not.toHaveBeenCalled();
    });

    it('POST /places rejects a place as its own parent', async () => {
        const response = await request(app)
            .post('/api/places')
            .send({ id: 'place-1', name: 'Place', parent_id: 'place-1' });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'A place cannot be its own parent' });
        expect(manifestCrudService.getOne).not.toHaveBeenCalled();
        expect(manifestCrudService.insert).not.toHaveBeenCalled();
    });

    it('PATCH /places rejects a parent assignment that creates a cycle', async () => {
        manifestCrudService.getOne
            .mockResolvedValueOnce({ id: 'place-2', parent_id: 'place-3' })
            .mockResolvedValueOnce({ id: 'place-3', parent_id: 'place-1' })
            .mockResolvedValueOnce({ id: 'place-1', parent_id: null });

        const response = await request(app)
            .patch('/api/places/place-1')
            .send({ parent_id: 'place-2' });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Parent assignment would create a cycle' });
        expect(manifestCrudService.update).not.toHaveBeenCalled();
    });

    it('GET /:entityRoute/:id returns single record', async () => {
        manifestCrudService.getOne.mockResolvedValueOnce({ id: 'char-1', name: 'Hero' });

        const response = await request(app).get('/api/characters/char-1');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ id: 'char-1', name: 'Hero' });
        expect(manifestHelpers.coerceValueByType).toHaveBeenCalledWith('string', 'char-1');
        expect(manifestCrudService.getOne).toHaveBeenCalledWith('Character', { id: 'char-1' });
    });

    it('GET /:entityRoute/:id returns 404 when record is missing', async () => {
        manifestCrudService.getOne.mockResolvedValueOnce(null);

        const response = await request(app).get('/api/characters/not-found');

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ error: 'Record not found' });
    });

    it('GET /:entityRoute/:id returns 400 on invalid id coercion', async () => {
        const response = await request(app).get('/api/aliases/not-a-number');

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Invalid number value: not-a-number' });
    });

    it('GET /:entityRoute/:id/full returns entity plus all related groups for that route', async () => {
        manifestCrudService.getOne.mockImplementation(async (resourceName, where) => {
            if (resourceName === 'Character' && where.id === 'char-1') {
                return { id: 'char-1', name: 'Hero' };
            }
            if (resourceName === 'Item' && where.id === 'item-1') {
                return { id: 'item-1', name: 'Sword' };
            }
            if (resourceName === 'Deity' && where.id === 'deity-1') {
                return { id: 'deity-1', name: 'Sun God' };
            }
            return null;
        });

        manifestCrudService.getMany
            .mockResolvedValueOnce([
                {
                    character_id: 'char-1',
                    item_id: 'item-1',
                    acquired_date: 'jan-01-200',
                    relinquished_date: null,
                    short_description: 'Current possession',
                },
            ])
            .mockResolvedValueOnce([
                {
                    deity_id: 'deity-1',
                    character_id: 'char-1',
                    short_description: 'Favored by the dawn',
                },
            ]);

        const response = await request(app).get('/api/characters/char-1/full');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            entity: { id: 'char-1', name: 'Hero' },
            related: {
                items: [
                    {
                        id: 'item-1',
                        name: 'Sword',
                        history: [
                            {
                                acquired_date: 'jan-01-200',
                                relinquished_date: null,
                                short_description: 'Current possession',
                            },
                        ],
                    },
                ],
                deities: [
                    {
                        id: 'deity-1',
                        name: 'Sun God',
                        relationship: {
                            short_description: 'Favored by the dawn',
                        },
                    },
                ],
            },
        });
        expect(manifestCrudService.getMany).toHaveBeenNthCalledWith(1, 'CharacterItem', { character_id: 'char-1' });
        expect(manifestCrudService.getMany).toHaveBeenNthCalledWith(2, 'EventCharacter', { character_id: 'char-1' });
    });

    it('GET /:entityRoute/:id/full returns direct Place children from parent_id', async () => {
        manifestCrudService.getOne.mockResolvedValue({ id: 'place-1', name: 'Othlorin' });
        manifestCrudService.getMany.mockResolvedValue([
            { id: 'place-2', name: 'Wavethorn', parent_id: 'place-1' },
            { id: 'place-3', name: 'Itholis', parent_id: 'place-1' },
        ]);

        const response = await request(app).get('/api/places/place-1/full');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            entity: { id: 'place-1', name: 'Othlorin' },
            related: {},
            children: [
                { id: 'place-2', name: 'Wavethorn', parent_id: 'place-1' },
                { id: 'place-3', name: 'Itholis', parent_id: 'place-1' },
            ],
        });
        expect(manifestCrudService.getMany).toHaveBeenCalledWith('Place', { parent_id: 'place-1' });
    });

    it('GET /:entityRoute/:id/:relatedRoute returns 404 on unknown related route', async () => {
        const response = await request(app).get('/api/characters/char-1/not-real');

        expect(response.status).toBe(404);
        expect(response.body).toEqual({
            error: 'Unknown related route for characters: not-real',
        });
    });

    it('GET /:entityRoute/:id/:relatedRoute shapes history relations', async () => {
        manifestHelpers.getRelationByRoutes.mockReturnValueOnce({
            relationName: 'CharacterItem',
            relationDef: {
                kind: 'history',
                members: [
                    { entity: 'Character', key: 'character_id', route: 'items' },
                    { entity: 'Item', key: 'item_id', route: 'characters' },
                ],
            },
            anchorMemberIndex: 0,
        });

        manifestCrudService.getOne.mockImplementation(async (resourceName, where) => {
            if (resourceName === 'Character' && where.id === 'char-1') {
                return { id: 'char-1', name: 'Hero' };
            }
            if (resourceName === 'Item' && where.id === 'item-1') {
                return { id: 'item-1', name: 'Sword' };
            }
            return null;
        });

        manifestCrudService.getMany.mockResolvedValueOnce([
            {
                character_id: 'char-1',
                item_id: 'item-1',
                acquired_date: 'jan-01-200',
                relinquished_date: 'jan-05-200',
                short_description: 'First possession',
            },
            {
                character_id: 'char-1',
                item_id: 'item-1',
                acquired_date: 'jan-10-200',
                relinquished_date: null,
                short_description: 'Second possession',
            },
        ]);

        const response = await request(app).get('/api/characters/char-1/items');

        expect(response.status).toBe(200);
        expect(response.body).toEqual([
            {
                id: 'item-1',
                name: 'Sword',
                history: [
                    {
                        acquired_date: 'jan-01-200',
                        relinquished_date: 'jan-05-200',
                        short_description: 'First possession',
                    },
                    {
                        acquired_date: 'jan-10-200',
                        relinquished_date: null,
                        short_description: 'Second possession',
                    },
                ],
            },
        ]);
    });

    it('GET /:entityRoute/:id/:relatedRoute/:relatedId returns one relation record for non-history relation', async () => {
        manifestHelpers.getRelationByRoutes.mockReturnValueOnce({
            relationName: 'EventItem',
            relationDef: {
                kind: 'relationship',
                members: [
                    { entity: 'Character', key: 'character_id', route: 'items' },
                    { entity: 'Item', key: 'item_id', route: 'characters' },
                ],
            },
            anchorMemberIndex: 0,
            relatedMemberIndex: 1,
        });

        manifestCrudService.getOne.mockResolvedValueOnce({
            character_id: 'char-1',
            item_id: 'item-1',
            short_description: 'used in battle',
        });

        const response = await request(app).get('/api/characters/char-1/items/item-1');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            character_id: 'char-1',
            item_id: 'item-1',
            short_description: 'used in battle',
        });
        expect(manifestCrudService.getOne).toHaveBeenCalledWith('EventItem', {
            character_id: 'char-1',
            item_id: 'item-1',
        });
    });

    it('GET /:entityRoute/:id/:relatedRoute/:relatedId returns all tenures for history relation without history query', async () => {
        manifestHelpers.getRelationByRoutes.mockReturnValueOnce({
            relationName: 'CharacterItem',
            relationDef: {
                kind: 'history',
                historyKey: 'acquired_date',
                members: [
                    { entity: 'Character', key: 'character_id', route: 'items' },
                    { entity: 'Item', key: 'item_id', route: 'characters' },
                ],
                payload: {
                    acquired_date: { type: 'string', required: true },
                    short_description: { type: 'string' },
                },
            },
            anchorMemberIndex: 0,
            relatedMemberIndex: 1,
        });

        manifestCrudService.getMany.mockResolvedValueOnce([
            {
                character_id: 'char-1',
                item_id: 'item-1',
                acquired_date: '100-01-01',
            },
            {
                character_id: 'char-1',
                item_id: 'item-1',
                acquired_date: '101-01-01',
            },
        ]);

        const response = await request(app).get('/api/characters/char-1/items/item-1');

        expect(response.status).toBe(200);
        expect(response.body).toEqual([
            {
                character_id: 'char-1',
                item_id: 'item-1',
                acquired_date: '100-01-01',
            },
            {
                character_id: 'char-1',
                item_id: 'item-1',
                acquired_date: '101-01-01',
            },
        ]);
        expect(manifestCrudService.getMany).toHaveBeenCalledWith('CharacterItem', {
            character_id: 'char-1',
            item_id: 'item-1',
        });
    });

    it('GET /:entityRoute/:id/:relatedRoute/:relatedId returns one tenure when history query is provided', async () => {
        manifestHelpers.getRelationByRoutes.mockReturnValueOnce({
            relationName: 'CharacterItem',
            relationDef: {
                kind: 'history',
                historyKey: 'acquired_date',
                members: [
                    { entity: 'Character', key: 'character_id', route: 'items' },
                    { entity: 'Item', key: 'item_id', route: 'characters' },
                ],
                payload: {
                    acquired_date: { type: 'string', required: true },
                    short_description: { type: 'string' },
                },
            },
            anchorMemberIndex: 0,
            relatedMemberIndex: 1,
        });

        manifestCrudService.getOne.mockResolvedValueOnce({
            character_id: 'char-1',
            item_id: 'item-1',
            acquired_date: '100-01-01',
            short_description: 'first tenure',
        });

        const response = await request(app)
            .get('/api/characters/char-1/items/item-1')
            .query({ acquired_date: '100-01-01' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            character_id: 'char-1',
            item_id: 'item-1',
            acquired_date: '100-01-01',
            short_description: 'first tenure',
        });
        expect(manifestCrudService.getOne).toHaveBeenCalledWith('CharacterItem', {
            character_id: 'char-1',
            item_id: 'item-1',
            acquired_date: '100-01-01',
        });
    });

    it('GET /:entityRoute/:id/:relatedRoute/:relatedId with directional relations only queries forward direction', async () => {
        manifestHelpers.getRelationByRoutes.mockReturnValueOnce({
            relationName: 'CharacterRelationship',
            relationDef: {
                kind: 'history',
                historyKey: 'established_date',
                directional: true,
                members: [
                    { entity: 'Character', key: 'character_id', route: 'relationships' },
                    { entity: 'Character', key: 'related_id', route: 'relationships' },
                ],
                payload: {
                    established_date: { type: 'string', required: true },
                    relationship_type: { type: 'string', required: true },
                },
            },
            anchorMemberIndex: 0,
            relatedMemberIndex: 1,
        });

        manifestCrudService.getOne
            .mockResolvedValueOnce(null);

        const response = await request(app)
            .get('/api/characters/char-1/relationships/char-2')
            .query({ established_date: '100-01-01' });

        expect(response.status).toBe(404);
        // Verify only the forward query is made (not the reverse)
        expect(manifestCrudService.getOne).toHaveBeenCalledTimes(1);
        expect(manifestCrudService.getOne).toHaveBeenNthCalledWith(1, 'CharacterRelationship', {
            character_id: 'char-1',
            related_id: 'char-2',
            established_date: '100-01-01',
        });
    });

    it('GET /:entityRoute/:id/:relatedRoute/:relatedId supports self history relation records without history selector', async () => {
        manifestHelpers.getRelationByRoutes.mockReturnValueOnce({
            relationName: 'CharacterRelationship',
            relationDef: {
                kind: 'history',
                historyKey: 'established_date',
                directional: true,
                members: [
                    { entity: 'Character', key: 'character_id', route: 'relationships' },
                    { entity: 'Character', key: 'related_id', route: 'relationships' },
                ],
                payload: {
                    established_date: { type: 'string', required: true },
                    relationship_type: { type: 'string', required: true },
                },
            },
            anchorMemberIndex: 0,
            relatedMemberIndex: 1,
        });

        manifestCrudService.getMany
            .mockResolvedValueOnce([
                {
                    character_id: 'char-1',
                    related_id: 'char-2',
                    established_date: '100-01-01',
                    relationship_type: 'rival',
                },
            ]);

        const response = await request(app).get('/api/characters/char-1/relationships/char-2');

        expect(response.status).toBe(200);
        expect(response.body).toEqual([
            {
                character_id: 'char-1',
                related_id: 'char-2',
                established_date: '100-01-01',
                relationship_type: 'rival',
            },
        ]);
        expect(manifestCrudService.getMany).toHaveBeenCalledTimes(1);
        expect(manifestCrudService.getMany).toHaveBeenNthCalledWith(1, 'CharacterRelationship', {
            character_id: 'char-1',
            related_id: 'char-2',
        });
        expect(Object.prototype.hasOwnProperty.call(manifestCrudService.getMany.mock.calls[0][1], 'established_date')).toBe(false);
    });

    it('GET /:entityRoute/:id/:relatedRoute/:relatedId returns 400 on unexpected history query params', async () => {
        manifestHelpers.getRelationByRoutes.mockReturnValueOnce({
            relationName: 'CharacterItem',
            relationDef: {
                kind: 'history',
                historyKey: 'acquired_date',
                members: [
                    { entity: 'Character', key: 'character_id', route: 'items' },
                    { entity: 'Item', key: 'item_id', route: 'characters' },
                ],
                payload: {
                    acquired_date: { type: 'string', required: true },
                    short_description: { type: 'string' },
                },
            },
            anchorMemberIndex: 0,
            relatedMemberIndex: 1,
        });

        const response = await request(app)
            .get('/api/characters/char-1/items/item-1')
            .query({ nonsense: 'bad' });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Unknown query field for relation: nonsense' });
    });

    it('PATCH /:entityRoute/:id updates and returns service payload', async () => {
        manifestCrudService.update.mockResolvedValueOnce({
            updated: 1,
            record: { id: 'char-1', name: 'Updated Name' },
        });

        const response = await request(app)
            .patch('/api/characters/char-1')
            .send({ name: 'Updated Name' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            updated: 1,
            record: { id: 'char-1', name: 'Updated Name' },
        });
        expect(manifestHelpers.conformObjectToEntity).toHaveBeenCalledWith(
            { name: 'Updated Name' },
            expect.objectContaining({ idField: 'id' })
        );
        expect(manifestCrudService.update).toHaveBeenCalledWith(
            'Character',
            { id: 'char-1' },
            { name: 'Updated Name' }
        );
    });

    it('PATCH /:entityRoute/:id allows player updates to anchored character long_explanation', async () => {
        manifestHelpers.getEntityByRoute.mockImplementationOnce(() => ({
            entityName: 'Character',
            entityDef: {
                route: 'characters',
                idField: 'id',
                fields: {
                    id: { type: 'string' },
                    long_explanation: {
                        type: 'string',
                        access: {
                            playerPatch: {
                                ownership: {
                                    type: 'anchored-character',
                                },
                            },
                        },
                    },
                },
            },
        }));
        listAnchoredCharacterIdsByUserId.mockResolvedValueOnce(['char-1']);
        manifestCrudService.update.mockResolvedValueOnce({
            updated: 1,
            record: { id: 'char-1', long_explanation: 'player text' },
        });

        const response = await request(app)
            .patch('/api/characters/char-1')
            .set('x-test-role', 'player')
            .set('x-test-user', 'player-one')
            .send({ long_explanation: 'player text' });

        expect(response.status).toBe(200);
        expect(listAnchoredCharacterIdsByUserId).toHaveBeenCalledWith('player-one');
    });

    it('PATCH /:entityRoute/:id blocks player updates to dm-only fields', async () => {
        const response = await request(app)
            .patch('/api/characters/char-1')
            .set('x-test-role', 'player')
            .set('x-test-user', 'player-one')
            .send({ name: 'Nope' });

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: 'Field is dm-only: name' });
        expect(manifestCrudService.update).not.toHaveBeenCalled();
    });

    it('PATCH /:entityRoute/:id blocks player updates to unanchored character records', async () => {
        manifestHelpers.getEntityByRoute.mockImplementationOnce(() => ({
            entityName: 'Character',
            entityDef: {
                route: 'characters',
                idField: 'id',
                fields: {
                    id: { type: 'string' },
                    long_explanation: {
                        type: 'string',
                        access: {
                            playerPatch: {
                                ownership: {
                                    type: 'anchored-character',
                                },
                            },
                        },
                    },
                },
            },
        }));
        listAnchoredCharacterIdsByUserId.mockResolvedValueOnce(['char-2']);

        const response = await request(app)
            .patch('/api/characters/char-1')
            .set('x-test-role', 'player')
            .set('x-test-user', 'player-one')
            .send({ long_explanation: 'player text' });

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: 'Players may only patch anchored character records' });
        expect(manifestCrudService.update).not.toHaveBeenCalled();
    });

    it('PATCH /:entityRoute/:id returns 404 when update affects no record', async () => {
        manifestCrudService.update.mockResolvedValueOnce({ updated: 0, record: null });

        const response = await request(app)
            .patch('/api/characters/char-missing')
            .send({ name: 'Nope' });

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ error: 'Record not found' });
    });

    it('DELETE /:entityRoute/:id deletes and returns result', async () => {
        manifestCrudService.remove.mockResolvedValueOnce({ deleted: 1 });

        const response = await request(app).delete('/api/deities/deity-1');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ deleted: 1 });
        expect(manifestCrudService.remove).toHaveBeenCalledWith('Deity', { id: 'deity-1' });
    });

    it('DELETE /:entityRoute/:id returns 404 when no record is deleted', async () => {
        manifestCrudService.remove.mockResolvedValueOnce({ deleted: 0 });

        const response = await request(app).delete('/api/deities/missing');

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ error: 'Record not found' });
    });

    it('POST /:entityRoute maps SQLITE_CONSTRAINT to 409', async () => {
        const err = new Error('constraint failed');
        err.code = 'SQLITE_CONSTRAINT';
        manifestCrudService.insert.mockRejectedValueOnce(err);

        const response = await request(app)
            .post('/api/characters')
            .send({ id: 'char-1', name: 'A' });

        expect(response.status).toBe(409);
        expect(response.body).toEqual({ error: 'constraint failed' });
    });

    it('GET /:entityRoute maps unknown errors to 500', async () => {
        manifestCrudService.getMany.mockRejectedValueOnce(new Error('boom'));

        const response = await request(app).get('/api/characters');

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ error: 'boom' });
    });

    it('PATCH /:entityRoute/:id/:relatedRoute/:relatedId updates non-history relation metadata', async () => {
        manifestHelpers.getRelationByRoutes.mockReturnValueOnce({
            relationName: 'EventItem',
            relationDef: {
                kind: 'relationship',
                members: [
                    { entity: 'Character', key: 'character_id', route: 'items' },
                    { entity: 'Item', key: 'item_id', route: 'characters' },
                ],
                payload: {
                    short_description: { type: 'string', required: true },
                    long_explanation: {
                        type: 'string',
                        access: {
                            playerPatch: {
                                ownership: {
                                    type: 'anchored-character',
                                    relationMemberEntity: 'Character',
                                },
                            },
                        },
                    },
                },
            },
            anchorMemberIndex: 0,
        });

        manifestCrudService.getOne
            .mockResolvedValueOnce({ id: 'char-1' })
            .mockResolvedValueOnce({ id: 'item-1' });

        manifestCrudService.update.mockResolvedValueOnce({
            updated: 1,
            record: {
                character_id: 'char-1',
                item_id: 'item-1',
                short_description: 'updated context',
            },
        });

        const response = await request(app)
            .patch('/api/characters/char-1/items/item-1')
            .send({ short_description: 'updated context' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            updated: 1,
            record: {
                character_id: 'char-1',
                item_id: 'item-1',
                short_description: 'updated context',
            },
        });
        expect(manifestCrudService.update).toHaveBeenCalledWith(
            'EventItem',
            { character_id: 'char-1', item_id: 'item-1' },
            { short_description: 'updated context' }
        );
    });

    it('PATCH /:entityRoute/:id/:relatedRoute/:relatedId allows player updates for anchored character relation long_explanation', async () => {
        manifestHelpers.getRelationByRoutes.mockReturnValueOnce({
            relationName: 'EventItem',
            relationDef: {
                kind: 'relationship',
                members: [
                    { entity: 'Character', key: 'character_id', route: 'items' },
                    { entity: 'Item', key: 'item_id', route: 'characters' },
                ],
                payload: {
                    long_explanation: {
                        type: 'string',
                        access: {
                            playerPatch: {
                                ownership: {
                                    type: 'anchored-character',
                                    relationMemberEntity: 'Character',
                                },
                            },
                        },
                    },
                },
            },
            anchorMemberIndex: 0,
        });
        listAnchoredCharacterIdsByUserId.mockResolvedValueOnce(['char-1']);
        manifestCrudService.getOne
            .mockResolvedValueOnce({ id: 'char-1' })
            .mockResolvedValueOnce({ id: 'char-1' });
        manifestCrudService.update.mockResolvedValueOnce({
            updated: 1,
            record: { character_id: 'char-1', item_id: 'char-1', long_explanation: 'player text' },
        });

        const response = await request(app)
            .patch('/api/characters/char-1/items/char-1')
            .set('x-test-role', 'player')
            .set('x-test-user', 'player-one')
            .send({ long_explanation: 'player text' });

        expect(response.status).toBe(200);
        expect(listAnchoredCharacterIdsByUserId).toHaveBeenCalledWith('player-one');
    });

    it('PATCH /:entityRoute/:id/:relatedRoute/:relatedId blocks player updates when relation is not tied to anchored character', async () => {
        manifestHelpers.getRelationByRoutes.mockReturnValueOnce({
            relationName: 'EventItem',
            relationDef: {
                kind: 'relationship',
                members: [
                    { entity: 'Character', key: 'character_id', route: 'items' },
                    { entity: 'Item', key: 'item_id', route: 'characters' },
                ],
                payload: {
                    long_explanation: {
                        type: 'string',
                        access: {
                            playerPatch: {
                                ownership: {
                                    type: 'anchored-character',
                                    relationMemberEntity: 'Character',
                                },
                            },
                        },
                    },
                },
            },
            anchorMemberIndex: 0,
        });
        listAnchoredCharacterIdsByUserId.mockResolvedValueOnce(['char-9']);
        manifestCrudService.getOne
            .mockResolvedValueOnce({ id: 'char-1' })
            .mockResolvedValueOnce({ id: 'char-1' });

        const response = await request(app)
            .patch('/api/characters/char-1/items/char-1')
            .set('x-test-role', 'player')
            .set('x-test-user', 'player-one')
            .send({ long_explanation: 'player text' });

        expect(response.status).toBe(403);
        expect(response.body).toEqual({
            error: 'Players may only patch relation records tied to anchored characters',
        });
        expect(manifestCrudService.update).not.toHaveBeenCalled();
    });

    it('PATCH /:entityRoute/:id/:relatedRoute/:relatedId updates a specific history record by query selector', async () => {
        manifestHelpers.getRelationByRoutes.mockReturnValueOnce({
            relationName: 'CharacterItem',
            relationDef: {
                kind: 'history',
                historyKey: 'acquired_date',
                historyEndKey: 'relinquished_date',
                members: [
                    { entity: 'Character', key: 'character_id', route: 'items' },
                    { entity: 'Item', key: 'item_id', route: 'characters' },
                ],
                payload: {
                    acquired_date: { type: 'string', required: true },
                    relinquished_date: { type: 'string' },
                    short_description: { type: 'string', required: true },
                },
            },
            anchorMemberIndex: 0,
        });

        manifestCrudService.getOne
            .mockResolvedValueOnce({ id: 'char-1' })
            .mockResolvedValueOnce({ id: 'item-1' });

        manifestCrudService.update.mockResolvedValueOnce({
            updated: 1,
            record: {
                character_id: 'char-1',
                item_id: 'item-1',
                acquired_date: '0200100001_age-of-descent-default',
                relinquished_date: '0200100002_age-of-descent-default',
            },
        });

        const response = await request(app)
            .patch('/api/characters/char-1/items/item-1')
            .query({ acquired_date: '0200100001_age-of-descent-default' })
            .send({ relinquished_date: '0200100002_age-of-descent-default' });

        expect(response.status).toBe(200);
        expect(manifestCrudService.update).toHaveBeenCalledWith(
            'CharacterItem',
            {
                character_id: 'char-1',
                item_id: 'item-1',
                acquired_date: '0200100001_age-of-descent-default',
            },
            { relinquished_date: '0200100002_age-of-descent-default' }
        );
    });

    it('PATCH /:entityRoute/:id/:relatedRoute/:relatedId returns 400 when history end date is before selector start date', async () => {
        manifestHelpers.getRelationByRoutes.mockReturnValueOnce({
            relationName: 'CharacterItem',
            relationDef: {
                kind: 'history',
                historyKey: 'acquired_date',
                historyEndKey: 'relinquished_date',
                members: [
                    { entity: 'Character', key: 'character_id', route: 'items' },
                    { entity: 'Item', key: 'item_id', route: 'characters' },
                ],
                payload: {
                    acquired_date: { type: 'string', required: true },
                    relinquished_date: { type: 'string' },
                    short_description: { type: 'string', required: true },
                },
            },
            anchorMemberIndex: 0,
        });

        manifestCrudService.getOne
            .mockResolvedValueOnce({ id: 'char-1' })
            .mockResolvedValueOnce({ id: 'item-1' });

        const response = await request(app)
            .patch('/api/characters/char-1/items/item-1')
            .query({ acquired_date: '0200100010_age-of-descent-default' })
            .send({ relinquished_date: '0200100009_age-of-descent-default' });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'History end date must be after history start date' });
        expect(manifestCrudService.update).not.toHaveBeenCalled();
    });

    it('PATCH /:entityRoute/:id/:relatedRoute/:relatedId returns 400 when history selector is missing', async () => {
        manifestHelpers.getRelationByRoutes.mockReturnValueOnce({
            relationName: 'CharacterItem',
            relationDef: {
                kind: 'history',
                historyKey: 'acquired_date',
                members: [
                    { entity: 'Character', key: 'character_id', route: 'items' },
                    { entity: 'Item', key: 'item_id', route: 'characters' },
                ],
                payload: {
                    acquired_date: { type: 'string', required: true },
                    short_description: { type: 'string', required: true },
                },
            },
            anchorMemberIndex: 0,
        });

        manifestCrudService.getOne
            .mockResolvedValueOnce({ id: 'char-1' })
            .mockResolvedValueOnce({ id: 'item-1' });

        const response = await request(app)
            .patch('/api/characters/char-1/items/item-1')
            .send({ short_description: 'updated context' });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Missing required query field: acquired_date' });
    });

    it('PATCH /:entityRoute/:id/:relatedRoute/:relatedId returns 400 when body tries to update the history key', async () => {
        manifestHelpers.getRelationByRoutes.mockReturnValueOnce({
            relationName: 'CharacterItem',
            relationDef: {
                kind: 'history',
                historyKey: 'acquired_date',
                members: [
                    { entity: 'Character', key: 'character_id', route: 'items' },
                    { entity: 'Item', key: 'item_id', route: 'characters' },
                ],
                payload: {
                    acquired_date: { type: 'string', required: true },
                    short_description: { type: 'string', required: true },
                },
            },
            anchorMemberIndex: 0,
        });

        manifestCrudService.getOne
            .mockResolvedValueOnce({ id: 'char-1' })
            .mockResolvedValueOnce({ id: 'item-1' });

        const response = await request(app)
            .patch('/api/characters/char-1/items/item-1')
            .query({ acquired_date: '100-01-01' })
            .send({ acquired_date: '100-02-01' });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Cannot update primary key field: acquired_date' });
    });

    it('PATCH /:entityRoute/:id/:relatedRoute/:relatedId updates reverse-stored self history relation records', async () => {
        manifestHelpers.getRelationByRoutes.mockReturnValueOnce({
            relationName: 'CharacterRelationship',
            relationDef: {
                kind: 'history',
                historyKey: 'established_date',
                members: [
                    { entity: 'Character', key: 'character_id', route: 'relationships' },
                    { entity: 'Character', key: 'related_id', route: 'relationships' },
                ],
                payload: {
                    established_date: { type: 'string', required: true },
                    relationship_type: { type: 'string', required: true },
                    short_description: { type: 'string' },
                },
            },
            anchorMemberIndex: 0,
        });

        manifestCrudService.getOne
            .mockResolvedValueOnce({ id: 'char-1' })
            .mockResolvedValueOnce({ id: 'char-2' });

        manifestCrudService.update
            .mockResolvedValueOnce({ updated: 0, record: null })
            .mockResolvedValueOnce({
                updated: 1,
                record: {
                    character_id: 'char-2',
                    related_id: 'char-1',
                    established_date: '100-01-01',
                    relationship_type: 'ally',
                    short_description: 'Mutual trust',
                },
            });

        const response = await request(app)
            .patch('/api/characters/char-1/relationships/char-2')
            .query({ established_date: '100-01-01' })
            .send({ short_description: 'Mutual trust' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            updated: 1,
            record: {
                character_id: 'char-2',
                related_id: 'char-1',
                established_date: '100-01-01',
                relationship_type: 'ally',
                short_description: 'Mutual trust',
            },
        });
        expect(manifestCrudService.update).toHaveBeenNthCalledWith(1, 'CharacterRelationship', {
            character_id: 'char-1',
            related_id: 'char-2',
            established_date: '100-01-01',
        }, {
            short_description: 'Mutual trust',
        });
        expect(manifestCrudService.update).toHaveBeenNthCalledWith(2, 'CharacterRelationship', {
            related_id: 'char-1',
            character_id: 'char-2',
            established_date: '100-01-01',
        }, {
            short_description: 'Mutual trust',
        });
    });

    it('DELETE /:entityRoute/:id/:relatedRoute/:relatedId deletes non-history relation', async () => {
        manifestHelpers.getRelationByRoutes.mockReturnValueOnce({
            relationName: 'EventItem',
            relationDef: {
                kind: 'relationship',
                members: [
                    { entity: 'Character', key: 'character_id', route: 'items' },
                    { entity: 'Item', key: 'item_id', route: 'characters' },
                ],
                payload: {},
            },
            anchorMemberIndex: 0,
        });

        manifestCrudService.getOne
            .mockResolvedValueOnce({ id: 'char-1' })
            .mockResolvedValueOnce({ id: 'item-1' });
        manifestCrudService.remove.mockResolvedValueOnce({ deleted: 1 });

        const response = await request(app).delete('/api/characters/char-1/items/item-1');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ deleted: 1 });
        expect(manifestCrudService.remove).toHaveBeenCalledWith('EventItem', {
            character_id: 'char-1',
            item_id: 'item-1',
        });
    });

    it('DELETE /:entityRoute/:id/:relatedRoute/:relatedId deletes a specific history tenure when the selector is provided', async () => {
        manifestHelpers.getRelationByRoutes.mockReturnValueOnce({
            relationName: 'CharacterItem',
            relationDef: {
                kind: 'history',
                historyKey: 'acquired_date',
                members: [
                    { entity: 'Character', key: 'character_id', route: 'items' },
                    { entity: 'Item', key: 'item_id', route: 'characters' },
                ],
                payload: {
                    acquired_date: { type: 'string', required: true },
                    short_description: { type: 'string', required: true },
                },
            },
            anchorMemberIndex: 0,
        });

        manifestCrudService.getOne
            .mockResolvedValueOnce({ id: 'char-1' })
            .mockResolvedValueOnce({ id: 'item-1' });
        manifestCrudService.remove.mockResolvedValueOnce({ deleted: 1 });

        const response = await request(app)
            .delete('/api/characters/char-1/items/item-1')
            .query({ acquired_date: '100-01-01' });

        expect(response.status).toBe(200);
        expect(manifestCrudService.remove).toHaveBeenCalledWith('CharacterItem', {
            character_id: 'char-1',
            item_id: 'item-1',
            acquired_date: '100-01-01',
        });
    });

    it('DELETE /:entityRoute/:id/:relatedRoute/:relatedId returns 400 when history selector is missing', async () => {
        manifestHelpers.getRelationByRoutes.mockReturnValueOnce({
            relationName: 'CharacterItem',
            relationDef: {
                kind: 'history',
                historyKey: 'acquired_date',
                members: [
                    { entity: 'Character', key: 'character_id', route: 'items' },
                    { entity: 'Item', key: 'item_id', route: 'characters' },
                ],
                payload: {
                    acquired_date: { type: 'string', required: true },
                    short_description: { type: 'string', required: true },
                },
            },
            anchorMemberIndex: 0,
        });

        manifestCrudService.getOne
            .mockResolvedValueOnce({ id: 'char-1' })
            .mockResolvedValueOnce({ id: 'item-1' });

        const response = await request(app).delete('/api/characters/char-1/items/item-1');

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Missing required query field: acquired_date' });
    });

    it('DELETE /:entityRoute/:id/:relatedRoute/:relatedId deletes reverse-stored self history relation records', async () => {
        manifestHelpers.getRelationByRoutes.mockReturnValueOnce({
            relationName: 'CharacterRelationship',
            relationDef: {
                kind: 'history',
                historyKey: 'established_date',
                members: [
                    { entity: 'Character', key: 'character_id', route: 'relationships' },
                    { entity: 'Character', key: 'related_id', route: 'relationships' },
                ],
                payload: {
                    established_date: { type: 'string', required: true },
                    relationship_type: { type: 'string', required: true },
                },
            },
            anchorMemberIndex: 0,
        });

        manifestCrudService.getOne
            .mockResolvedValueOnce({ id: 'char-1' })
            .mockResolvedValueOnce({ id: 'char-2' });
        manifestCrudService.remove
            .mockResolvedValueOnce({ deleted: 0 })
            .mockResolvedValueOnce({ deleted: 1 });

        const response = await request(app)
            .delete('/api/characters/char-1/relationships/char-2')
            .query({ established_date: '100-01-01' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ deleted: 1 });
        expect(manifestCrudService.remove).toHaveBeenNthCalledWith(1, 'CharacterRelationship', {
            character_id: 'char-1',
            related_id: 'char-2',
            established_date: '100-01-01',
        });
        expect(manifestCrudService.remove).toHaveBeenNthCalledWith(2, 'CharacterRelationship', {
            related_id: 'char-1',
            character_id: 'char-2',
            established_date: '100-01-01',
        });
    });

    it('POST /:entityRoute/:id/:relatedRoute creates simple relation', async () => {
        manifestHelpers.getRelationByRoutes.mockReturnValueOnce({
            relationName: 'CharacterItem',
            relationDef: {
                kind: 'simple',
                members: [
                    { entity: 'Character', key: 'character_id', route: 'items' },
                    { entity: 'Item', key: 'item_id', route: 'characters' },
                ],
                payload: {},
            },
            anchorMemberIndex: 0,
        });

        manifestCrudService.getOne.mockImplementation(async (resourceName, where) => {
            if (resourceName === 'Character' && where.id === 'char-1') {
                return { id: 'char-1' };
            }

            if (resourceName === 'Item' && where.id === 'item-1') {
                return { id: 'item-1' };
            }

            return null;
        });

        manifestCrudService.insert.mockResolvedValueOnce({
            character_id: 'char-1',
            item_id: 'item-1',
        });

        const response = await request(app)
            .post('/api/characters/char-1/items')
            .send({ id: 'item-1' });

        expect(response.status).toBe(201);
        expect(response.body).toEqual({
            character_id: 'char-1',
            item_id: 'item-1',
        });
        expect(manifestCrudService.insert).toHaveBeenCalledWith('CharacterItem', {
            character_id: 'char-1',
            item_id: 'item-1',
        });
    });

    it('POST /:entityRoute/:id/:relatedRoute creates relation with payload metadata', async () => {
        manifestHelpers.getRelationByRoutes.mockReturnValueOnce({
            relationName: 'CharacterDeity',
            relationDef: {
                kind: 'history',
                historyKey: 'adopted_date',
                historyEndKey: 'dissolution_date',
                members: [
                    { entity: 'Character', key: 'character_id', route: 'deities' },
                    { entity: 'Deity', key: 'deity_id', route: 'characters' },
                ],
                payload: {
                    adopted_date: { type: 'string', required: true },
                    dissolution_date: { type: 'string' },
                    short_description: { type: 'string', required: true },
                },
            },
            anchorMemberIndex: 0,
        });

        manifestCrudService.getOne.mockImplementation(async (resourceName, where) => {
            if (resourceName === 'Character' && where.id === 'char-1') {
                return { id: 'char-1' };
            }

            if (resourceName === 'Deity' && where.id === 'deity-1') {
                return { id: 'deity-1' };
            }

            return null;
        });

        manifestCrudService.insert.mockResolvedValueOnce({
            character_id: 'char-1',
            deity_id: 'deity-1',
            adopted_date: '100-01-01',
            short_description: 'Chosen by prophecy',
        });

        const response = await request(app)
            .post('/api/characters/char-1/deities')
            .send({
                id: 'deity-1',
                adopted_date: '100-01-01',
                short_description: 'Chosen by prophecy',
            });

        expect(response.status).toBe(201);
        expect(manifestCrudService.insert).toHaveBeenCalledWith('CharacterDeity', {
            character_id: 'char-1',
            deity_id: 'deity-1',
            adopted_date: '100-01-01',
            short_description: 'Chosen by prophecy',
        });
    });

    it('POST /:entityRoute/:id/:relatedRoute returns 400 when history end date is not after start date', async () => {
        manifestHelpers.getRelationByRoutes.mockReturnValueOnce({
            relationName: 'CharacterItem',
            relationDef: {
                kind: 'history',
                historyKey: 'acquired_date',
                historyEndKey: 'relinquished_date',
                members: [
                    { entity: 'Character', key: 'character_id', route: 'items' },
                    { entity: 'Item', key: 'item_id', route: 'characters' },
                ],
                payload: {
                    acquired_date: { type: 'string', required: true },
                    relinquished_date: { type: 'string' },
                    short_description: { type: 'string', required: true },
                },
            },
            anchorMemberIndex: 0,
        });

        manifestCrudService.getOne
            .mockResolvedValueOnce({ id: 'char-1' })
            .mockResolvedValueOnce({ id: 'item-1' });

        const response = await request(app)
            .post('/api/characters/char-1/items')
            .send({
                id: 'item-1',
                acquired_date: '0200100010_age-of-descent-default',
                relinquished_date: '0200100010_age-of-descent-default',
                short_description: 'Nope',
            });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'History end date must be after history start date' });
        expect(manifestCrudService.insert).not.toHaveBeenCalled();
    });

    it('POST /:entityRoute/:id/:relatedRoute returns 400 when relatedId is missing', async () => {
        manifestHelpers.getRelationByRoutes.mockReturnValueOnce({
            relationName: 'CharacterItem',
            relationDef: {
                kind: 'simple',
                members: [
                    { entity: 'Character', key: 'character_id', route: 'items' },
                    { entity: 'Item', key: 'item_id', route: 'characters' },
                ],
                payload: {},
            },
            anchorMemberIndex: 0,
        });

        manifestCrudService.getOne.mockResolvedValueOnce({ id: 'char-1' });

        const response = await request(app)
            .post('/api/characters/char-1/items')
            .send({});

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Missing required field: id' });
    });

    it('POST /:entityRoute/:id/:relatedRoute returns 404 when source does not exist', async () => {
        manifestHelpers.getRelationByRoutes.mockReturnValueOnce({
            relationName: 'CharacterItem',
            relationDef: {
                kind: 'simple',
                members: [
                    { entity: 'Character', key: 'character_id', route: 'items' },
                    { entity: 'Item', key: 'item_id', route: 'characters' },
                ],
                payload: {},
            },
            anchorMemberIndex: 0,
        });

        manifestCrudService.getOne.mockResolvedValueOnce(null);

        const response = await request(app)
            .post('/api/characters/char-1/items')
            .send({ relatedId: 'item-1' });

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ error: 'Record not found' });
    });

    it('POST /:entityRoute/:id/:relatedRoute returns 404 when related record does not exist', async () => {
        manifestHelpers.getRelationByRoutes.mockReturnValueOnce({
            relationName: 'CharacterItem',
            relationDef: {
                kind: 'simple',
                members: [
                    { entity: 'Character', key: 'character_id', route: 'items' },
                    { entity: 'Item', key: 'item_id', route: 'characters' },
                ],
                payload: {},
            },
            anchorMemberIndex: 0,
        });

        manifestCrudService.getOne
            .mockResolvedValueOnce({ id: 'char-1' })
            .mockResolvedValueOnce(null);

        const response = await request(app)
            .post('/api/characters/char-1/items')
            .send({ id: 'item-1' });

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ error: 'Record not found' });
    });

    it('POST /:entityRoute/:id/:relatedRoute returns 400 for unknown relation payload field', async () => {
        manifestHelpers.getRelationByRoutes.mockReturnValueOnce({
            relationName: 'CharacterItem',
            relationDef: {
                kind: 'relationship',
                members: [
                    { entity: 'Character', key: 'character_id', route: 'items' },
                    { entity: 'Item', key: 'item_id', route: 'characters' },
                ],
                payload: {
                    short_description: { type: 'string', required: true },
                },
            },
            anchorMemberIndex: 0,
        });

        manifestCrudService.getOne
            .mockResolvedValueOnce({ id: 'char-1' })
            .mockResolvedValueOnce({ id: 'item-1' });

        const response = await request(app)
            .post('/api/characters/char-1/items')
            .send({
                id: 'item-1',
                unknown_field: 'not allowed',
            });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Unknown field for relation: unknown_field' });
    });
});