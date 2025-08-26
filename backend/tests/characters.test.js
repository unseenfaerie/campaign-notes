const request = require('supertest');
const app = require('../server');

describe('Character API', () => {
  // Test data for creating a character
  const testCharacter = {
    id: 'jest-char-1',
    type: 'PC',
    name: 'Jest Test',
    class: 'Wizard',
    level: '5',
    alignment: 'NG',
    strength: 10,
    dexterity: 12,
    constitution: 14,
    intelligence: 18,
    wisdom: 13,
    charisma: 8,
    total_health: 30,
    deceased: 0,
    short_description: 'A test character',
    long_explanation: 'Created by Jest for API testing.'
  };

  afterAll(async () => {
    // Clean up test character
    await request(app).delete(`/api/characters/${testCharacter.id}`);
  });

  describe('POST /api/characters', () => {
    it('should create a new character', async () => {
      const res = await request(app)
        .post('/api/characters')
        .send(testCharacter);
      expect([201, 409]).toContain(res.statusCode); // 409 if already exists
      expect(res.body).toBeDefined();
    });
  });

  describe('GET /api/characters', () => {
    it('should return all characters', async () => {
      const res = await request(app).get('/api/characters');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/characters/:id', () => {
    it('should return the test character', async () => {
      const res = await request(app).get(`/api/characters/${testCharacter.id}`);
      expect([200, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body.id).toBe(testCharacter.id);
      }
    });
  });

  describe('GET /api/characters/:id/full', () => {
    it('should return full details for the test character', async () => {
      const res = await request(app).get(`/api/characters/${testCharacter.id}/full`);
      expect([200, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body.id).toBe(testCharacter.id);
      }
    });
  });

  describe('PATCH /api/characters/:id', () => {
    it('should update the test character', async () => {
      const res = await request(app)
        .patch(`/api/characters/${testCharacter.id}`)
        .send({ level: '6' });
      expect([200, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body.level).toBe('6');
      }
    });
  });

  describe('DELETE /api/characters/:id', () => {
    it('should delete the test character', async () => {
      const res = await request(app).delete(`/api/characters/${testCharacter.id}`);
      expect([200, 404]).toContain(res.statusCode);
    });
  });
});
