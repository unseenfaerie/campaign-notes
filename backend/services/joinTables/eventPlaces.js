// services/joinTables/eventPlaces.js
const dbUtils = require('../../utils/dbUtils');
const { updateWithChangedFields } = require('../../utils/serviceUtils');
const TABLE = 'event_places';

function addEventPlace(event_id, place_id, short_description, long_explanation) {
  return dbUtils.insert(TABLE, { event_id, place_id, short_description, long_explanation });
}
function getEventsForPlace(place_id) { return dbUtils.select(TABLE, { place_id }); }
function getPlacesForEvent(event_id) { return dbUtils.select(TABLE, { event_id }); }
function getEventPlace(event_id, place_id) { return dbUtils.select(TABLE, { event_id, place_id }, true); }
// Patch an event-place relationship
function patchEventPlace(event_id, place_id, updates) {
  return updateWithChangedFields(TABLE, { event_id, place_id }, updates);
}
function removeEventPlace(event_id, place_id) { return dbUtils.remove(TABLE, { event_id, place_id }); }

module.exports = {
  addEventPlace,
  getEventsForPlace,
  getPlacesForEvent,
  getEventPlace,
  patchEventPlace,
  removeEventPlace
};
