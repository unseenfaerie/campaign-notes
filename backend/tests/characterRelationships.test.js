const request = require('supertest');
const app = require('../server');

describe('Character-Relationship API', () => {
  const testCharacterId = 'jest-char-1';
  const testOtherCharId = 'jest-char-2';
  const testAssoc = { character_id: testCharacterId, related_character_id: testOtherCharId, relationship_type: 'friend', short_description: 'A close friend', long_explanation: 'They have been through many adventures together.' };

  beforeAll(async () => {
    await request(app).post('/api/characters').send({ id: testCharacterId, name: 'Char', type: 'PC', deceased: false, short_description: 'A keen fellow' });
    await request(app).post('/api/characters').send({ id: testOtherCharId, name: 'Other', type: 'NPC', deceased: false, short_description: 'A mysterious figure' });
  });
  afterAll(async () => {
    await request(app).delete(`/api/characters/${testCharacterId}`);
    await request(app).delete(`/api/characters/${testOtherCharId}`);
  });

  describe('POST /api/characters/:character_id/relationships', () => {
    it('should create a character-relationship association', async () => {
      const res = await request(app).post(`/api/characters/${testCharacterId}/relationships`).send(testAssoc);
      expect([201, 409]).toContain(res.statusCode);
    });
  });

  describe('GET /api/characters/:character_id/relationships', () => {
    it('should list all character-relationship associations', async () => {
      const res = await request(app).get(`/api/characters/${testCharacterId}/relationships`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/characters/:character_id/relationships/:related_character_id', () => {
    it('should get a specific association', async () => {
      const res = await request(app).get(`/api/characters/${testCharacterId}/relationships/${testOtherCharId}`);
      expect([200, 404]).toContain(res.statusCode);
    });
  });

  describe('DELETE /api/characters/:character_id/relationships/:related_character_id', () => {
    it('should delete the association', async () => {
      const res = await request(app).delete(`/api/characters/${testCharacterId}/relationships/${testOtherCharId}`);
      expect([200, 404]).toContain(res.statusCode);
    });
  });
});
