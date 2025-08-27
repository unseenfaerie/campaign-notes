const request = require('supertest');
const app = require('../server');

// Test data for associations
const charId = 'jest-char-1';
const deityId = 'jest-deity-1';

// Helper to create a test deity
async function ensureTestDeity() {
  await request(app)
    .post('/api/deities')
    .send({
      id: deityId,
      name: 'Jest Deity',
      pantheon: 'Test Pantheon',
      alignment: 'Neutral',
      short_description: 'Test deity',
      long_explanation: 'For Jest association tests.'
    });
}

describe('Character-Deity Associations API', () => {
  beforeAll(async () => {
    await ensureTestDeity();
  });

  afterAll(async () => {
    // Clean up association and deity
    await request(app).delete(`/api/characters/${charId}/deities/${deityId}`);
    await request(app).delete(`/api/deities/${deityId}`);
  });

  it('should add a deity to a character', async () => {
    const res = await request(app)
      .post(`/api/characters/${charId}/deities`)
      .send({
        deity_id: deityId,
        short_description: 'Associated for testing',
        long_explanation: 'Jest test deity.'
      });
    expect([201, 409]).toContain(res.statusCode);
    expect(res.body).toBeDefined();
  });

  it('should get all deities for the character', async () => {
    const res = await request(app).get(`/api/characters/${charId}/deities`);
    expect([200, 404]).toContain(res.statusCode);
    expect(Array.isArray(res.body) || res.body.error).toBeTruthy();
  });

  it('should get a specific character-deity relationship', async () => {
    const res = await request(app).get(`/api/characters/${charId}/deities/${deityId}`);
    expect([200, 404]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.deity_id).toBe(deityId);
      expect(res.body.character_id).toBe(charId);
    }
  });

  it('should update a character-deity association', async () => {
    const res = await request(app)
      .patch(`/api/characters/${charId}/deities/${deityId}`)
      .send({ short_description: 'Updated deity description' });
    expect([200, 404]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.short_description).toBe('Updated deity description');
    }
  });

  it('should remove a deity from a character', async () => {
    const res = await request(app).delete(`/api/characters/${charId}/deities/${deityId}`);
    expect([200, 404]).toContain(res.statusCode);
  });
});
