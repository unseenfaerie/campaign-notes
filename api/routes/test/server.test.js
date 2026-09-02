const request = require('supertest');

const productionSecrets = {
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
};

describe('server security configuration', () => {
    let app;
    let shutdownServer;

    beforeAll(() => {
        process.env.NODE_ENV = 'production';
        process.env.CORS_ORIGINS = 'https://wiki.example.test';
        process.env.TRUST_PROXY = 'true';
        process.env.FORCE_HTTPS = 'true';
        process.env.COOKIE_SECURE = 'true';
        Object.assign(process.env, productionSecrets);

        jest.resetModules();
        ({ app, shutdownServer } = require('../../server'));
    });

    afterAll(() => {
        delete process.env.CORS_ORIGINS;
        delete process.env.TRUST_PROXY;
        delete process.env.FORCE_HTTPS;
        delete process.env.COOKIE_SECURE;
        delete process.env.JWT_ACCESS_SECRET;
        delete process.env.JWT_REFRESH_SECRET;
        process.env.NODE_ENV = 'test';
    });

    it('allows the configured wiki origin and credentials', async () => {
        const response = await request(app)
            .get('/health')
            .set('Origin', 'https://wiki.example.test')
            .set('X-Forwarded-Proto', 'https');

        expect(response.status).toBe(200);
        expect(response.headers['access-control-allow-origin']).toBe('https://wiki.example.test');
        expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('does not authorize an unconfigured origin', async () => {
        const response = await request(app)
            .get('/health')
            .set('Origin', 'https://untrusted.example.test')
            .set('X-Forwarded-Proto', 'https');

        expect(response.status).toBe(200);
        expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('redirects forwarded HTTP requests to HTTPS when enabled', async () => {
        const response = await request(app)
            .get('/health')
            .set('Host', 'api.example.test')
            .set('X-Forwarded-Proto', 'http');

        expect(response.status).toBe(301);
        expect(response.headers.location).toBe('https://api.example.test/health');
    });

    it('sets security headers and rejects oversized JSON bodies', async () => {
        const healthResponse = await request(app)
            .get('/health')
            .set('X-Forwarded-Proto', 'https');
        expect(healthResponse.headers['x-content-type-options']).toBe('nosniff');
        expect(healthResponse.headers['strict-transport-security']).toContain('max-age=');

        const response = await request(app)
            .post('/api/auth/token')
            .set('X-Forwarded-Proto', 'https')
            .send({ username: 'user', password: 'x'.repeat(1_100_000) });

        expect(response.status).toBe(413);
        expect(response.body).toEqual({ error: 'Request body is too large' });
    });

    it('closes HTTP connections before the database', async () => {
        const calls = [];
        const fakeServer = {
            close(callback) {
                calls.push('http');
                callback(null);
            },
        };

        await shutdownServer(fakeServer, {
            closeDatabaseFn: async () => calls.push('database'),
        });

        expect(calls).toEqual(['http', 'database']);
    });
});