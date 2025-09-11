const entityDataService = require('../entityDataService');
const fullEntityService = require('../fullEntityService');

function createCharacter(character) {
  return entityDataService.createEntity('Character', character);
}

function getAllCharacters() {
  return entityDataService.getAllEntities('Character');
}

function getCharacterById(id) {
  return entityDataService.getEntityById('Character', id);
}

function getFullCharacterById(id) {
  return fullEntityService.getFullEntityById('Character', id);
}

function patchCharacter(id, updates) {
  return entityDataService.patchEntity('Character', id, updates);
}

function deleteCharacter(id) {
  return entityDataService.deleteEntity('Character', id);
}

module.exports = {
  createCharacter,
  getAllCharacters,
  getCharacterById,
  patchCharacter,
  deleteCharacter,
  getFullCharacterById
};