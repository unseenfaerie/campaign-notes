const express = require('express');
const request = require('supertest');

jest.mock('../../data/authRepository', () => ({
    findUserById: jest.fn(),
    getUserWithPasswordById: jest.fn(),
    listUsers: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    listCharacterAnchors: jest.fn(),
    listCharacterAnchorsByUserId: jest.fn(),
    upsertUserCharacterAnchor: jest.fn(),
    removeUserCharacterAnchor: jest.fn(),
    revokeAllRefreshSessionsByUserId: jest.fn(),
}));

jest.mock('../../data/genericCrudService', () => ({
    manifestCrudService: {
        getOne: jest.fn(),
    },
}));

jest.mock('bcryptjs', () => ({
    compare: jest.fn(),
    hash: jest.fn(),
}));

const bcrypt = require('bcryptjs');
const {
    findUserById,
    getUserWithPasswordById,
    listUsers,
    createUser,
    updateUser,
    deleteUser,
    listCharacterAnchors,
    listCharacterAnchorsByUserId,
    upsertUserCharacterAnchor,
    removeUserCharacterAnchor,
    revokeAllRefreshSessionsByUserId,
} = require('../../data/authRepository');
const { manifestCrudService } = require('../../data/genericCrudService');
const adminRouter = require('../adminRouter');

function createApp() {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
        req.auth = {
            userId: req.headers['x-test-user'] || 'dm-admin',
            role: req.headers['x-test-role'] || 'dm',
        };
        next();
    });
    app.use('/api/admin', adminRouter);
    return app;
}

