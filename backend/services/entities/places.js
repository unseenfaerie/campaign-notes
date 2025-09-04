// services/entities/places.js
// Centralized logic for managing place CRUD and queries
const dbUtils = require('../../utils/dbUtils');
const serviceUtils = require('../../utils/serviceUtils');

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


// Patch (partial update) a place
function patchPlace(id, updates) {
  return serviceUtils.updateWithChangedFields(TABLE, { id }, updates);
}

// Delete a place
function deletePlace(id) {
  return dbUtils.remove(TABLE, { id });
}

module.exports = {
  createPlace,
  getAllPlaces,
  getPlaceById,
  patchPlace,
  deletePlace,
};
