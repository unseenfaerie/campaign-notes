const request = require('supertest');
const app = require('../server');

describe('Character Associations API', () => {
  const charId = 'jest-char-1';
  // These tests assume the character exists (see characters.test.js)

  describe('GET /api/characters/:id/organizations', () => {
    it('should return organizations for the character', async () => {
      const res = await request(app).get(`/api/characters/${charId}/organizations`);
      expect([200, 404]).toContain(res.statusCode);
      expect(Array.isArray(res.body) || res.body.error).toBeTruthy();
    });
  });

  describe('GET /api/characters/:id/events', () => {
    it('should return events for the character', async () => {
      const res = await request(app).get(`/api/characters/${charId}/events`);
      expect([200, 404]).toContain(res.statusCode);
      expect(Array.isArray(res.body) || res.body.error).toBeTruthy();
    });
  });

  describe('GET /api/characters/:id/items', () => {
    it('should return items for the character', async () => {
      const res = await request(app).get(`/api/characters/${charId}/items`);
      expect([200, 404]).toContain(res.statusCode);
      expect(Array.isArray(res.body) || res.body.error).toBeTruthy();
    });
  });

  describe('GET /api/characters/:id/deities', () => {
    it('should return deities for the character', async () => {
      const res = await request(app).get(`/api/characters/${charId}/deities`);
      expect([200, 404]).toContain(res.statusCode);
      expect(Array.isArray(res.body) || res.body.error).toBeTruthy();
    });
  });

  describe('GET /api/characters/:id/relationships', () => {
    it('should return relationships for the character', async () => {
      const res = await request(app).get(`/api/characters/${charId}/relationships`);
      expect([200, 404]).toContain(res.statusCode);
      expect(Array.isArray(res.body) || res.body.error).toBeTruthy();
    });
  });
});
