const request = require('supertest');
const app = require('../../../server');
const entities = require('../../../../common/entities');

// ~TEST DATA~
const testSphere = {
  id: 'eros',
  name: 'Eros',
  short_description: 'The sphere of arcane erotic magic.'
};

describe('Sphere API', () => {

  afterAll(async () => {
    await request(app).delete(`/api/spheres/${testSphere.id}`);
  });

  // ~CREATE TESTS~
  describe('POST /api/spheres', () => {
    it('should create a new sphere', async () => {
      const res = await request(app)
        .post('/api/spheres')
        .send(testSphere);
      expect([201, 409]).toContain(res.statusCode); // 409 if already exists
      expect(res.body).toBeDefined();
    });

    it('should reject a sphere with an invalid id', async () => {
      const invalidSphere = {
        ...testSphere,
        id: 'bad Sphere 1d'
      }
      const res = await request(app)
        .post('/api/spheres')
        .send(invalidSphere);
      expect([400]).toContain(res.statusCode);
    });

    it('should reject a sphere with an additional field', async () => {
      const fuckedSphere = {
        ...testSphere,
        influence: 500
      }
      const res = await request(app)
        .post('/api/spheres')
        .send(fuckedSphere);
      // make sure that the sphere entity does not include an influence field
      expect(Object.keys(entities.Sphere)).not.toContain('influence');
      expect([400]).toContain(res.statusCode);
    });
  });

  // ~READ TESTS~
  describe('GET /api/spheres', () => {
    it('should return all spheres', async () => {
      const res = await request(app).get('/api/spheres');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/spheres/:id', () => {
    it('should return the test sphere', async () => {
      const res = await request(app).get(`/api/spheres/${testSphere.id}`);
      expect([200, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body.id).toBe(testSphere.id);
      }
    });
  });


  // ~UPDATE TESTS~
  describe('PATCH /api/spheres/:id', () => {
    it('should update the test sphere', async () => {
      const res = await request(app)
        .patch(`/api/spheres/${testSphere.id}`)
        .send({ short_description: 'Updated description' });
      expect([200, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body.short_description).toBe('Updated description');
      }
    });
  });

  // ~DELETE TESTS~
  describe('DELETE /api/spheres/:id', () => {
    it('should delete the test sphere', async () => {
      const res = await request(app).delete(`/api/spheres/${testSphere.id}`);
      expect([200, 404]).toContain(res.statusCode);
    });
  });
});