describe('adminRouter', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        bcrypt.hash.mockResolvedValue('hashed-password');
    });

    it('GET /api/admin/users allows dm to list users', async () => {
        const app = createApp();

        listUsers.mockResolvedValueOnce([
            {
                id: 'dm-admin',
                username: 'faerie',
                role: 'dm',
                disabled: 0,
                created_at: '2026-01-01',
                updated_at: '2026-01-02',
            },
        ]);

        const response = await request(app)
            .get('/api/admin/users')
            .set('x-test-role', 'dm');

        expect(response.status).toBe(200);
        expect(response.body).toEqual([
            {
                id: 'dm-admin',
                username: 'faerie',
                role: 'dm',
                disabled: false,
                createdAt: '2026-01-01',
                updatedAt: '2026-01-02',
            },
        ]);
        expect(listUsers).toHaveBeenCalledTimes(1);
    });

    it('GET /api/admin/users denies non-dm users', async () => {
        const app = createApp();

        const response = await request(app)
            .get('/api/admin/users')
            .set('x-test-role', 'player');

        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: 'Forbidden' });
        expect(listUsers).not.toHaveBeenCalled();
    });

    it('POST /api/admin/users creates a user for dm', async () => {
        const app = createApp();

        createUser.mockResolvedValueOnce({
            id: 'new-player',
            username: 'new-player',
            role: 'player',
            disabled: 0,
            created_at: '2026-01-01',
            updated_at: '2026-01-01',
        });

        const response = await request(app)
            .post('/api/admin/users')
            .set('x-test-role', 'dm')
            .send({ id: 'new-player', username: 'new-player', password: 'strong-pass-1', role: 'player' });

        expect(response.status).toBe(201);
        expect(response.body).toEqual({
            id: 'new-player',
            username: 'new-player',
            role: 'player',
            disabled: false,
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
        });
        expect(bcrypt.hash).toHaveBeenCalledWith('strong-pass-1', 12);
        expect(createUser).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'new-player',
                username: 'new-player',
                passwordHash: 'hashed-password',
                role: 'player',
            })
        );
    });

    it('PATCH /api/admin/me/username lets authenticated user change own username', async () => {
        const app = createApp();

        findUserById
            .mockResolvedValueOnce({ id: 'player-1', username: 'old-name', role: 'player', disabled: 0 })
            .mockResolvedValueOnce({ id: 'player-1', username: 'new-name', role: 'player', disabled: 0 });

        const response = await request(app)
            .patch('/api/admin/me/username')
            .set('x-test-role', 'player')
            .set('x-test-user', 'player-1')
            .send({ username: 'new-name' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            id: 'player-1',
            username: 'new-name',
            role: 'player',
        });
        expect(updateUser).toHaveBeenCalledWith(
            'player-1',
            expect.objectContaining({ username: 'new-name' })
        );
    });

    it('PATCH /api/admin/me/password verifies current password and revokes refresh sessions', async () => {
        const app = createApp();

        getUserWithPasswordById.mockResolvedValueOnce({
            id: 'player-1',
            username: 'player-1',
            role: 'player',
            disabled: 0,
            password_hash: 'stored-hash',
        });
        bcrypt.compare.mockResolvedValueOnce(true);

        const response = await request(app)
            .patch('/api/admin/me/password')
            .set('x-test-role', 'player')
            .set('x-test-user', 'player-1')
            .send({
                currentPassword: 'old-password',
                newPassword: 'new-password-123',
            });

        expect(response.status).toBe(204);
        expect(bcrypt.compare).toHaveBeenCalledWith('old-password', 'stored-hash');
        expect(bcrypt.hash).toHaveBeenCalledWith('new-password-123', 12);
        expect(updateUser).toHaveBeenCalledWith(
            'player-1',
            expect.objectContaining({ passwordHash: 'hashed-password' })
        );
        expect(revokeAllRefreshSessionsByUserId).toHaveBeenCalledWith(
            expect.objectContaining({ userId: 'player-1' })
        );
    });

    it('PUT /api/admin/users/:userId/anchors/characters/:characterId anchors character to user', async () => {
        const app = createApp();

        findUserById.mockResolvedValueOnce({ id: 'player-1', username: 'player-1', role: 'player', disabled: 0 });
        manifestCrudService.getOne.mockResolvedValueOnce({ id: 'char-1', name: 'Hero' });
        listCharacterAnchorsByUserId.mockResolvedValueOnce([
            {
                character_id: 'char-1',
                user_id: 'player-1',
                created_at: '2026-01-03',
            },
        ]);

        const response = await request(app)
            .put('/api/admin/users/player-1/anchors/characters/char-1')
            .set('x-test-role', 'dm');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            character_id: 'char-1',
            user_id: 'player-1',
            created_at: '2026-01-03',
        });
        expect(upsertUserCharacterAnchor).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: 'player-1',
                characterId: 'char-1',
            })
        );
    });

    it('DELETE /api/admin/users/:userId deletes target user when requester is dm', async () => {
        const app = createApp();

        findUserById.mockResolvedValueOnce({ id: 'player-2', username: 'player-2', role: 'player', disabled: 0 });

        const response = await request(app)
            .delete('/api/admin/users/player-2')
            .set('x-test-role', 'dm')
            .set('x-test-user', 'dm-admin');

        expect(response.status).toBe(204);
        expect(deleteUser).toHaveBeenCalledWith('player-2');
    });

    it('POST /api/admin/users/:userId/revoke-sessions revokes all refresh sessions', async () => {
        const app = createApp();

        findUserById.mockResolvedValueOnce({ id: 'player-3', username: 'player-3', role: 'player', disabled: 0 });

        const response = await request(app)
            .post('/api/admin/users/player-3/revoke-sessions')
            .set('x-test-role', 'dm');

        expect(response.status).toBe(204);
        expect(revokeAllRefreshSessionsByUserId).toHaveBeenCalledWith(
            expect.objectContaining({ userId: 'player-3' })
        );
    });

    it('DELETE /api/admin/users/:userId/anchors/characters/:characterId removes anchor', async () => {
        const app = createApp();

        listCharacterAnchorsByUserId.mockResolvedValueOnce([
            {
                character_id: 'char-1',
                user_id: 'player-1',
                created_at: '2026-01-03',
            },
        ]);

        const response = await request(app)
            .delete('/api/admin/users/player-1/anchors/characters/char-1')
            .set('x-test-role', 'dm');

        expect(response.status).toBe(204);
        expect(removeUserCharacterAnchor).toHaveBeenCalledWith('char-1');
    });

    it('GET /api/admin/anchors/characters returns all anchors for dm', async () => {
        const app = createApp();

        listCharacterAnchors.mockResolvedValueOnce([
            { character_id: 'char-1', user_id: 'player-1', created_at: '2026-01-03' },
        ]);

        const response = await request(app)
            .get('/api/admin/anchors/characters')
            .set('x-test-role', 'dm');

        expect(response.status).toBe(200);
        expect(response.body).toEqual([
            { character_id: 'char-1', user_id: 'player-1', created_at: '2026-01-03' },
        ]);
    });
});
