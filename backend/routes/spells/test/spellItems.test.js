const request = require('supertest');
const app = require('../../../server');
const entities = require('../../../../common/entities');

describe('Spell-Item API', () => {
  // Test data for creating a spell
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

  const testItem = {
    id: 'slick-ring',
    name: 'Slick Ring',
    short_description: 'A ruby ring with a soft blue glow. It feels slippery to the touch.'
  };

  const testItemII = {
    id: 'smooth-ring',
    name: 'Smooth Ring',
    short_description: 'A dark swirling ring with an eerie red glow. It feels electric.'
  };

  const testItemIII = {
    id: 'clear-ring',
    name: 'Clear Ring',
    short_description: 'A transparent ring that shimmers with a faint light. It feels virtuous.'
  };

  const testItemAssoc = {
    item_id: 'slick-ring'
  };

  const testItemAssocII = {
    item_id: 'smooth-ring'
  };

  const testItemAssocIII = {
    item_id: 'clear-ring'
  };

  afterAll(async () => {
    // Clean up test spell and items
    await request(app).delete(`/api/spells/${testSpell.id}`);
    await request(app).delete(`/api/items/${testItem.id}`);
    await request(app).delete(`/api/items/${testItemII.id}`);
    await request(app).delete(`/api/items/${testItemIII.id}`);
  });

  beforeAll(async () => {
    // Create test spell and items before running tests
    await request(app).post('/api/spells').send(testSpell);
    await request(app).post('/api/items').send(testItem);
    await request(app).post('/api/items').send(testItemII);
    await request(app).post('/api/items').send(testItemIII);
  });

  // ~CREATE TESTS~
  describe('POST /api/spells/:id/items', () => {
    it('should associate an item to a spell', async () => {
      const res = await request(app)
        .post(`/api/spells/${testSpell.id}/items`)
        .send(testItemAssoc);
      expect([201, 409]).toContain(res.statusCode); // 409 if already exists
      expect(res.body).toBeDefined();
    });
  });

  // ~READ TESTS~
  describe('GET /api/spells/:id/items', () => {
    it('should return all items associated with a spell', async () => {
      const res = await request(app).get(`/api/spells/${testSpell.id}/items`);
      expect([200, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });
  });

  // ~DELETE TESTS~
  describe('DELETE /api/spells/:id/items/:item_id', () => {
    it('should delete the association between the test spell and item', async () => {
      const res = await request(app).delete(`/api/spells/${testSpell.id}/items/${testItem.id}`);
      expect([200, 404]).toContain(res.statusCode);
    });
  });

  describe('DELETE /api/spells/:id/items', () => {
    it('should delete all associations between the test spell and items', async () => {
      const itemAssIIRes = await request(app)
        .post(`/api/spells/${testSpell.id}/items`)
        .send(testItemAssocII);
      const itemAssIIIRes = await request(app)
        .post(`/api/spells/${testSpell.id}/items`)
        .send(testItemAssocIII);
      const res = await request(app).delete(`/api/spells/${testSpell.id}/items`);
      expect([200, 404]).toContain(res.statusCode);
    });
  });

  // ~~BUSINESS LOGIC TESTS~~

  // ~~AUX TESTS~~
  describe('unknown field test', () => {
    it('should reject an item association with an additional field', async () => {
      const fuckedItemAss = {
        ...testItemAssoc,
        casts: 22
      }
      const res = await request(app)
        .post(`/api/spells/${testSpell.id}/items`)
        .send(fuckedItemAss);
      // make sure that the item association entity does not include a casts field
      expect(Object.keys(entities.ItemSpell)).not.toContain('casts');
      expect([400]).toContain(res.statusCode);
    });
  });

  describe('valid item id test', () => {
    it('should reject an item association with an invalid id', async () => {
      const invalidItemAss = {
        item_id: 'bad Item 1d'
      };
      const res = await request(app)
        .post(`/api/spells/${testSpell.id}/items`)
        .send(invalidItemAss);
      expect([400]).toContain(res.statusCode);
    });
  });

});
