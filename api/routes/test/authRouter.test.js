const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const request = require('supertest');

jest.mock('../../data/authRepository', () => ({
    findUserByPrincipal: jest.fn(),
    findSessionById: jest.fn(),
    findUserById: jest.fn(),
    createRefreshSession: jest.fn(),
    rotateRefreshSession: jest.fn(),
    revokeRefreshSession: jest.fn(),
    listAnchoredCharacterIdsByUserId: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
    compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
    sign: jest.fn(),
    decode: jest.fn(),
    verify: jest.fn(),
}));

const {
    findUserByPrincipal,
    findSessionById,
    findUserById,
    createRefreshSession,
    rotateRefreshSession,
    revokeRefreshSession,
    listAnchoredCharacterIdsByUserId,
} = require('../../data/authRepository');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authRouter = require('../authRouter');

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function createApp() {
    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/auth', authRouter);
    return app;
}

describe('authRouter', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        jwt.sign.mockImplementation((payload) => {
            if (payload && payload.type === 'refresh') {
                return 'refresh-token';
            }

            return 'access-token';
        });

        jwt.decode.mockReturnValue({
            exp: Math.floor(Date.now() / 1000) + 3600,
        });

        createRefreshSession.mockResolvedValue(undefined);
        rotateRefreshSession.mockResolvedValue(undefined);
        revokeRefreshSession.mockResolvedValue(undefined);
        listAnchoredCharacterIdsByUserId.mockResolvedValue([]);
    });

    it('POST /api/auth/token accepts principal that matches user id', async () => {
        const app = createApp();

        findUserByPrincipal.mockResolvedValueOnce({
            id: 'dm-admin',
            username: '333344444',
            password_hash: '$2a$12$examplehash',
            role: 'dm',
            disabled: 0,
        });
        bcrypt.compare.mockResolvedValueOnce(true);

        const response = await request(app)
            .post('/api/auth/token')
            .send({ username: 'dm-admin', password: 'change-me-dm-password' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            tokenType: 'Bearer',
            accessToken: 'access-token',
            expiresIn: '15m',
        });

        expect(findUserByPrincipal).toHaveBeenCalledWith('dm-admin');
        expect(bcrypt.compare).toHaveBeenCalledWith('change-me-dm-password', '$2a$12$examplehash');
        expect(createRefreshSession).toHaveBeenCalledTimes(1);
    });

    it('POST /api/auth/token returns 400 for missing credentials', async () => {
        const app = createApp();

        const response = await request(app)
            .post('/api/auth/token')
            .send({ username: 'dm-admin' });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'username and password are required' });
        expect(findUserByPrincipal).not.toHaveBeenCalled();
    });

    it('POST /api/auth/token returns 401 when principal is unknown', async () => {
        const app = createApp();

        findUserByPrincipal.mockResolvedValueOnce(null);

        const response = await request(app)
            .post('/api/auth/token')
            .send({ username: 'missing-user', password: 'test-password' });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ error: 'Invalid credentials' });
        expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('POST /api/auth/token returns 401 when password does not match', async () => {
        const app = createApp();

        findUserByPrincipal.mockResolvedValueOnce({
            id: 'dm-admin',
            username: 'dm-admin',
            password_hash: '$2a$12$examplehash',
            role: 'dm',
            disabled: 0,
        });
        bcrypt.compare.mockResolvedValueOnce(false);

        const response = await request(app)
            .post('/api/auth/token')
            .send({ username: 'dm-admin', password: 'wrong-password' });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ error: 'Invalid credentials' });
        expect(createRefreshSession).not.toHaveBeenCalled();
    });

    it('POST /api/auth/token returns 500 when repository throws', async () => {
        const app = createApp();

        findUserByPrincipal.mockRejectedValueOnce(new Error('db unavailable'));

        const response = await request(app)
            .post('/api/auth/token')
            .send({ username: 'dm-admin', password: 'password' });

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ error: 'Failed to issue token' });
    });

    it('POST /api/auth/refresh returns 401 when cookie is missing', async () => {
        const app = createApp();

        const response = await request(app).post('/api/auth/refresh');

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ error: 'Missing refresh token' });
    });

    it('POST /api/auth/refresh returns 401 for invalid refresh token', async () => {
        const app = createApp();

        jwt.verify.mockImplementationOnce(() => {
            throw new Error('invalid token');
        });

        const response = await request(app)
            .post('/api/auth/refresh')
            .set('Cookie', ['refresh_token=bad-refresh-token']);

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ error: 'Invalid refresh token' });
        expect(findSessionById).not.toHaveBeenCalled();
    });

    it('POST /api/auth/refresh rotates refresh session and returns new access token', async () => {
        const app = createApp();

        const oldSessionId = 'session-old';
        const oldRefreshToken = 'refresh-token-old';

        jwt.verify.mockImplementationOnce(() => ({
            type: 'refresh',
            sid: oldSessionId,
            sub: 'dm-admin',
        }));

        findSessionById.mockResolvedValueOnce({
            id: oldSessionId,
            user_id: 'dm-admin',
            refresh_hash: hashToken(oldRefreshToken),
            expires_at: new Date(Date.now() + 60_000).toISOString(),
            revoked_at: null,
            rotated_to: null,
        });

        findUserById.mockResolvedValueOnce({
            id: 'dm-admin',
            username: 'faerie',
            role: 'dm',
            disabled: 0,
        });

        const uuidSpy = jest.spyOn(crypto, 'randomUUID').mockReturnValueOnce('session-new');

        jwt.sign
            .mockReset()
            .mockImplementation((payload) => {
                if (payload && payload.type === 'refresh') {
                    return 'refresh-token-new';
                }

                return 'access-token-new';
            });

        const response = await request(app)
            .post('/api/auth/refresh')
            .set('Cookie', [`refresh_token=${oldRefreshToken}`]);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            tokenType: 'Bearer',
            accessToken: 'access-token-new',
            expiresIn: '15m',
        });

        expect(findSessionById).toHaveBeenCalledWith(oldSessionId);
        expect(rotateRefreshSession).toHaveBeenCalledWith(
            expect.objectContaining({
                oldSessionId,
                newSessionId: 'session-new',
            })
        );
        expect(createRefreshSession).toHaveBeenCalledWith(
            expect.objectContaining({
                sessionId: 'session-new',
                userId: 'dm-admin',
                refreshHash: hashToken('refresh-token-new'),
                rotatedFrom: oldSessionId,
            })
        );
        expect(response.headers['set-cookie']).toBeDefined();

        uuidSpy.mockRestore();
    });

    it('POST /api/auth/refresh returns 401 when refresh session hash does not match token', async () => {
        const app = createApp();

        jwt.verify.mockImplementationOnce(() => ({
            type: 'refresh',
            sid: 'session-old',
            sub: 'dm-admin',
        }));

        findSessionById.mockResolvedValueOnce({
            id: 'session-old',
            user_id: 'dm-admin',
            refresh_hash: hashToken('different-token'),
            expires_at: new Date(Date.now() + 60_000).toISOString(),
            revoked_at: null,
            rotated_to: null,
        });

        const response = await request(app)
            .post('/api/auth/refresh')
            .set('Cookie', ['refresh_token=refresh-token-old']);

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ error: 'Refresh session is not valid' });
        expect(findUserById).not.toHaveBeenCalled();
    });

    it('POST /api/auth/logout always clears cookie even if token is invalid', async () => {
        const app = createApp();

        jwt.verify.mockImplementationOnce(() => {
            throw new Error('invalid token');
        });

        const response = await request(app)
            .post('/api/auth/logout')
            .set('Cookie', ['refresh_token=bad-refresh-token']);

        expect(response.status).toBe(204);
        expect(revokeRefreshSession).not.toHaveBeenCalled();
        expect(response.headers['set-cookie']).toBeDefined();
    });

    it('POST /api/auth/logout revokes refresh session when cookie is valid', async () => {
        const app = createApp();

        jwt.verify.mockImplementationOnce(() => ({ sid: 'session-logout' }));

        const response = await request(app)
            .post('/api/auth/logout')
            .set('Cookie', ['refresh_token=refresh-token']);

        expect(response.status).toBe(204);
        expect(revokeRefreshSession).toHaveBeenCalledWith(
            expect.objectContaining({ sessionId: 'session-logout' })
        );
    });

    it('GET /api/auth/me returns 401 when bearer token is missing', async () => {
        const app = createApp();

        const response = await request(app).get('/api/auth/me');

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ error: 'Missing bearer token' });
        expect(findUserById).not.toHaveBeenCalled();
    });

    it('GET /api/auth/me returns 200 for a valid bearer token', async () => {
        const app = createApp();

        jwt.verify.mockImplementationOnce(() => ({
            sub: 'dm-admin',
            username: 'faerie',
            role: 'dm',
            sid: 'session-1',
        }));

        findUserById.mockResolvedValueOnce({
            id: 'dm-admin',
            username: 'faerie',
            role: 'dm',
            disabled: 0,
        });
        listAnchoredCharacterIdsByUserId.mockResolvedValueOnce(['char-anchored']);

        const response = await request(app)
            .get('/api/auth/me')
            .set('Authorization', 'Bearer access-token-good');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            id: 'dm-admin',
            username: 'faerie',
            role: 'dm',
            anchoredCharacterIds: ['char-anchored'],
        });
        expect(findUserById).toHaveBeenCalledWith('dm-admin');
        expect(listAnchoredCharacterIdsByUserId).toHaveBeenCalledWith('dm-admin');
    });

    it('GET /api/auth/me returns 401 when user is disabled', async () => {
        const app = createApp();

        jwt.verify.mockImplementationOnce(() => ({
            sub: 'dm-admin',
            username: 'faerie',
            role: 'dm',
            sid: 'session-1',
        }));

        findUserById.mockResolvedValueOnce({
            id: 'dm-admin',
            username: 'faerie',
            role: 'dm',
            disabled: 1,
        });

        const response = await request(app)
            .get('/api/auth/me')
            .set('Authorization', 'Bearer access-token-good');

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ error: 'Invalid user session' });
    });
});
