const request = require('supertest');
const app = require('../../../server');
const entities = require('../../../../common/entities');

describe('Character API', () => {
  // Test data for creating a character
  const testCharacter = {
    id: 'jestar-morningstar',
    type: 'pc',
    name: 'Jestar the Morningstar',
    class: 'Wizard',
    level: '5',
    alignment: 'Neutral Good',
    strength: 10,
    dexterity: 12,
    constitution: 14,
    intelligence: 18,
    wisdom: 13,
    charisma: 8,
    total_health: 30,
    deceased: 0,
    short_description: 'Jestar seeks magical power.',
    long_explanation: 'Created by Jest for API testing.'
  };

  const testItem = {
    id: 'elven-dagger',
    name: 'Indistinct Elven Dagger',
    short_description: 'Contains the very heart of the Morningstar.'
  };

  const testItemAssoc = {
    character_id: 'jestar-morningstar',
    item_id: 'elven-dagger',
    acquired_date: 'sep-11-198',
    short_description: 'Given to him by the universe.'
  };

  afterAll(async () => {
    // Clean up test character
    await request(app).delete(`/api/characters/${testCharacter.id}`);
    await request(app).delete(`/api/characters/${testCharacter.id}/items`);
    await request(app).delete(`/api/items/${testItem.id}`);
  });

  // ~CREATE TESTS~
  describe('POST /api/characters', () => {
    it('should create a new character', async () => {
      const res = await request(app)
        .post('/api/characters')
        .send(testCharacter);
      expect([201, 409]).toContain(res.statusCode); // 409 if already exists
      expect(res.body).toBeDefined();
    });
  });

  // ~READ TESTS~
  describe('GET /api/characters', () => {
    it('should return all characters', async () => {
      const res = await request(app).get('/api/characters');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/characters/:id', () => {
    it('should return the test character', async () => {
      const res = await request(app).get(`/api/characters/${testCharacter.id}`);
      expect([200, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body.id).toBe(testCharacter.id);
      }
    });
  });

  // note: this test will create an item and associate it to the test character as defined above.
  describe('GET /api/characters/:id/full', () => {
    it('should return full details for the test character', async () => {
      await request(app).post(`/api/items`).send(testItem);
      await request(app).post(`/api/${testCharacter.id}/items`).send(testItemAssoc);
      const res = await request(app).get(`/api/characters/${testCharacter.id}/full`);
      expect([200, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body.id).toBe(testCharacter.id);
        expect(res.body.items.length).toBeDefined;
      }
    });
  });

  // ~UPDATE TESTS~
  describe('PATCH /api/characters/:id', () => {
    it('should update the test character', async () => {
      const res = await request(app)
        .patch(`/api/characters/${testCharacter.id}`)
        .send({ level: '6' });
      expect([200, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body.level).toBe('6');
      }
    });
  });

  // ~DELETE TESTS~
  describe('DELETE /api/characters/:id', () => {
    it('should delete the test character', async () => {
      const res = await request(app).delete(`/api/characters/${testCharacter.id}`);
      expect([200, 404]).toContain(res.statusCode);
    });
  });

  // ~~AUX TESTS~~
  describe('unknown field test', () => {
    it('should reject a character with an additional stat', async () => {
      const fuckedCharacter = {
        ...testCharacter,
        comeliness: 22
      }
      const res = await request(app)
        .post('/api/characters')
        .send(fuckedCharacter);
      // make sure that the character entity does not include a comeliness field
      expect(Object.keys(entities.Character)).not.toContain('comeliness');
      expect([400]).toContain(res.statusCode);
    });
  });

  describe('valid id test', () => {
    it('should reject a character with an invalid id', async () => {
      const invalidCharacter = {
        ...testCharacter,
        id: 'bad Character 1d'
      }
      const res = await request(app)
        .post('/api/characters')
        .send(invalidCharacter);
      expect([400]).toContain(res.statusCode);
    });
  });

});
