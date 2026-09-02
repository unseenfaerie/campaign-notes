const express = require('express');
const request = require('supertest');
const { RateLimiter, createRateLimitMiddleware } = require('../rateLimitMiddleware');

describe('RateLimiter', () => {
    it('limits a client after its configured request count', () => {
        const limiter = new RateLimiter({ windowMs: 1000, maxRequests: 2 });

        expect(limiter.consume('client').limited).toBe(false);
        expect(limiter.consume('client').limited).toBe(false);
        expect(limiter.consume('client').limited).toBe(true);
    });

    it('resets an expired client bucket', () => {
        const limiter = new RateLimiter({ windowMs: 1, maxRequests: 1 });

        limiter.consume('client');
        limiter.clients.get('client').resetAt = Date.now() - 1;

        expect(limiter.consume('client').limited).toBe(false);
    });

    it('returns 429 and Retry-After when a client is limited', async () => {
        const app = express();
        app.use(createRateLimitMiddleware({ windowMs: 60_000, maxRequests: 1 }));
        app.get('/health', (_req, res) => res.json({ ok: true }));

        await request(app).get('/health').expect(200);
        const response = await request(app).get('/health').expect(429);

        expect(response.headers['retry-after']).toBeDefined();
        expect(response.body).toMatchObject({ error: 'Too many requests' });
    });
});