const path = require('path');

const DEVELOPMENT_ACCESS_SECRET = 'dev-access-secret-change-me';
const DEVELOPMENT_REFRESH_SECRET = 'dev-refresh-secret-change-me';
const MIN_PRODUCTION_SECRET_LENGTH = 32;
const VALID_SAME_SITE_VALUES = new Set(['strict', 'lax', 'none']);

function parseBoolean(value, defaultValue) {
    if (value === undefined) return defaultValue;
    if (value === 'true') return true;
    if (value === 'false') return false;
    throw new Error(`Expected a boolean value, received: ${value}`);
}

function parseCorsOrigins(value, nodeEnv) {
    const origins = (value || (nodeEnv === 'production' ? '' : 'http://localhost:5173'))
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

    if (nodeEnv === 'production' && origins.length === 0) {
        throw new Error('CORS_ORIGINS is required in production');
    }

    if (origins.includes('*')) {
        if (nodeEnv === 'production') {
            throw new Error('CORS_ORIGINS must not allow every origin in production');
        }

        return '*';
    }

    return origins;
}

function validateSecret(name, value, nodeEnv, developmentValue) {
    if (nodeEnv !== 'production') {
        return value || developmentValue;
    }

    if (!value) {
        throw new Error(`${name} is required in production`);
    }

    if (value === developmentValue || value.length < MIN_PRODUCTION_SECRET_LENGTH) {
        throw new Error(`${name} must be at least ${MIN_PRODUCTION_SECRET_LENGTH} characters and must not use a development secret`);
    }

    return value;
}

function loadConfig(environment = process.env) {
    const nodeEnv = environment.NODE_ENV || 'development';
    const cookieSameSite = (environment.COOKIE_SAMESITE || 'strict').toLowerCase();

    if (!VALID_SAME_SITE_VALUES.has(cookieSameSite)) {
        throw new Error(`COOKIE_SAMESITE must be one of: ${[...VALID_SAME_SITE_VALUES].join(', ')}`);
    }

    const config = {
        nodeEnv,
        port: environment.PORT || 3001,
        jwtAccessSecret: validateSecret(
            'JWT_ACCESS_SECRET',
            environment.JWT_ACCESS_SECRET,
            nodeEnv,
            DEVELOPMENT_ACCESS_SECRET
        ),
        jwtRefreshSecret: validateSecret(
            'JWT_REFRESH_SECRET',
            environment.JWT_REFRESH_SECRET,
            nodeEnv,
            DEVELOPMENT_REFRESH_SECRET
        ),
        accessTokenTtl: environment.ACCESS_TOKEN_TTL || '15m',
        refreshTokenTtl: environment.REFRESH_TOKEN_TTL || '30d',
        cookieSecure: parseBoolean(environment.COOKIE_SECURE, nodeEnv === 'production'),
        cookieSameSite,
        corsOrigins: parseCorsOrigins(environment.CORS_ORIGINS, nodeEnv),
        trustProxy: parseBoolean(environment.TRUST_PROXY, false),
        forceHttps: parseBoolean(environment.FORCE_HTTPS, false),
        dbPath: environment.DB_PATH
            ? path.resolve(environment.DB_PATH)
            : path.join(__dirname, 'campaign.db'),
        backupDir: environment.DB_BACKUP_DIR
            ? path.resolve(environment.DB_BACKUP_DIR)
            : path.join(__dirname, 'backups'),
        backupRetentionDays: Number(environment.BACKUP_RETENTION_DAYS || 30),
        dbBusyTimeoutMs: Number(environment.DB_BUSY_TIMEOUT_MS || 5000),
    };

    if (config.cookieSameSite === 'none' && !config.cookieSecure) {
        throw new Error('COOKIE_SAMESITE=none requires COOKIE_SECURE=true');
    }

    if (nodeEnv === 'production' && !config.cookieSecure) {
        throw new Error('COOKIE_SECURE=true is required in production');
    }

    if (!Number.isInteger(config.backupRetentionDays) || config.backupRetentionDays < 1) {
        throw new Error('BACKUP_RETENTION_DAYS must be a positive whole number');
    }

    if (!Number.isInteger(config.dbBusyTimeoutMs) || config.dbBusyTimeoutMs < 0) {
        throw new Error('DB_BUSY_TIMEOUT_MS must be a non-negative whole number');
    }

    return config;
}

const config = loadConfig();

module.exports = config;
module.exports.loadConfig = loadConfig;
module.exports.MIN_PRODUCTION_SECRET_LENGTH = MIN_PRODUCTION_SECRET_LENGTH;