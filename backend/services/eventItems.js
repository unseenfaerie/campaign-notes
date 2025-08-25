
// services/eventItems.js
// Centralized logic for managing event-item relationships
const dbUtils = require('../utils/dbUtils');

const TABLE = 'event_items';

function addEventItem(event_id, item_id, short_description, long_explanation) {
  return dbUtils.insert(TABLE, { event_id, item_id, short_description, long_explanation });
}

function getItemsForEvent(event_id) {
  return dbUtils.select(TABLE, { event_id });
}

function getEventItem(event_id, item_id) {
  return dbUtils.selectOne ? dbUtils.selectOne(TABLE, { event_id, item_id }) : dbUtils.select(TABLE, { event_id, item_id }, true);
}

function updateEventItem(event_id, item_id, updates) {
  const allowed = ['short_description', 'long_explanation'];
  const filtered = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));
  if (Object.keys(filtered).length === 0) {
    return Promise.resolve({ event_id, item_id, message: "no updates made" });
  }
  return dbUtils.update(TABLE, { event_id, item_id }, filtered);
}

function removeEventItem(event_id, item_id) {
  return dbUtils.remove(TABLE, { event_id, item_id });
}

module.exports = {
  addEventItem,
  getItemsForEvent,
  getEventItem,
  updateEventItem,
  removeEventItem
};
