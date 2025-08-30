const request = require('supertest');
const app = require('../../../server'); // Adjust if your Express app is exported differently

describe('GET /api/events', () => {
  it('should return all events', async () => {
    const res = await request(app).get('/api/events');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
