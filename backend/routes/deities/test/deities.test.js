const request = require('supertest');
const app = require('../../../server');
const entities = require('../../../../common/entities');

describe('Deity API', () => {
  // Test data for creating a deity
  const testDeity = {
    id: 'jestar-ascended',
    name: 'Jestar, Ascended',
    pantheon: 'Main Human',
    short_description: 'The ascended form of Jestar, embodying ultimate magical power.'
  };

  const testChar = {
    id: 'mario-luigicus',
    type: 'npc',
    name: 'Mario Luigicus',
    deceased: '0',
    short_description: 'Just getting by.'
  };

  const testSphere = {
    id: 'shadow-realm',
    name: 'Shadow Realm',
    short_description: 'Spells from an area where oblivion reigns.'
  };

  const testCharAssoc = {
    character_id: testChar.id,
    short_description: 'Mario gains faith after seeing his friend encompassed in slime.'
  };

  const testSphereAssoc = {
    sphere_id: testSphere.id
  };

  afterAll(async () => {
    // Clean up test deity and associated data
    await request(app).delete(`/api/deities/${testDeity.id}/characters`);
    await request(app).delete(`/api/deities/${testDeity.id}/spheres`);
    await request(app).delete(`/api/characters/${testChar.id}`);
    await request(app).delete(`/api/spheres/${testSphere.id}`);
    await request(app).delete(`/api/deities/${testDeity.id}`);
  });

  // ...setup for tests...
  beforeAll(async () => {
    const charRes = await request(app).post('/api/characters').send(testChar);
    const sphereRes = await request(app).post('/api/spheres').send(testSphere);
    // if (charRes.statusCode !== 201) throw new Error('Character setup failed');
    // if (sphereRes.statusCode !== 201) throw new Error('Sphere setup failed');
  });

  // ~CREATE TESTS~
  describe('create a deity', () => {
    it('should create a new deity', async () => {
      const res = await request(app)
        .post('/api/deities')
        .send(testDeity);
      expect([201, 409]).toContain(res.statusCode); // 409 if already exists
      expect(res.body).toBeDefined();
    });
  });

  // ~READ TESTS~
  describe('read all deities', () => {
    it('should return all deities', async () => {
      const res = await request(app).get('/api/deities');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('should get a single deity', () => {
    it('should return the test deity', async () => {
      const res = await request(app).get(`/api/deities/${testDeity.id}`);
      expect([200, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body.id).toBe(testDeity.id);
      }
    });
  });

  // note: this test will create an item and associate it to the test character as defined above.
  describe('get a deity in full detail', () => {
    it('should return full details for the test deity', async () => {
      await request(app).post(`/api/${testDeity.id}/characters`).send(testCharAssoc);
      await request(app).post(`/api/${testDeity.id}/spheres`).send(testSphereAssoc);
      const res = await request(app).get(`/api/deities/${testDeity.id}/full`);
      expect([200]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body.id).toBe(testDeity.id);
        expect(res.body.characters[0].id).toBe(testChar.id);
        expect(res.body.spheres[0].id).toBe(testSphere.id);
      }
    });
  });

  // ~UPDATE TESTS~
  describe('update a single deity', () => {
    it('should update the test deity', async () => {
      const res = await request(app)
        .patch(`/api/deities/${testDeity.id}`)
        .send({ short_description: 'Updated Deity Desc.' });
      expect([200, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body.short_description).toBe('Updated Deity Desc.');
      }
    });
  });

  // ~DELETE TESTS~
  describe('delete a deity', () => {
    it('should delete the test deity', async () => {
      const res = await request(app).delete(`/api/deities/${testDeity.id}`);
      expect([200, 404]).toContain(res.statusCode);
    });
  });

  // ~~AUX TESTS~~
  describe('unknown field test', () => {
    it('should reject a deity with an additional stat', async () => {
      const fuckedDeity = {
        ...testDeity,
        favor: 22
      }
      const res = await request(app)
        .post('/api/deities')
        .send(fuckedDeity);
      // make sure that the deity entity does not include a favor field
      expect(Object.keys(entities.Deity)).not.toContain('favor');
      expect([400, 500]).toContain(res.statusCode);
    });
  });

  describe('valid id test', () => {
    it('should reject a deity with an invalid id', async () => {
      const invalidDeity = {
        ...testDeity,
        id: 'bad Deity 1d'
      }
      const res = await request(app)
        .post('/api/deities')
        .send(invalidDeity);
      expect([400]).toContain(res.statusCode);
    });
  });

});
