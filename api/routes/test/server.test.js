const request = require('supertest');

const productionSecrets = {
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
};

describe('server security configuration', () => {
    let app;

    beforeAll(() => {
        process.env.NODE_ENV = 'production';
        process.env.CORS_ORIGINS = 'https://wiki.example.test';
        process.env.TRUST_PROXY = 'true';
        process.env.FORCE_HTTPS = 'true';
        Object.assign(process.env, productionSecrets);

        jest.resetModules();
        ({ app } = require('../../server'));
    });

    afterAll(() => {
        delete process.env.CORS_ORIGINS;
        delete process.env.TRUST_PROXY;
        delete process.env.FORCE_HTTPS;
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
});