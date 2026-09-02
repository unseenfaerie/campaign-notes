class RateLimiter {
    constructor({ windowMs, maxRequests }) {
        this.windowMs = windowMs;
        this.maxRequests = maxRequests;
        this.clients = new Map();
    }

    getClientKey(req) {
        return req.ip || req.socket.remoteAddress || 'unknown';
    }

    consume(key) {
        const now = Date.now();
        let entry = this.clients.get(key);

        if (!entry || entry.resetAt <= now) {
            entry = { count: 0, resetAt: now + this.windowMs };
            this.clients.set(key, entry);
        }

        entry.count += 1;
        return {
            limited: entry.count > this.maxRequests,
            remaining: Math.max(0, this.maxRequests - entry.count),
            resetAt: entry.resetAt,
        };
    }

    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.clients) {
            if (entry.resetAt <= now) this.clients.delete(key);
        }
    }
}

function createRateLimitMiddleware({ windowMs, maxRequests, keyPrefix = '' }) {
    const limiter = new RateLimiter({ windowMs, maxRequests });

    const middleware = (req, res, next) => {
        const result = limiter.consume(`${keyPrefix}:${limiter.getClientKey(req)}`);
        res.set('RateLimit-Limit', String(maxRequests));
        res.set('RateLimit-Remaining', String(result.remaining));
        res.set('RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));

        if (result.limited) {
            const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
            res.set('Retry-After', String(retryAfter));
            return res.status(429).json({ error: 'Too many requests', retryAfter });
        }

        return next();
    };

    middleware.limiter = limiter;
    return middleware;
}

module.exports = {
    RateLimiter,
    createRateLimitMiddleware,
};