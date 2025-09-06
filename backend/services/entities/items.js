const dbUtils = require('../../utils/dbUtils');
const serviceUtils = require('../../utils/serviceUtils');
const fullEntityService = require('../fullEntityService');

const TABLE = 'items';

function createItem(item) {
  return dbUtils.insert(TABLE, item);
}

function getAllItems() {
  return dbUtils.select(TABLE);
}

function getItemById(id) {
  return dbUtils.select(TABLE, { id }, true);
}

async function getFullItemById(id) {
  return fullEntityService.getFullEntityById('Item', id);
}

function patchItem(id, updates) {
  return serviceUtils.updateWithChangedFields(TABLE, { id }, updates);
}

function deleteItem(id) {
  return dbUtils.remove(TABLE, { id });
}

module.exports = {
  createItem,
  getAllItems,
  getItemById,
  getFullItemById,
  patchItem,
  deleteItem
};
