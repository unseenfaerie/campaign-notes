const request = require('supertest');
const app = require('../../../server');
const entities = require('../../../../common/entities');

describe('Item - Character API', () => {
  // Test data for creating a character association to an item

  const testItem = {
    id: 'smooth-ring',
    name: 'Smooth Ring',
    short_description: 'A dark swirling ring with an eerie red glow. It feels electric.'
  };

  const testItemII = {
    id: 'slick-ring',
    name: 'Slick Ring',
    short_description: 'A ruby ring with a soft blue glow. It feels slippery to the touch.'
  };

  const testItemIII = {
    id: 'clear-ring',
    name: 'Clear Ring',
    short_description: 'A transparent ring that shimmers with a faint light. It feels virtuous.'
  };

  const testCharacter = {
    id: 'test-character-alpha',
    type: 'npc',
    name: 'Test Character Alpha',
    deceased: 0,
    short_description: 'A test character for association with items.'
  };

  const testCharacterAssoc = {
    character_id: 'test-character-alpha',
    acquired_date: 'may-12-225',
    short_description: 'A test character association with an item.'
  };

  afterAll(async () => {
    // Clean up test items and characters
    await request(app).delete(`/api/items/${testItem.id}/characters`);
    await request(app).delete(`/api/characters/${testCharacter.id}`);
    await request(app).delete(`/api/items/${testItem.id}`);
    await request(app).delete(`/api/items/${testItemII.id}`);
    await request(app).delete(`/api/items/${testItemIII.id}`);
  });

  beforeAll(async () => {
    // Create test character and items before running tests
    await request(app).post('/api/characters').send(testCharacter);
    await request(app).post('/api/items').send(testItem);
    await request(app).post('/api/items').send(testItemII);
    await request(app).post('/api/items').send(testItemIII);
  });

  // ~CREATE TESTS~
  describe('POST /api/items/:id/characters', () => {
    it('should associate a character to an item', async () => {
      const res = await request(app)
        .post(`/api/items/${testItem.id}/characters`)
        .send(testCharacterAssoc);
      expect([201, 409]).toContain(res.statusCode); // 409 if already exists
      expect(res.body).toBeDefined();
    });
  });

  // ~READ TESTS~
  describe('GET /api/items/:id/characters', () => {
    it('should return all characters associated with an item', async () => {
      const res = await request(app).get(`/api/items/${testItem.id}/characters`);
      expect([200, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(Array.isArray(res.body)).toBe(true);
      }
    });
  });

  // ~DELETE TESTS~
  describe('DELETE /api/items/:id/characters/:character_id', () => {
    it('should delete the association between the test item and character', async () => {
      const res = await request(app).delete(`/api/items/${testItem.id}/characters/${testCharacter.id}`);
      expect([200, 404]).toContain(res.statusCode);
    });
  });

  describe('DELETE /api/items/:id/characters', () => {
    it('should delete all associations between the test item and characters', async () => {
      const res = await request(app).delete(`/api/items/${testItem.id}/characters`);
      expect([200, 404]).toContain(res.statusCode);
    });
  });

  // ~~BUSINESS LOGIC TESTS~~

  // ~~AUX TESTS~~
  describe('unknown field test', () => {
    it('should reject a character association with an additional field', async () => {
      const fuckedCharacterAss = {
        ...testCharacterAssoc,
        rating: 22
      }
      const res = await request(app)
        .post(`/api/items/${testItem.id}/characters`)
        .send(fuckedCharacterAss);
      // make sure that the item association entity does not include a rating field
      expect(Object.keys(entities.CharacterItem)).not.toContain('rating');
      expect([400]).toContain(res.statusCode);
    });
  });

  describe('valid item id test', () => {
    it('should reject an item association with an invalid id', async () => {
      const invalidCharacterAss = {
        character_id: 'bad Character 1d'
      };
      const res = await request(app)
        .post(`/api/items/${testItem.id}/characters`)
        .send(invalidCharacterAss);
      expect([400]).toContain(res.statusCode);
    });
  });

});