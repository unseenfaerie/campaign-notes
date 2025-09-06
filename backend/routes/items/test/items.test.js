const request = require('supertest');
const app = require('../../../server');
const entities = require('../../../../common/entities');

describe('Item API', () => {
  // Test data for creating an item
  const testItem = {
    id: 'rose-glitter-dildo',
    name: 'Rose Glitter Dildo',
    short_description: 'A softly glistening enchanted dildo.',
    long_explanation: 'Created in the early days of time, this dildo remains as a mythical item of pleasure.'
  };

  const testChar = {
    id: 'peach-daisycutter',
    type: 'npc',
    name: 'Peach Daisycutter',
    deceased: 0,
    short_description: 'A frisky gardener.'
  };

  const testSpell = {
    id: 'enliven',
    type: 'arcane',
    name: 'Enliven',
    level: 3,
    school: 'enchantment',
    casting_time: '1 segment',
    range: '30 feet',
    components: 'V, S',
    duration: '1 hour per Druid level of caster.',
    description: 'You imbue a nearby vine, root, or other umm... such appendages with vitality and vigor and it becomes subject to your whims.'
  };

  const testCharAssoc = {
    character_id: testChar.id,
    acquired_date: 'sep-11-224',
    short_description: 'Peach digs up the shiny dildo in her back garden.'
  };

  const testSpellAssoc = {
    spell_id: testSpell.id
  };

  afterAll(async () => {
    // Clean up test item and associated data
    await request(app).delete(`/api/items/${testItem.id}/characters`);
    await request(app).delete(`/api/items/${testItem.id}/spells`);
    await request(app).delete(`/api/characters/${testChar.id}`);
    await request(app).delete(`/api/spells/${testSpell.id}`);
    await request(app).delete(`/api/items/${testItem.id}`);
  });

  // ...setup for tests...
  beforeAll(async () => {
    const charRes = await request(app).post('/api/characters').send(testChar);
    const spellRes = await request(app).post('/api/spells').send(testSpell);
    // if (charRes.statusCode !== 201) throw new Error('Character setup failed');
    // if (spellRes.statusCode !== 201) throw new Error('Spell setup failed');
  });

  // ~CREATE TESTS~
  describe('create a item', () => {
    it('should create a new item', async () => {
      const res = await request(app)
        .post('/api/items')
        .send(testItem);
      expect([201, 409]).toContain(res.statusCode); // 409 if already exists
      expect(res.body).toBeDefined();
    });
  });

  // ~READ TESTS~
  describe('read all items', () => {
    it('should return all items', async () => {
      const res = await request(app).get('/api/items');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('should get a single item', () => {
    it('should return the test item', async () => {
      const res = await request(app).get(`/api/items/${testItem.id}`);
      expect([200, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body.id).toBe(testItem.id);
      }
    });
  });

  // note: this test will create an item and associate it to the test character as defined above.
  describe('get a item in full detail', () => {
    it('should return full details for the test item', async () => {
      const charAssRes = await request(app).post(`/api/items/${testItem.id}/characters`).send(testCharAssoc);
      const spellAssRes = await request(app).post(`/api/items/${testItem.id}/spells`).send(testSpellAssoc);
      const res = await request(app).get(`/api/items/${testItem.id}/full`);
      expect([200]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body.id).toBe(testItem.id);
        expect(res.body.characters[0].id).toBe(testChar.id);
        expect(res.body.spells[0].id).toBe(testSpell.id);
      }
    });
  });

  // ~UPDATE TESTS~
  describe('update a single item', () => {
    it('should update the test item', async () => {
      const res = await request(app)
        .patch(`/api/items/${testItem.id}`)
        .send({ short_description: 'Updated Item Desc.' });
      expect([200, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body.short_description).toBe('Updated Item Desc.');
      }
    });
  });

  // ~DELETE TESTS~
  describe('delete a item', () => {
    it('should delete the test item', async () => {
      const res = await request(app).delete(`/api/items/${testItem.id}`);
      expect([200, 404]).toContain(res.statusCode);
    });
  });

  // ~~AUX TESTS~~
  describe('unknown field test', () => {
    it('should reject a item with an additional stat', async () => {
      const fuckedItem = {
        ...testItem,
        melting_point: 5001
      }
      const res = await request(app)
        .post('/api/items')
        .send(fuckedItem);
      // make sure that the item entity does not include a melting_point field
      expect(Object.keys(entities.Item)).not.toContain('melting_point');
      expect([400, 500]).toContain(res.statusCode);
    });
  });

  describe('valid id test', () => {
    it('should reject a item with an invalid id', async () => {
      const invalidItem = {
        ...testItem,
        id: 'bad Item 1d'
      }
      const res = await request(app)
        .post('/api/items')
        .send(invalidItem);
      expect([400]).toContain(res.statusCode);
    });
  });

});