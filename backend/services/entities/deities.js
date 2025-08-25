// services/entities/deities.js
// Centralized logic for managing deity CRUD and queries
const dbUtils = require('../../utils/dbUtils');

const TABLE = 'deities';

// Create a new deity
function createDeity(deity) {
  return dbUtils.insert(TABLE, deity);
}

// Get all deities
function getAllDeities() {
  return dbUtils.select(TABLE);
}

// Get a deity by id
function getDeityById(id) {
  return dbUtils.select(TABLE, { id }, true);
}

// Update a deity (full update)
function updateDeity(id, deity) {
  // Only update allowed fields (excluding id)
  const allowed = ['name', 'pantheon', 'alignment', 'short_description', 'long_explanation'];
  const updates = {};
  for (const key of allowed) {
    if (deity[key] !== undefined) updates[key] = deity[key];
  }
  return dbUtils.update(TABLE, { id }, updates);
}

// Patch (partial update) a deity
function patchDeity(id, updates) {
  const allowed = ['name', 'pantheon', 'alignment', 'short_description', 'long_explanation'];
  const filtered = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));
  return dbUtils.update(TABLE, { id }, filtered);
}

// Delete a deity
function deleteDeity(id) {
  return dbUtils.remove(TABLE, { id });
}

module.exports = {
  createDeity,
  getAllDeities,
  getDeityById,
  updateDeity,
  patchDeity,
  deleteDeity,
};
