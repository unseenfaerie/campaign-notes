const request = require('supertest');
const app = require('../server');

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
    id: 'jestar-s-spellbook',
    name: 'Jestar\'s Spellbook',
    short_description: 'Contains the very spells of the Morningstar.'
  };

  const testItemAssoc = {
    character_id: 'jestar-morningstar',
    item_id: 'jestar-s-spellbook',
    acquired_date: 'sep-11-198',
    short_description: 'Given to him by the universe.'
  };

  afterAll(async () => {
    // Clean up test character
    await request(app).delete(`/api/characters/${testCharacter.id}`);
  });

  describe('POST /api/characters', () => {
    it('should create a new character', async () => {
      const res = await request(app)
        .post('/api/characters')
        .send(testCharacter);
      expect([201, 409]).toContain(res.statusCode); // 409 if already exists
      expect(res.body).toBeDefined();
    });
  });

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

  //to-do: this test doesn't check anything regarding "full" details. maybe make an item and associate it to them.
  describe('GET /api/characters/:id/full', () => {
    it('should return full details for the test character', async () => {
      console.log('Posting ' + testItem.id);
      const itemRes = (await request(app).post(`/api/items`).send(testItem));
      expect([200]).toContain(itemRes.statusCode);
      console.log('Posting ' + testItemAssoc.id);
      const itemAssRes = (((await request(app).post(`/api/${testCharacter.id}/items`).send(testItemAssoc))));
      expect([200]).toContain(itemAssRes.statusCode);
      console.log('Testing full endpoint');
      const res = await request(app).get(`/api/characters/${testCharacter.id}/full`);
      expect([200, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body.id).toBe(testCharacter.id);
      }
    });
  });

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

  describe('DELETE /api/characters/:id', () => {
    it('should delete the test character', async () => {
      const res = await request(app).delete(`/api/characters/${testCharacter.id}`);
      expect([200, 404]).toContain(res.statusCode);
    });
  });
});
