// services/joinTables/eventItems.js
const dbUtils = require('../../utils/dbUtils');
const { updateWithChangedFields } = require('../../utils/serviceUtils');
const TABLE = 'event_items';

function addEventItem(event_id, item_id, short_description, long_explanation) {
  return dbUtils.insert(TABLE, { event_id, item_id, short_description, long_explanation });
}

function getItemsForEvent(event_id) { return dbUtils.select(TABLE, { event_id }); }

function getEventsForItem(item_id) {
  return dbUtils.select(TABLE, { item_id });
}

function getEventItem(event_id, item_id) { return dbUtils.select(TABLE, { event_id, item_id }, true); }

function patchEventItem(event_id, item_id, updates) {
  return updateWithChangedFields(TABLE, { event_id, item_id }, updates);
}

function removeEventItem(event_id, item_id) { return dbUtils.remove(TABLE, { event_id, item_id }); }

module.exports = {
  addEventItem,
  getItemsForEvent,
  getEventItem,
  patchEventItem,
  removeEventItem,
  getEventsForItem
};
