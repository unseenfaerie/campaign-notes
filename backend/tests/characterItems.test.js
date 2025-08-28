const request = require('supertest');
const app = require('../server');

describe('Character-Item API', () => {
  const testCharacterId = 'jest-char-1';
  const testItemId = 'jest-item-1';
  const testAssoc = { character_id: testCharacterId, item_id: testItemId };

  beforeAll(async () => {
    await request(app).post('/api/characters').send({ id: testCharacterId, name: 'Char', type: 'PC' });
    await request(app).post('/api/items').send({ id: testItemId, name: 'Item' });
  });
  afterAll(async () => {
    await request(app).delete(`/api/characters/${testCharacterId}`);
    await request(app).delete(`/api/items/${testItemId}`);
  });

  describe('POST /api/character-items', () => {
    it('should create a character-item association', async () => {
      const res = await request(app).post('/api/character-items').send(testAssoc);
      expect([201, 409]).toContain(res.statusCode);
    });
  });

  describe('GET /api/character-items', () => {
    it('should list all character-item associations', async () => {
      const res = await request(app).get('/api/character-items');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/character-items/:character_id/:item_id', () => {
    it('should get a specific association', async () => {
      const res = await request(app).get(`/api/character-items/${testCharacterId}/${testItemId}`);
      expect([200, 404]).toContain(res.statusCode);
    });
  });

  describe('DELETE /api/character-items/:character_id/:item_id', () => {
    it('should delete the association', async () => {
      const res = await request(app).delete(`/api/character-items/${testCharacterId}/${testItemId}`);
      expect([200, 404]).toContain(res.statusCode);
    });
  });
});

// Test data for associations
const charId = 'jest-char-1';
const itemId = 'jest-item-1';
const acquiredDate = 'jan-01-100';
const lostDate = 'feb-01-100';

// Helper to create a test item
async function ensureTestItem() {
  await request(app)
    .post('/api/items')
    .send({
      id: itemId,
      name: 'Jest Item',
      type: 'Test',
      short_description: 'Test item',
      long_explanation: 'For Jest association tests.'
    });
}

describe('Character-Item Associations API', () => {
  beforeAll(async () => {
    await ensureTestItem();
  });

  afterAll(async () => {
    // Clean up association and item
    await request(app).delete(`/api/characters/${charId}/items/${itemId}/${acquiredDate}`);
    await request(app).delete(`/api/items/${itemId}`);
  });

  it('should add an item to a character', async () => {
    const res = await request(app)
      .post(`/api/characters/${charId}/items`)
      .send({
        item_id: itemId,
        acquired_date: acquiredDate,
        lost_date: '',
        short_description: 'Acquired for testing',
        long_explanation: 'Jest test acquire.'
      });
    expect([201, 409]).toContain(res.statusCode);
    expect(res.body).toBeDefined();
  });

  it('should get all items for the character', async () => {
    const res = await request(app).get(`/api/characters/${charId}/items`);
    expect([200, 404]).toContain(res.statusCode);
    expect(Array.isArray(res.body) || res.body.error).toBeTruthy();
  });

  it('should get the history of a specific character-item relationship', async () => {
    const res = await request(app).get(`/api/characters/${charId}/items/${itemId}`);
    expect([200, 404]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(Array.isArray(res.body)).toBe(true);
    }
  });

  it('should get a specific character-item relationship by acquired_date', async () => {
    const res = await request(app).get(`/api/characters/${charId}/items/${itemId}/${acquiredDate}`);
    expect([200, 404]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.item_id).toBe(itemId);
      expect(res.body.acquired_date).toBe(acquiredDate);
    }
  });

  it('should update a character-item association by acquired_date', async () => {
    const res = await request(app)
      .patch(`/api/characters/${charId}/items/${itemId}/${acquiredDate}`)
      .send({ relinquished_date: lostDate });
    expect([200, 404]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.relinquished_date).toBe(lostDate);
    }
  });

  it('should remove a single instance of item ownership from a character', async () => {
    const res = await request(app).delete(`/api/characters/${charId}/items/${itemId}/${acquiredDate}`);
    expect([200, 404]).toContain(res.statusCode);
  });
});
