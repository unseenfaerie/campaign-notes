const request = require('supertest');
const app = require('../../../server');
const entities = require('../../../../common/entities');

describe('Event API', () => {
  // Test data for creating an event
  const testEvent = {
    id: 'test-ascension',
    name: 'Test Event',
    real_world_date: '2023-10-01',
    in_game_time: 'aug-30-225',
    previous_event_id: '',
    next_event_id: '',
    short_description: 'The Jestar ascends, embodying ultimate magical power.',
    long_explanation: 'After a long and arduous journey, the Jestar finally achieves ascension, gaining unparalleled magical abilities and a deeper understanding of the universe.'
  };

  const testChar = {
    id: 'jestar-bonzalez',
    type: 'npc',
    name: 'Jestar Bonzalez',
    deceased: '0',
    short_description: 'Just getting by.'
  };

  const testDeity = {
    id: 'jestar-ascended',
    name: 'Jestar, Ascended',
    short_description: 'The god of the shadow realm.'
  };

  const testCharAssoc = {
    character_id: testChar.id,
    short_description: 'Jestar actually becomes a deity.',
    long_description: 'After a series of trials, Jestar ascends to godhood, gaining immense power and influence.'
  };

  const testDeityAssoc = {
    deity_id: testDeity.id
  };

  afterAll(async () => {
    // Clean up test deity and associated data
    await request(app).delete(`/api/events/${testEvent.id}/characters`);
    await request(app).delete(`/api/events/${testEvent.id}/deities`);
    await request(app).delete(`/api/characters/${testChar.id}`);
    await request(app).delete(`/api/deities/${testDeity.id}`);
    await request(app).delete(`/api/events/${testEvent.id}`);
  });

  // ...setup for tests...
  beforeAll(async () => {
    const charRes = await request(app).post('/api/characters').send(testChar);
    const deityRes = await request(app).post('/api/deities').send(testDeity);
    // if (charRes.statusCode !== 201) throw new Error('Character setup failed');
    // if (deityRes.statusCode !== 201) throw new Error('Deity setup failed');
  });

  // ~CREATE TESTS~
  describe('create an event', () => {
    it('should create a new event', async () => {
      const res = await request(app)
        .post('/api/events')
        .send(testEvent);
      expect([201, 409]).toContain(res.statusCode); // 409 if already exists
      expect(res.body).toBeDefined();
    });
  });

  // ~READ TESTS~
  describe('read all events', () => {
    it('should return all events', async () => {
      const res = await request(app).get('/api/events');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('should get a single event', () => {
    it('should return the test event', async () => {
      const res = await request(app).get(`/api/events/${testEvent.id}`);
      expect([200, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body.id).toBe(testEvent.id);
      }
    });
  });

  // note: this test will create an item and associate it to the test character as defined above.
  describe('get an event in full detail', () => {
    it('should return full details for the test event', async () => {
      await request(app).post(`/api/events/${testEvent.id}/characters`).send(testCharAssoc);
      await request(app).post(`/api/events/${testEvent.id}/deities`).send(testDeityAssoc);
      const res = await request(app).get(`/api/events/${testEvent.id}/full`);
      expect([200]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body.id).toBe(testEvent.id);
        expect(res.body.characters[0].character_id).toBe(testChar.id);
        expect(res.body.deities[0].deity_id).toBe(testDeity.id);
      }
    });
  });

  // ~UPDATE TESTS~
  describe('update a single event', () => {
    it('should update the test event', async () => {
      const res = await request(app)
        .patch(`/api/events/${testEvent.id}`)
        .send({ short_description: 'Updated Event Desc.' });
      expect([200, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body.short_description).toBe('Updated Event Desc.');
      }
    });
  });

  // ~DELETE TESTS~
  describe('delete an event', () => {
    it('should delete the test event', async () => {
      const res = await request(app).delete(`/api/events/${testEvent.id}`);
      expect([200, 404]).toContain(res.statusCode);
    });
  });

  // ~~AUX TESTS~~
  describe('unknown field test', () => {
    it('should reject an event with an additional field', async () => {
      const fuckedEvent = {
        ...testEvent,
        location: 'New Location'
      }
      const res = await request(app)
        .post('/api/deities')
        .send(fuckedEvent);
      // make sure that the event entity does not include a location field
      expect(Object.keys(entities.Event)).not.toContain('location');
      expect([400, 500]).toContain(res.statusCode);
    });
  });

  describe('valid id test', () => {
    it('should reject an event with an invalid id', async () => {
      const invalidEvent = {
        ...testEvent,
        id: 'bad Event 1d'
      }
      const res = await request(app)
        .post('/api/events')
        .send(invalidEvent);
      expect([400]).toContain(res.statusCode);
    });
  });

});
