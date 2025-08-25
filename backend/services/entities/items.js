const dbUtils = require('../../utils/dbUtils');

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

function updateItem(id, item) {
  const allowed = ['name', 'short_description', 'long_explanation'];
  const updates = {};
  for (const key of allowed) {
    if (item[key] !== undefined) updates[key] = item[key];
  }
  return dbUtils.update(TABLE, { id }, updates);
}

function patchItem(id, updates) {
  const allowed = ['name', 'short_description', 'long_explanation'];
  const filtered = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));
  return dbUtils.update(TABLE, { id }, filtered);
}

function deleteItem(id) {
  return dbUtils.remove(TABLE, { id });
}

module.exports = {
  createItem,
  getAllItems,
  getItemById,
  updateItem,
  patchItem,
  deleteItem
};
