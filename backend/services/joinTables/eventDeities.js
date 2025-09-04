// services/joinTables/eventDeities.js
const dbUtils = require('../../utils/dbUtils');
const { updateWithChangedFields } = require('../../utils/serviceUtils');

const TABLE = 'event_deities';

function addEventDeity(event_id, deity_id, short_description, long_explanation) {
  return dbUtils.insert(TABLE, { event_id, deity_id, short_description, long_explanation });
}

function getDeitiesForEvent(event_id) { return dbUtils.select(TABLE, { event_id }); }

function getEventsForDeity(deity_id) { return dbUtils.select(TABLE, { deity_id }); }

function getEventDeity(event_id, deity_id) { return dbUtils.select(TABLE, { event_id, deity_id }, true); }

function patchEventDeity(event_id, deity_id, updates) {
  return updateWithChangedFields(TABLE, { event_id, deity_id }, updates);
}

function removeEventDeity(event_id, deity_id) { return dbUtils.remove(TABLE, { event_id, deity_id }); }

module.exports = {
  addEventDeity,
  getDeitiesForEvent,
  getEventsForDeity,
  getEventDeity,
  patchEventDeity,
  removeEventDeity
};
