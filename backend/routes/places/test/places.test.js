const request = require('supertest');
const app = require('../../../server');
const entities = require('../../../../common/entities');

// ~TEST DATA~
const testPlace = {
  id: 'jestfield',
  name: 'Jestfield',
  type: 'City',
  parent_id: '',
  short_description: 'A bustling trade city known for its vibrant automated tests.',
  long_explanation: 'Jestfield is a major hub of software reliability testing, attracting developers and testers from all over the realm. The city is famous for its grand bazaar, where one can find exotic javascript and rare VSCode plugins. Despite its prosperity, Jestfield has its share of intrigue and danger, with various factions vying for control of the lucrative unit tests.'
};

describe('Place API', () => {

  afterAll(async () => {
    await request(app).delete(`/api/places/${testPlace.id}`);
  });

  // ~CREATE TESTS~
  describe('POST /api/places', () => {
    it('should create a new place', async () => {
      const res = await request(app)
        .post('/api/places')
        .send(testPlace);
      expect([201, 409]).toContain(res.statusCode); // 409 if already exists
      expect(res.body).toBeDefined();
    });

    it('should reject a place with an invalid id', async () => {
      const invalidPlace = {
        ...testPlace,
        id: 'bad Place 1d'
      }
      const res = await request(app)
        .post('/api/places')
        .send(invalidPlace);
      expect([400]).toContain(res.statusCode);
    });

    it('should reject a place with an additional field', async () => {
      const fuckedPlace = {
        ...testPlace,
        rivers: 22
      }
      const res = await request(app)
        .post('/api/places')
        .send(fuckedPlace);
      // make sure that the place entity does not include a rivers field
      expect(Object.keys(entities.Place)).not.toContain('rivers');
      expect([400]).toContain(res.statusCode);
    });
  });

  // ~READ TESTS~
  describe('GET /api/places', () => {
    it('should return all places', async () => {
      const res = await request(app).get('/api/places');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/places/:id', () => {
    it('should return the test place', async () => {
      const res = await request(app).get(`/api/places/${testPlace.id}`);
      expect([200, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body.id).toBe(testPlace.id);
      }
    });
  });

  // ~UPDATE TESTS~
  describe('PATCH /api/places/:id', () => {
    it('should update the test place', async () => {
      const res = await request(app)
        .patch(`/api/places/${testPlace.id}`)
        .send({ short_description: 'Updated descripsh' });
      expect([200, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body.short_description).toBe('Updated descripsh');
      }
    });
  });

  // ~DELETE TESTS~
  describe('DELETE /api/places/:id', () => {
    it('should delete the test place', async () => {
      const res = await request(app).delete(`/api/places/${testPlace.id}`);
      expect([200, 404]).toContain(res.statusCode);
    });
  });
});
