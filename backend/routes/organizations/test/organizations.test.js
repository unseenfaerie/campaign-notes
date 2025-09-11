const request = require('supertest');
const app = require('../../../server');
const entities = require('../../../../common/entities');

describe('Organization API', () => {
  // Test data for creating an organization
  const testOrganization = {
    id: 'super-testers',
    name: 'Super Testers',
    type: 'guild',
    short_description: 'A group of elite testers.',
    long_explanation: 'Super testers test all the things, ensuring quality and reliability in every release.'
  };

  const testChar = {
    id: 'jestar-testar',
    type: 'npc',
    name: 'Jestar the Testar',
    deceased: 0,
    short_description: 'A man who tests things.',
    long_explanation: 'Jestar is known for his meticulous testing and attention to detail.'
  };

  const testCharAssoc = {
    character_id: testChar.id,
    short_description: 'Jestar the Testar is a key member of the Super Testers guild.'
  };

  afterAll(async () => {
    // Clean up test organization and associated data
    await request(app).delete(`/api/organizations/${testOrganization.id}/characters`);
    await request(app).delete(`/api/characters/${testChar.id}`);
  });

  beforeAll(async () => {
    const charRes = await request(app).post('/api/characters').send(testChar);
  });

  // ~CREATE TESTS~
  describe('POST /api/organizations', () => {
    it('should create a new organization', async () => {
      const res = await request(app)
        .post('/api/organizations')
        .send(testOrganization);
      expect([201, 409]).toContain(res.statusCode); // 409 if already exists
      expect(res.body).toBeDefined();
    });

    it('should reject an organization with an additional field', async () => {
      const fuckedOrganization = {
        ...testOrganization,
        favor: 22
      }
      const res = await request(app)
        .post('/api/organizations')
        .send(fuckedOrganization);
      // make sure that the organization entity does not include a favor field
      expect(Object.keys(entities.Organization)).not.toContain('favor');
      expect([400, 500]).toContain(res.statusCode);
    });

    it('should reject an organization with an invalid id', async () => {
      const invalidOrganization = {
        ...testOrganization,
        id: 'bad Organization 1d'
      }
      const res = await request(app)
        .post('/api/organizations')
        .send(invalidOrganization);
      expect([400]).toContain(res.statusCode);
    });
  });

  // ~READ TESTS~
  describe('GET /api/organizations', () => {
    it('should return all organizations', async () => {
      const res = await request(app).get('/api/organizations');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/organizations/:id', () => {
    it('should return the test organization', async () => {
      const res = await request(app).get(`/api/organizations/${testOrganization.id}`);
      expect([200, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body.id).toBe(testOrganization.id);
      }
    });
  });

  // ~UPDATE TESTS~
  describe('PATCH /api/organizations/:id', () => {
    it('should update the test organization', async () => {
      const res = await request(app)
        .patch(`/api/organizations/${testOrganization.id}`)
        .send({ short_description: 'Updated Organization Desc.' });
      expect([200, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body.short_description).toBe('Updated Organization Desc.');
      }
    });
  });

  // ~DELETE TESTS~
  describe('DELETE /api/organizations/:id', () => {
    it('should delete the test organization', async () => {
      const res = await request(app).delete(`/api/organizations/${testOrganization.id}`);
      expect([200, 404]).toContain(res.statusCode);
    });
  });
});
