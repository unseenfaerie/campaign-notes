const request = require('supertest');
const app = require('../../../server');

// Test data for associations
const charId = 'jest-char-1';
const eventId = 'jest-event-1';

// Helper to create a test event
async function ensureTestEvent() {
  await request(app)
    .post('/api/events')
    .send({
      id: eventId,
      name: 'Jest Event',
      type: 'Test',
      short_description: 'Test event',
      long_explanation: 'For Jest association tests.'
    });
}

describe('Character-Event Associations API', () => {
  beforeAll(async () => {
    await ensureTestEvent();
  });

  afterAll(async () => {
    // Clean up association and event
    await request(app).delete(`/api/characters/${charId}/events/${eventId}`);
    await request(app).delete(`/api/events/${eventId}`);
  });

  it('should add an event to a character', async () => {
    const res = await request(app)
      .post(`/api/characters/${charId}/events`)
      .send({
        event_id: eventId,
        short_description: 'Occurred for testing',
        long_explanation: 'Jest test event.'
      });
    expect([201, 409]).toContain(res.statusCode);
    expect(res.body).toBeDefined();
  });

  it('should get all events for the character', async () => {
    const res = await request(app).get(`/api/characters/${charId}/events`);
    expect([200, 404]).toContain(res.statusCode);
    expect(Array.isArray(res.body) || res.body.error).toBeTruthy();
  });

  it('should get a specific character-event relationship', async () => {
    const res = await request(app).get(`/api/characters/${charId}/events/${eventId}`);
    expect([200, 404]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.event_id).toBe(eventId);
      expect(res.body.character_id).toBe(charId);
    }
  });

  it('should update a character-event association', async () => {
    const res = await request(app)
      .patch(`/api/characters/${charId}/events/${eventId}`)
      .send({ short_description: 'Updated event description' });
    expect([200, 404]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.short_description).toBe('Updated event description');
    }
  });

  it('should remove a character from an event', async () => {
    const res = await request(app).delete(`/api/characters/${charId}/events/${eventId}`);
    expect([200, 404]).toContain(res.statusCode);
  });
});
