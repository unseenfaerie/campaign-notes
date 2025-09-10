// services/joinTables/eventItems.js
const relationshipJoinTableService = require('../relationshipJoinTableService');


function addEventItem(linkage) {
  // linkage: { event_id, item_id, short_description, long_explanation }
  return relationshipJoinTableService.createLinkage('event_items', linkage);
}

function getItemsForEvent(event_id) {
  return relationshipJoinTableService.getLinkagesById('event_items', 'event_id', event_id);
}

function getEventsForItem(item_id) {
  return relationshipJoinTableService.getLinkagesById('event_items', 'item_id', item_id);
}


function getEventItem(linkage) {
  // linkage: { event_id, item_id }
  return relationshipJoinTableService.getLinkage('event_items', linkage);
}


function patchEventItem(linkage, updates) {
  // linkage: { event_id, item_id }
  return relationshipJoinTableService.patchLinkage('event_items', linkage, updates);
}


function removeEventItem(linkage) {
  // linkage: { event_id, item_id }
  return relationshipJoinTableService.deleteLinkage('event_items', linkage);
}

module.exports = {
  addEventItem,
  getItemsForEvent,
  getEventItem,
  patchEventItem,
  removeEventItem,
  getEventsForItem
};
