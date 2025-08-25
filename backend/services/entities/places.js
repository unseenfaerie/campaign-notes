// services/entities/places.js
// Centralized logic for managing place CRUD and queries
const dbUtils = require('../../utils/dbUtils');

const TABLE = 'places';

// Create a new place
function createPlace(place) {
  return dbUtils.insert(TABLE, place);
}

// Get all places
function getAllPlaces() {
  return dbUtils.select(TABLE);
}

// Get a place by id
function getPlaceById(id) {
  return dbUtils.select(TABLE, { id }, true);
}

// Update a place (full update)
function updatePlace(id, place) {
  // Only update allowed fields (excluding id)
  const allowed = ['name', 'type', 'parent_id', 'short_description', 'long_explanation'];
  const updates = {};
  for (const key of allowed) {
    if (place[key] !== undefined) updates[key] = place[key];
  }
  return dbUtils.update(TABLE, { id }, updates);
}

// Patch (partial update) a place
function patchPlace(id, updates) {
  const allowed = ['name', 'type', 'parent_id', 'short_description', 'long_explanation'];
  const filtered = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));
  return dbUtils.update(TABLE, { id }, filtered);
}

// Delete a place
function deletePlace(id) {
  return dbUtils.remove(TABLE, { id });
}

module.exports = {
  createPlace,
  getAllPlaces,
  getPlaceById,
  updatePlace,
  patchPlace,
  deletePlace,
};
