const request = require('supertest');
const { app } = require('../../server');
const { initializeDatabase } = require('../../db');
const { manifestCrudService } = require('../../genericCrudService');

describe('domain router entity routes', () => {
    beforeAll(async () => {
        await initializeDatabase();

        try {
            await manifestCrudService.remove('CharacterItem', {
                character_id: 'test-domain-router-character',
                item_id: 'test-domain-router-item',
                acquired_date: 'jan-02-200',
            });
            await manifestCrudService.remove('CharacterItem', {
                character_id: 'test-domain-router-character',
                item_id: 'test-domain-router-item',
                acquired_date: 'jan-01-200',
            });
            await manifestCrudService.remove('Item', { id: 'test-domain-router-item' });
            await manifestCrudService.remove('Character', { id: 'test-domain-router-character' });
            await manifestCrudService.remove('Character', { id: 'test-domain-router-patch-character' });
            await manifestCrudService.remove('Deity', { id: 'test-domain-router-delete-deity' });
        } catch (err) {
            // Ignore cleanup errors when the record is absent.
        }

        await manifestCrudService.insert('Character', {
            id: 'test-domain-router-character',
            type: 'npc',
            name: 'Domain Router Test Character',
            deceased: 0,
            short_description: 'Used to validate nested domain entity routing.',
        });

        await manifestCrudService.insert('Item', {
            id: 'test-domain-router-item',
            name: 'Domain Router Test Item',
            short_description: 'Used to validate nested domain association routing.',
        });

        await manifestCrudService.insert('CharacterItem', {
            character_id: 'test-domain-router-character',
            item_id: 'test-domain-router-item',
            acquired_date: 'jan-01-200',
            relinquished_date: 'jan-05-200',
            short_description: 'First possession record.',
        });

        await manifestCrudService.insert('CharacterItem', {
            character_id: 'test-domain-router-character',
            item_id: 'test-domain-router-item',
            acquired_date: 'jan-02-200',
            relinquished_date: null,
            short_description: 'Second possession record.',
        });
    });

    it('returns an entity collection by manifest route', async () => {
        const response = await request(app).get('/api/characters');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: 'test-domain-router-character',
                    name: 'Domain Router Test Character',
                }),
            ])
        );
    });

    it('returns an associated collection without exposing the join-table name', async () => {
        const response = await request(app).get('/api/characters/test-domain-router-character/items');

        expect(response.status).toBe(200);
        expect(response.body).toEqual([
            expect.objectContaining({
                id: 'test-domain-router-item',
                name: 'Domain Router Test Item',
                history: [
                    expect.objectContaining({
                        acquired_date: 'jan-01-200',
                        relinquished_date: 'jan-05-200',
                        short_description: 'First possession record.',
                    }),
                    expect.objectContaining({
                        acquired_date: 'jan-02-200',
                        relinquished_date: null,
                        short_description: 'Second possession record.',
                    }),
                ],
            }),
        ]);
    });

    it('returns the same associated collection from the opposite side of the relation', async () => {
        const response = await request(app).get('/api/items/test-domain-router-item/characters');

        expect(response.status).toBe(200);
        expect(response.body).toEqual([
            expect.objectContaining({
                id: 'test-domain-router-character',
                name: 'Domain Router Test Character',
                history: [
                    expect.objectContaining({
                        acquired_date: 'jan-01-200',
                        relinquished_date: 'jan-05-200',
                        short_description: 'First possession record.',
                    }),
                    expect.objectContaining({
                        acquired_date: 'jan-02-200',
                        relinquished_date: null,
                        short_description: 'Second possession record.',
                    }),
                ],
            }),
        ]);
    });

    it('returns a single entity by manifest route and id', async () => {
        const response = await request(app).get('/api/characters/test-domain-router-character');

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            id: 'test-domain-router-character',
            name: 'Domain Router Test Character',
            type: 'npc',
        });
        expect(Array.isArray(response.body)).toBe(false);
    });

    it('patches a single entity by manifest route and id', async () => {
        await manifestCrudService.insert('Character', {
            id: 'test-domain-router-patch-character',
            type: 'npc',
            name: 'Patch Me',
            deceased: 0,
            short_description: 'Original short description.',
        });

        const response = await request(app)
            .patch('/api/characters/test-domain-router-patch-character')
            .send({
                name: 'Patched Name',
                short_description: 'Updated short description.',
            });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            updated: 1,
            record: expect.objectContaining({
                id: 'test-domain-router-patch-character',
                name: 'Patched Name',
                short_description: 'Updated short description.',
            }),
        });
    });

    it('deletes a single entity by manifest route and id', async () => {
        await manifestCrudService.insert('Deity', {
            id: 'test-domain-router-delete-deity',
            name: 'Delete Me',
            short_description: 'Temporary deity for delete tests.',
        });

        const response = await request(app).delete('/api/deities/test-domain-router-delete-deity');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ deleted: 1 });

        const fetchResponse = await request(app).get('/api/deities/test-domain-router-delete-deity');
        expect(fetchResponse.status).toBe(404);
        expect(fetchResponse.body).toEqual({ error: 'Record not found' });
    });

    it('returns 404 for an unknown entity route', async () => {
        const response = await request(app).get('/api/not-a-real-entity/some-id');

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ error: 'Unknown entity route: not-a-real-entity' });
    });

    it('returns 400 when the path id cannot be coerced to the entity id type', async () => {
        const response = await request(app).get('/api/aliases/not-a-number');

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Invalid number value: not-a-number' });
    });

    it('returns 404 when the entity route exists but the record does not', async () => {
        const response = await request(app).get('/api/characters/does-not-exist');

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ error: 'Record not found' });
    });

    it('returns 404 for an unknown related route under a valid entity route', async () => {
        const response = await request(app).get('/api/characters/test-domain-router-character/not-a-real-related-route');

        expect(response.status).toBe(404);
        expect(response.body).toEqual({
            error: 'Unknown related route for characters: not-a-real-related-route',
        });
    });
});