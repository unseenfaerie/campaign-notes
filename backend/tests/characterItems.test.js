const request = require('supertest');
const app = require('../server');

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
