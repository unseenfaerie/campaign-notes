const entityDataService = require('../entityDataService');
const fullEntityService = require('../fullEntityService');

function createItem(data) {
  return entityDataService.createEntity('Item', data);
}

function getAllItems() {
  return entityDataService.getAllEntities('Item');
}

function getItemById(id) {
  return entityDataService.getEntityById('Item', id);
}

function getFullItemById(id) {
  return fullEntityService.getFullEntityById('Item', id);
}

function patchItem(id, updates) {
  return entityDataService.patchEntity('Item', id, updates);
}

function deleteItem(id) {
  return entityDataService.deleteEntity('Item', id);
}

module.exports = {
  createItem,
  getAllItems,
  getItemById,
  getFullItemById,
  patchItem,
  deleteItem
};
