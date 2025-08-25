
// services/eventDeities.js
// Centralized logic for managing event-deity relationships
const dbUtils = require('../utils/dbUtils');

const TABLE = 'event_deities';

function addEventDeity(event_id, deity_id, short_description, long_explanation) {
  return dbUtils.insert(TABLE, { event_id, deity_id, short_description, long_explanation });
}

function getDeitiesForEvent(event_id) {
  return dbUtils.select(TABLE, { event_id });
}

function getEventDeity(event_id, deity_id) {
  return dbUtils.selectOne ? dbUtils.selectOne(TABLE, { event_id, deity_id }) : dbUtils.select(TABLE, { event_id, deity_id }, true);
}

function updateEventDeity(event_id, deity_id, updates) {
  const allowed = ['short_description', 'long_explanation'];
  const filtered = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));
  if (Object.keys(filtered).length === 0) {
    return Promise.resolve({ event_id, deity_id, message: "no updates made" });
  }
  return dbUtils.update(TABLE, { event_id, deity_id }, filtered);
}

function removeEventDeity(event_id, deity_id) {
  return dbUtils.remove(TABLE, { event_id, deity_id });
}

module.exports = {
  addEventDeity,
  getDeitiesForEvent,
  getEventDeity,
  updateEventDeity,
  removeEventDeity
};
