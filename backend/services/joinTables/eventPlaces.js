// services/joinTables/eventPlaces.js
const dbUtils = require('../../utils/dbUtils');
const TABLE = 'event_places';

function addEventPlace(event_id, place_id, short_description, long_explanation) {
  return dbUtils.insert(TABLE, { event_id, place_id, short_description, long_explanation });
}
function getPlacesForEvent(event_id) { return dbUtils.select(TABLE, { event_id }); }
function getEventPlace(event_id, place_id) { return dbUtils.select(TABLE, { event_id, place_id }, true); }
function updateEventPlace(event_id, place_id, updates) {
  const allowed = ['short_description', 'long_explanation'];
  const filtered = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));
  if (Object.keys(filtered).length === 0) {
    return Promise.resolve({ event_id, place_id, message: "no updates made" });
  }
  return dbUtils.update(TABLE, { event_id, place_id }, filtered);
}
function removeEventPlace(event_id, place_id) { return dbUtils.remove(TABLE, { event_id, place_id }); }

module.exports = {
  addEventPlace,
  getPlacesForEvent,
  getEventPlace,
  updateEventPlace,
  removeEventPlace
};
