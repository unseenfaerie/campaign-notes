const entityDataService = require('../../entityDataService');
const fullEntityService = require('../fullEntityService');

function createDeity(deity) {
  return entityDataService.createEntity('Deity', deity);
}

function getAllDeities() {
  return entityDataService.getAllEntities('Deity');
}

function getDeityById(id) {
  return entityDataService.getEntityById('Deity', id);
}

function getFullDeityById(id) {
  return fullEntityService.getFullEntityById('Deity', id);
}

function patchDeity(id, updates) {
  return entityDataService.patchEntity('Deity', id, updates);
}

function deleteDeity(id) {
  return entityDataService.deleteEntity('Deity', id);
}

module.exports = {
  createDeity,
  getAllDeities,
  getDeityById,
  patchDeity,
  deleteDeity,
  getFullDeityById
};
