const request = require('supertest');
const app = require('../../../server');

// ~TEST DATA~
const testCharacter = {
  id: 'mario-luigicus',
  type: 'pc',
  name: 'Mario Luigicus',
  class: 'Wizard',
  level: '6',
  alignment: 'Neutral Evil',
  strength: 9,
  dexterity: 12,
  constitution: 14,
  intelligence: 18,
  wisdom: 7,
  charisma: 8,
  total_health: 30,
  deceased: 0,
  short_description: 'Mario seeks a patron.',
  long_explanation: 'Created by Jest for API testing.'
};

const testDeity = {
  id: 'jestar-ascended',
  name: 'Jestar the Ascended',
  pantheon: 'Main Human',
  alignment: 'True Neutral',
  short_description: 'Once a mortal, now a god.',
  long_explanation: 'Created by Jest for API testing, Jestar has exceeded all bounds. Now he embodies the peak of all magical power.'
};

const testDeityII = {
  id: 'testax',
  name: 'Testax',
  pantheon: 'Main Human',
  alignment: 'Neutral Evil',
  short_description: 'Testax, god of Automated Testing',
  long_explanation: 'Created by Jestar the Ascended to watch over the realm of automated tests.'
};

const testDeityAssoc = {
  deity_id: 'jestar-ascended',
  adopted_date: 'jan-09-198',
  short_description: 'Mario discovers the dark powers offered by Jestar.'
}

const testDeityAssocII = {
  deity_id: 'testax',
  adopted_date: 'jun-20-200',
  short_description: 'Mario learns of Testax and delves into his holy texts.'
}

describe('Character/Deity API', () => {

  // ~SETUP & TEARDOWN~
  beforeAll(async () => {
    await request(app).post(`/api/characters/`).send(testCharacter);
    await request(app).post(`/api/deities/`).send(testDeity);
    await request(app).post(`/api/deities/`).send(testDeityII);
  });

  afterAll(async () => {
    await request(app).delete(`/api/characters/${testCharacter.id}/deities`);
    await request(app).delete(`/api/deities/${testDeity.id}`);
    await request(app).delete(`/api/deities/${testDeityII.id}`);
    await request(app).delete(`/api/characters/${testCharacter.id}`);
  });

  // ~CREATE TESTS~
  describe('POST /api/characters/:id/deities', () => {
    it('should associate an deity to a character', async () => {
      const res = await request(app)
        .post(`/api/characters/${testCharacter.id}/deities`)
        .send(testDeityAssoc);
      const resII = await request(app)
        .post(`/api/characters/${testCharacter.id}/deities`)
        .send(testDeityAssocII);
      expect([201, 409]).toContain(res.statusCode); // 409 if already exists
      expect(res.body).toBeDefined();
    });
  });

  // ~READ TESTS~
  describe('GET /api/characters/:id/deities', () => {
    it('should get all deities for the character', async () => {
      const res = await request(app)
        .get(`/api/characters/${testCharacter.id}/deities`);
      expect([200, 404]).toContain(res.statusCode);
      expect(Array.isArray(res.body) || res.body.error).toBeTruthy();
    });
  });

  describe('GET /api/characters/:id/deities/:deityId', () => {
    it('should get all tenures with a particular deity for the character', async () => {
      const res = await request(app)
        .get(`/api/characters/${testCharacter.id}/deities/${testDeity.id}`);
      expect([200, 404]).toContain(res.statusCode);
      expect(Array.isArray(res.body) || res.body.error).toBeTruthy();
    });
  });

  describe('GET /api/characters/:id/deities/:deityId/:adoptedDate', () => {
    it('should get a specific tenure with a particular deity for the character', async () => {
      const res = await request(app)
        .get(`/api/characters/${testCharacter.id}/deities/${testDeity.id}/${testDeityAssoc.adopted_date}`);
      expect([200, 404]).toContain(res.statusCode);
    });
  });

  // ~UPDATE TESTS~
  describe('PATCH /api/characters/:id/deities/:deityId/:adoptedDate', () => {
    it('should update a deity relationship for this character', async () => {
      const res = await request(app)
        .patch(`/api/characters/${testCharacter.id}/deities/${testDeity.id}/${testDeityAssoc.adopted_date}`)
        .send({ short_description: 'Jestar seduced Mario to the dark side.' });
      expect([200]).toContain(res.statusCode);
    });
  });

  // ~DELETE TESTS~
  describe('DELETE /api/characters/:id/deities/:deityId/:adoptedDate', () => {
    it('should remove all instances of a deity relationship for this character', async () => {
      const res = await request(app)
        .delete(`/api/characters/${testCharacter.id}/deities/${testDeity.id}/${testDeityAssoc.adopted_date}`);
      expect([200]).toContain(res.statusCode);
    });
  });

  describe('DELETE /api/characters/:id/deities/:deityId', () => {
    it('should remove all instances of a deity relationship for this character', async () => {
      const res = await request(app)
        .delete(`/api/characters/${testCharacter.id}/deities/${testDeity.id}`);
      expect([200]).toContain(res.statusCode);
    });
  });

  describe('DELETE /api/characters/:id/deities', () => {
    it('should remove all instances of all deity relationships for this character', async () => {
      const res = await request(app)
        .delete(`/api/characters/${testCharacter.id}/deities`);
      expect([200]).toContain(res.statusCode);
    });
  });
});
