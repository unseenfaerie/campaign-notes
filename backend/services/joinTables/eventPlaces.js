// services/joinTables/eventPlaces.js
const relationshipJoinTableService = require('../relationshipJoinTableService');

const tableName = 'event_places';

function addEventPlace(linkage) {
  // linkage: { event_id, place_id, short_description, long_explanation }
  return relationshipJoinTableService.createLinkage(tableName, linkage);
}

function getEventsForPlace(place_id) {
  return relationshipJoinTableService.getLinkagesById(tableName, 'place_id', place_id);
}

function getPlacesForEvent(event_id) {
  return relationshipJoinTableService.getLinkagesById(tableName, 'event_id', event_id);
}


function getEventPlace(linkage) {
  // linkage: { event_id, place_id }
  return relationshipJoinTableService.getLinkage(tableName, linkage);
}


function patchEventPlace(linkage, updates) {
  // linkage: { event_id, place_id }
  return relationshipJoinTableService.patchLinkage(tableName, linkage, updates);
}


function removeEventPlace(linkage) {
  // linkage: { event_id, place_id }
  return relationshipJoinTableService.deleteLinkage(tableName, linkage);
}

module.exports = {
  addEventPlace,
  getEventsForPlace,
  getPlacesForEvent,
  getEventPlace,
  patchEventPlace,
  removeEventPlace
};
