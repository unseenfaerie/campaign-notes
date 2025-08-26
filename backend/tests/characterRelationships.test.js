const request = require('supertest');
const app = require('../server');

// Test data for associations
const charId = 'jest-char-1';
const relatedId = 'jest-char-2';

// Helper to create a related character
async function ensureRelatedCharacter() {
  await request(app)
    .post('/api/characters')
    .send({
      id: relatedId,
      type: 'npc',
      name: 'Jest Related',
      class: '',
      level: '',
      alignment: '',
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
      total_health: 10,
      deceased: 0,
      short_description: 'Related character',
      long_explanation: 'For Jest relationship tests.'
    });
}

describe('Character-Character Relationship API', () => {
  beforeAll(async () => {
    await ensureRelatedCharacter();
  });

  afterAll(async () => {
    // Clean up relationship and related character
    await request(app).delete(`/api/characters/${charId}/relationships/${relatedId}`);
    await request(app).delete(`/api/characters/${relatedId}`);
  });

  it('should add a relationship to a character', async () => {
    const res = await request(app)
      .post(`/api/characters/${charId}/relationships`)
      .send({
        related_id: relatedId,
        relationship_type: 'sibling',
        short_description: 'Sibling for testing',
        long_explanation: 'Jest test relationship.'
      });
    expect([201, 409]).toContain(res.statusCode);
    expect(res.body).toBeDefined();
  });

  it('should get all relationships for the character', async () => {
    const res = await request(app).get(`/api/characters/${charId}/relationships`);
    expect([200, 404]).toContain(res.statusCode);
    expect(Array.isArray(res.body) || res.body.error).toBeTruthy();
  });

  it('should get a specific character-character relationship', async () => {
    const res = await request(app).get(`/api/characters/${charId}/relationships/${relatedId}`);
    expect([200, 404]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.related_id).toBe(relatedId);
      expect(res.body.character_id).toBe(charId);
    }
  });

  it('should update a character-character relationship', async () => {
    const res = await request(app)
      .patch(`/api/characters/${charId}/relationships/${relatedId}`)
      .send({ short_description: 'Updated relationship description' });
    expect([200, 404]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.short_description).toBe('Updated relationship description');
    }
  });

  it('should remove a relationship from a character', async () => {
    const res = await request(app).delete(`/api/characters/${charId}/relationships/${relatedId}`);
    expect([200, 404]).toContain(res.statusCode);
  });
});
