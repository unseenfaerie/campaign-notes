const { loadConfig, MIN_PRODUCTION_SECRET_LENGTH } = require('../../config');

function strongSecrets() {
    return {
        JWT_ACCESS_SECRET: 'a'.repeat(MIN_PRODUCTION_SECRET_LENGTH),
        JWT_REFRESH_SECRET: 'b'.repeat(MIN_PRODUCTION_SECRET_LENGTH),
    };
}

describe('config', () => {
    it('uses safe local defaults during development', () => {
        const config = loadConfig({ NODE_ENV: 'development' });

        expect(config.jwtAccessSecret).toBe('dev-access-secret-change-me');
        expect(config.jwtRefreshSecret).toBe('dev-refresh-secret-change-me');
        expect(config.corsOrigins).toEqual(['http://localhost:5173']);
        expect(config.cookieSecure).toBe(false);
    });

    it('requires strong, non-development secrets in production', () => {
        expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(
            /JWT_ACCESS_SECRET is required in production/
        );

        expect(() => loadConfig({
            NODE_ENV: 'production',
            JWT_ACCESS_SECRET: 'too-short',
            JWT_REFRESH_SECRET: 'b'.repeat(MIN_PRODUCTION_SECRET_LENGTH),
            CORS_ORIGINS: 'https://wiki.example.test',
        })).toThrow(/JWT_ACCESS_SECRET must be at least/);
    });

    it('requires an explicit production CORS origin', () => {
        expect(() => loadConfig({
            NODE_ENV: 'production',
            ...strongSecrets(),
        })).toThrow(/CORS_ORIGINS is required in production/);

        expect(() => loadConfig({
            NODE_ENV: 'production',
            ...strongSecrets(),
            CORS_ORIGINS: '*',
        })).toThrow(/must not allow every origin/);
    });

    it('derives secure cookies in production and accepts proxy settings', () => {
        const config = loadConfig({
            NODE_ENV: 'production',
            ...strongSecrets(),
            CORS_ORIGINS: 'https://wiki.example.test',
            TRUST_PROXY: 'true',
            FORCE_HTTPS: 'true',
        });

        expect(config.cookieSecure).toBe(true);
        expect(config.trustProxy).toBe(true);
        expect(config.forceHttps).toBe(true);
    });

    it('rejects insecure cookies in production', () => {
        expect(() => loadConfig({
            NODE_ENV: 'production',
            ...strongSecrets(),
            CORS_ORIGINS: 'https://wiki.example.test',
            COOKIE_SECURE: 'false',
        })).toThrow(/COOKIE_SECURE=true is required in production/);
    });
});