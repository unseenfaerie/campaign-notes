const express = require('express');
const request = require('supertest');

jest.mock('../../data/authRepository', () => ({
    findUserByPrincipal: jest.fn(),
    findSessionById: jest.fn(),
    findUserById: jest.fn(),
    createRefreshSession: jest.fn(),
    rotateRefreshSession: jest.fn(),
    revokeRefreshSession: jest.fn(),
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
    createRefreshSession,
} = require('../../data/authRepository');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authRouter = require('../authRouter');

function createApp() {
    const app = express();
    app.use(express.json());
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
});
