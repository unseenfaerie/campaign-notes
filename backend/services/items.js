const dbUtils = require('../utils/dbUtils');

const TABLE = 'items';

// Create a new item
function createItem(item) {
  return dbUtils.insert(TABLE, item);
}

// Get all items
function getAllItems() {
  return dbUtils.select(TABLE);
}

// Get an item by id
function getItemById(id) {
  return dbUtils.select(TABLE, { id }, true);
}

// Update an item (full update)
function updateItem(id, item) {
  // Only update allowed fields (excluding id)
  const allowed = ['name', 'short_description', 'long_explanation'];
  const updates = {};
  for (const key of allowed) {
    if (item[key] !== undefined) updates[key] = item[key];
  }
  return dbUtils.update(TABLE, { id }, updates);
}

// Patch (partial update) an item
function patchItem(id, updates) {
  const allowed = ['name', 'short_description', 'long_explanation'];
  const filtered = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));
  return dbUtils.update(TABLE, { id }, filtered);
}

// Delete an item
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