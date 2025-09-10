const request = require('supertest');
const app = require('../../../server');
const entities = require('../../../../common/entities');

describe('Spell-Sphere API', () => {
  // Test data for creating a spell and spheres for testing
  const testSpell = {
    id: 'blossom',
    type: 'arcane',
    name: 'Blossom',
    level: 3,
    school: 'Conjuration',
    casting_time: '3 segments',
    range: 'Self',
    components: 'S',
    duration: 'Instantaneous',
    description: 'This spell causes your fingers vibrate vigorously and feel no fatigue from use.'
  };

  const testSphere = {
    id: 'eros',
    name: 'Eros',
    short_description: 'The sphere of Eros.'
  };

  const testSphereII = {
    id: 'intoxication',
    name: 'Intoxication',
    short_description: 'The sphere of Intoxication.'
  };

  const testSphereAssoc = {
    sphere_id: 'eros'
  };

  const testSphereAssocII = {
    sphere_id: 'intoxication'
  };

  afterAll(async () => {
    // Clean up test spell and spheres
    await request(app).delete(`/api/spells/${testSpell.id}/spheres`)
    await request(app).delete(`/api/spells/${testSpell.id}`);
    await request(app).delete(`/api/spheres/${testSphere.id}`);
    await request(app).delete(`/api/spheres/${testSphereII.id}`);
  });

  beforeAll(async () => {
    // Create test spell and spheres before running tests
    await request(app).post('/api/spells').send(testSpell);
    await request(app).post('/api/spheres').send(testSphere);
    await request(app).post('/api/spheres').send(testSphereII);
  });

  // ~CREATE TESTS~
  describe('POST /api/spells/:id/spheres', () => {
    it('should associate an sphere to a spell', async () => {
      const res = await request(app)
        .post(`/api/spells/${testSpell.id}/spheres`)
        .send(testSphereAssoc);
      const resii = await request(app)
        .post(`/api/spells/${testSpell.id}/spheres`)
        .send(testSphereAssocII);
      expect([201, 409]).toContain(res.statusCode);
      expect(res.body).toBeDefined();
    });
  });

  describe('POST /api/spells/:id/spheres', () => {
    it('should not associate the same sphere to a spell more than once', async () => {
      const res = await request(app)
        .post(`/api/spells/${testSpell.id}/spheres`)
        .send(testSphereAssoc);
      expect([409]).toContain(res.statusCode);
      expect(res.body).toBeDefined();
    });
  });

  describe('valid sphere id test', () => {
    it('should reject an sphere association with an invalid id', async () => {
      const invalidSphereAss = {
        sphere_id: 'bad-pher-d'
      };
      const res = await request(app)
        .post(`/api/spells/${testSpell.id}/spheres`)
        .send(invalidSphereAss);
      expect([404]).toContain(res.statusCode);
    });
  });

  describe('unknown field test', () => {
    it('should reject an item association with an additional field', async () => {
      const fuckedSphereAss = {
        ...testSphereAssoc,
        imbued: 22
      }
      const res = await request(app)
        .post(`/api/spells/${testSpell.id}/spheres`)
        .send(fuckedSphereAss);
      // make sure that the item association entity does not include a imbued field
      expect(Object.keys(entities.SpellSphere)).not.toContain('imbued');
      expect([400]).toContain(res.statusCode);
    });
  });

  // ~READ TESTS~
  describe('GET /api/spells/:id/spheres', () => {
    it('should return all spheres associated with a spell', async () => {
      const res = await request(app).get(`/api/spells/${testSpell.id}/spheres`);
      expect([200, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body[0].sphere_id).toBe(testSphere.id);
        expect(res.body[1].sphere_id).toBe(testSphereII.id);
      }
    });
  });

  // ~DELETE TESTS~
  describe('DELETE /api/spells/:id/spheres/:sphere_id', () => {
    it('should delete the association between the test spell and sphere', async () => {
      const res = await request(app).delete(`/api/spells/${testSpell.id}/spheres/${testSphere.id}`);
      expect([200, 404]).toContain(res.statusCode);
    });
  });

  describe('DELETE /api/spells/:id/spheres', () => {
    it('should delete all associations between the test spell and any spheres', async () => {
      const res = await request(app).delete(`/api/spells/${testSpell.id}/spheres`);
      expect([200, 404]).toContain(res.statusCode);
    });
  });

  // ~~BUSINESS LOGIC TESTS~~

  // ~~AUX TESTS~~

});