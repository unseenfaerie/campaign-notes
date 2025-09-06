const entityDataService = require('../entityDataService');
const fullEntityService = require('../fullEntityService');
const entityName = 'Item';

function createItem(data) {
  return entityDataService.createEntity(entityName, data);
}

function getAllItems() {
  return entityDataService.getAllEntities(entityName);
}

function getItemById(id) {
  return entityDataService.getEntityById(entityName, id);
}

function getFullItemById(id) {
  return fullEntityService.getFullEntityById(entityName, id);
}

function patchItem(id, updates) {
  return entityDataService.patchEntity(entityName, id, updates);
}

function deleteItem(id) {
  return entityDataService.deleteEntity(entityName, id);
}

module.exports = {
  createItem,
  getAllItems,
  getItemById,
  getFullItemById,
  patchItem,
  deleteItem
};
