const dbUtils = require('../../utils/dbUtils');
const serviceUtils = require('../../utils/serviceUtils');
const fullEntityService = require('../fullEntityService');

const TABLE = 'characters';

function createCharacter(character) {
  return dbUtils.insert(TABLE, character);
}

function getAllCharacters() {
  return dbUtils.select(TABLE);
}

function getCharacterById(id) {
  return dbUtils.select(TABLE, { id }, true);
}

async function getFullCharacterById(id) {
  return fullEntityService.getFullEntityById('Character', id);
}

function patchCharacter(id, updates) {
  return serviceUtils.updateWithChangedFields(TABLE, { id }, updates);
}

function deleteCharacter(id) {
  return dbUtils.remove(TABLE, { id });
}

module.exports = {
  createCharacter,
  getAllCharacters,
  getCharacterById,
  patchCharacter,
  deleteCharacter,
  getFullCharacterById
};