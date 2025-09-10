const entityDataService = require('../../entityDataService');
const fullEntityService = require('../fullEntityService');

function createPlace(place) {
  return entityDataService.createEntity('Place', place);
}

function getAllPlaces() {
  return entityDataService.getAllEntities('Place');
}

function getPlaceById(id) {
  return entityDataService.getEntityById('Place', id);
}

function getFullPlaceById(id) {
  return fullEntityService.getFullEntityById('Place', id);
}

function patchPlace(id, updates) {
  return entityDataService.patchEntity('Place', id, updates);
}

function deletePlace(id) {
  return entityDataService.deleteEntity('Place', id);
}

module.exports = {
  createPlace,
  getAllPlaces,
  getPlaceById,
  getFullPlaceById,
  patchPlace,
  deletePlace,
};
