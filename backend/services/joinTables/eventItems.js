// services/joinTables/eventItems.js
const relationshipJoinTableService = require('../relationshipJoinTableService');

function addEventItem(event_id, item_id, short_description, long_explanation) {
  return relationshipJoinTableService.createLinkage('event_items', {
    event_id,
    item_id,
    short_description,
    long_explanation
  });
}

function getItemsForEvent(event_id) {
  return relationshipJoinTableService.getLinkagesById('event_items', 'event_id', event_id);
}

function getEventsForItem(item_id) {
  return relationshipJoinTableService.getLinkagesById('event_items', 'item_id', item_id);
}

function getEventItem(event_id, item_id) {
  return relationshipJoinTableService.getLinkage('event_items', { event_id, item_id });
}

function patchEventItem(event_id, item_id, updates) {
  return relationshipJoinTableService.patchLinkage('event_items', { event_id, item_id }, updates);
}

function removeEventItem(event_id, item_id) {
  return relationshipJoinTableService.deleteLinkage('event_items', { event_id, item_id });
}

module.exports = {
  addEventItem,
  getItemsForEvent,
  getEventItem,
  patchEventItem,
  removeEventItem,
  getEventsForItem
};
