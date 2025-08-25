// services/eventPlaces.js
// Centralized logic for managing event-place relationships
const dbUtils = require('../utils/dbUtils');

const TABLE = 'event_places';

function addEventPlace(event_id, place_id, short_description, long_explanation) {
  return dbUtils.insert(TABLE, { event_id, place_id, short_description, long_explanation });
}

function getPlacesForEvent(event_id) {
  return dbUtils.select(TABLE, { event_id });
}

function getEventPlace(event_id, place_id) {
  return dbUtils.selectOne(TABLE, { event_id, place_id });
}

function updateEventPlace(event_id, place_id, updates) {
  return dbUtils.update(TABLE, { event_id, place_id }, updates);
}

function removeEventPlace(event_id, place_id) {
  return dbUtils.remove(TABLE, { event_id, place_id });
}

module.exports = {
  addEventPlace,
  getPlacesForEvent,
  getEventPlace,
  updateEventPlace,
  removeEventPlace
};
