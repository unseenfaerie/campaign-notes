const request = require('supertest');
const app = require('../../../server');
const entities = require('../../../../common/entities');

// ~TEST DATA~

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
  short_description: 'The sphere of arcane erotic magic.'
};

const testItem = {
  id: 'slick-ring',
  name: 'Slick Ring',
  short_description: 'A ruby ring with a soft blue glow. It feels slippery to the touch.'
};

const testSphereAssoc = {
  sphere_id: 'eros'
};

const testItemAssoc = {
  item_id: 'slick-ring'
};

describe('Spell API', () => {

  afterAll(async () => {
    // Clean up test spell
    await request(app).delete(`/api/spells/${testSpell.id}`);
    await request(app).delete(`/api/spheres/${testSphere.id}`);
    await request(app).delete(`/api/items/${testItem.id}`);
  });

  // ~CREATE TESTS~
  describe('POST /api/spells', () => {
    it('should create a new spell', async () => {
      const res = await request(app)
        .post('/api/spells')
        .send(testSpell);
      expect([201, 409]).toContain(res.statusCode); // 409 if already exists
      expect(res.body).toBeDefined();
    });

    it('should reject a spell with an invalid id', async () => {
      const invalidSpell = {
        ...testSpell,
        id: 'bad Spell 1d'
      }
      const res = await request(app)
        .post('/api/spells')
        .send(invalidSpell);
      expect([400]).toContain(res.statusCode);
    });

    it('should reject a spell with an additional field', async () => {
      const fuckedSpell = {
        ...testSpell,
        aura_points: 22
      }
      const res = await request(app)
        .post('/api/spells')
        .send(fuckedSpell);
      // make sure that the spell entity does not include an aura_points field
      expect(Object.keys(entities.Spell)).not.toContain('aura_points');
      expect([400]).toContain(res.statusCode);
    });

    it('should reject a spell with M component but no materials', async () => {
      const spellWithM = {
        ...testSpell,
        components: 'M'
      };
      const res = await request(app)
        .post('/api/spells')
        .send(spellWithM);
      expect([400]).toContain(res.statusCode);
    });
  });

  // ~READ TESTS~
  describe('GET /api/spells', () => {
    it('should return all spells', async () => {
      const res = await request(app).get('/api/spells');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/spells/:id', () => {
    it('should return the test spell', async () => {
      const res = await request(app).get(`/api/spells/${testSpell.id}`);
      expect([200, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body.id).toBe(testSpell.id);
      }
    });
  });

  // note: this test will create an item and a sphere and associate them to the test spell as defined above.
  describe('GET /api/spells/:id/full', () => {
    it('should return full details for the test spell', async () => {
      await request(app).post(`/api/items`).send(testItem);
      await request(app).post(`/api/spheres`).send(testSphere);
      await request(app).post(`/api/spells/${testSpell.id}/items`).send(testItemAssoc);
      await request(app).post(`/api/spells/${testSpell.id}/spheres`).send(testSphereAssoc);
      const res = await request(app).get(`/api/spells/${testSpell.id}/full`);
      expect([200, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body.id).toBe(testSpell.id);
        expect(res.body.items.length).toBeDefined();
        expect(res.body.spheres.length).toBeDefined();
      }
    });
  });

  // ~UPDATE TESTS~
  describe('PATCH /api/spells/:id', () => {
    it('should update the test spell', async () => {
      const res = await request(app)
        .patch(`/api/spells/${testSpell.id}`)
        .send({ school: 'Abjuration' });
      expect([200, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body.school).toBe('Abjuration');
      }
    });
  });

  // ~DELETE TESTS~
  describe('DELETE /api/spells/:id', () => {
    it('should delete the test spell', async () => {
      const res = await request(app).delete(`/api/spells/${testSpell.id}`);
      expect([200, 404]).toContain(res.statusCode);
    });
  });
});
