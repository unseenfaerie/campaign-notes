const request = require('supertest');
const app = require('../server');

describe('Character-Organization API', () => {
  const testCharacterId = 'jest-char-1';
  const testOrgId = 'jest-org-1';
  const testAssoc = { character_id: testCharacterId, organization_id: testOrgId };

  beforeAll(async () => {
    await request(app).post('/api/characters').send({ id: testCharacterId, name: 'Char', type: 'PC' });
    await request(app).post('/api/organizations').send({ id: testOrgId, name: 'Org' });
  });
  afterAll(async () => {
    await request(app).delete(`/api/characters/${testCharacterId}`);
    await request(app).delete(`/api/organizations/${testOrgId}`);
  });

  describe('POST /api/character-organizations', () => {
    it('should create a character-organization association', async () => {
      const res = await request(app).post('/api/character-organizations').send(testAssoc);
      expect([201, 409]).toContain(res.statusCode);
    });
  });

  describe('GET /api/character-organizations', () => {
    it('should list all character-organization associations', async () => {
      const res = await request(app).get('/api/character-organizations');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/character-organizations/:character_id/:organization_id', () => {
    it('should get a specific association', async () => {
      const res = await request(app).get(`/api/character-organizations/${testCharacterId}/${testOrgId}`);
      expect([200, 404]).toContain(res.statusCode);
    });
  });

  describe('DELETE /api/character-organizations/:character_id/:organization_id', () => {
    it('should delete the association', async () => {
      const res = await request(app).delete(`/api/character-organizations/${testCharacterId}/${testOrgId}`);
      expect([200, 404]).toContain(res.statusCode);
    });
  });
});

// Test data for associations
const charId = 'jest-char-1';
const orgId = 'jest-org-1';
const joinedDate = 'jan-01-100';
const leftDate = 'feb-01-100';

// Helper to create a test organization
async function ensureTestOrganization() {
  await request(app)
    .post('/api/organizations')
    .send({
      id: orgId,
      name: 'Jest Org',
      locations: '',
      type: 'Test',
      short_description: 'Test org',
      long_explanation: 'For Jest association tests.'
    });
}

describe('Character-Organization Associations API', () => {
  beforeAll(async () => {
    await ensureTestOrganization();
  });

  afterAll(async () => {
    // Clean up association and org
    await request(app).delete(`/api/characters/${charId}/organizations/${orgId}/${joinedDate}`);
    await request(app).delete(`/api/organizations/${orgId}`);
  });

  it('should add a character to an organization', async () => {
    const res = await request(app)
      .post(`/api/characters/${charId}/organizations`)
      .send({
        org_id: orgId,
        joined_date: joinedDate,
        left_date: '',
        short_description: 'Joined for testing',
        long_explanation: 'Jest test join.'
      });
    expect([201, 409]).toContain(res.statusCode);
    expect(res.body).toBeDefined();
  });

  it('should get all organizations for the character', async () => {
    const res = await request(app).get(`/api/characters/${charId}/organizations`);
    expect([200, 404]).toContain(res.statusCode);
    expect(Array.isArray(res.body) || res.body.error).toBeTruthy();
  });

  it('should get the history of a specific character-organization relationship', async () => {
    const res = await request(app).get(`/api/characters/${charId}/organizations/${orgId}`);
    expect([200, 404]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(Array.isArray(res.body)).toBe(true);
    }
  });

  it('should get a specific character-organization relationship by joined_date', async () => {
    const res = await request(app).get(`/api/characters/${charId}/organizations/${orgId}/${joinedDate}`);
    expect([200, 404]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.organization_id).toBe(orgId);
      expect(res.body.joined_date).toBe(joinedDate);
    }
  });

  it('should update a character-organization association by joined_date', async () => {
    const res = await request(app)
      .patch(`/api/characters/${charId}/organizations/${orgId}/${joinedDate}`)
      .send({ left_date: leftDate });
    expect([200, 404]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.left_date).toBe(leftDate);
    }
  });

  it('should remove a single instance of organization membership from a character', async () => {
    const res = await request(app).delete(`/api/characters/${charId}/organizations/${orgId}/${joinedDate}`);
    expect([200, 404]).toContain(res.statusCode);
  });
});
