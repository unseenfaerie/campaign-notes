const dbUtils = require('../../utils/dbUtils');
const serviceUtils = require('../../utils/serviceUtils');
const fullEntityService = require('../fullEntityService');

const TABLE = 'places';

function createPlace(place) {
  return dbUtils.insert(TABLE, place);
}

function getAllPlaces() {
  return dbUtils.select(TABLE);
}

function getPlaceById(id) {
  return dbUtils.select(TABLE, { id }, true);
}

async function getFullPlaceById(id) {
  return fullEntityService.getFullEntityById('Place', id);
}

function patchPlace(id, updates) {
  return serviceUtils.updateWithChangedFields(TABLE, { id }, updates);
}

function deletePlace(id) {
  return dbUtils.remove(TABLE, { id });
}

module.exports = {
  createPlace,
  getAllPlaces,
  getPlaceById,
  getFullPlaceById,
  patchPlace,
  deletePlace,
};
