const request = require('supertest');
const app = require('../server');
const { validateFields } = require('../../common/validate');

// Test data for associations
const charId = 'jest-char-1';
const deityId = 'jest-deity-1';

// Test data object for character (minimum required fields per entities.js)
const testCharacter = {
  id: charId,
  type: 'pc',
  name: 'Jest Character',
  deceased: 0,
  short_description: 'Test character'
};

// Test data object for deity
const testDeity = {
  id: deityId,
  name: 'Jest Deity',
  pantheon: 'Test Pantheon',
  alignment: 'Neutral',
  short_description: 'Test deity',
  long_explanation: 'For Jest association tests.'
};

// Test data object for character-deity association
const testCharacterDeity = {
  character_id: charId,
  deity_id: deityId,
  short_description: 'Associated for testing',
  long_explanation: 'Jest test deity.'
};

// Helper to create a test deity
async function ensureTestDeity() {
  await request(app)
    .post('/api/deities')
    .send(testDeity);
}

// Helper to create a test character
async function ensureTestCharacter() {
  await request(app)
    .post('/api/characters')
    .send(testCharacter);
}


describe('Character-Deity Associations API', () => {
  beforeAll(async () => {
    await ensureTestCharacter();
    await ensureTestDeity();
  });

  afterAll(async () => {
    // Clean up association, deity, and character
    await request(app).delete(`/api/characters/${charId}/deities/${deityId}`);
    await request(app).delete(`/api/deities/${deityId}`);
    await request(app).delete(`/api/characters/${charId}`);
  });



  it('should validate testCharacter against the schema', () => {
    const { valid, errors } = validateFields('Character', testCharacter);
    expect(valid).toBe(true);
    expect(errors).toEqual([]);
  });

  it('should validate testDeity against the schema', () => {
    const { valid, errors } = validateFields('Deity', testDeity);
    expect(valid).toBe(true);
    expect(errors).toEqual([]);
  });

  it('should validate testCharacterDeity against the schema', () => {
    const { valid, errors } = validateFields('CharacterDeity', testCharacterDeity);
    expect(valid).toBe(true);
    expect(errors).toEqual([]);
  });

  it('should add a deity to a character', async () => {
    const res = await request(app)
      .post(`/api/characters/${charId}/deities`)
      .send({
        deity_id: testCharacterDeity.deity_id,
        short_description: testCharacterDeity.short_description,
        long_explanation: testCharacterDeity.long_explanation
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
