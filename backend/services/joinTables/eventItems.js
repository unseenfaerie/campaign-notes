// services/joinTables/eventItems.js
const relationshipJoinTableService = require('../relationshipJoinTableService');

const TABLE = 'event_items';
const MAIN_ID = 'event_id';
const RELATED_ID = 'item_id';

// Create
function addEventItem(data) {
  // data: { event_id, item_id, ...metadata }
  return relationshipJoinTableService.createLinkage(TABLE, data);
}

// Read
function getItemsForEvent(event_id) {
  // All items for an event
  return relationshipJoinTableService.getLinkagesById(TABLE, MAIN_ID, event_id);
}

function getEventsForItem(item_id) {
  // All events for an item
  return relationshipJoinTableService.getLinkagesById(TABLE, RELATED_ID, item_id);
}

function getEventItem(event_id, item_id) {
  // Get a specific event-item link
  return relationshipJoinTableService.getLinkage(TABLE, { [MAIN_ID]: event_id, [RELATED_ID]: item_id });
}

// Update
function patchEventItem(event_id, item_id, updates) {
  // Patch a specific event-item link
  return relationshipJoinTableService.patchLinkage(TABLE, { [MAIN_ID]: event_id, [RELATED_ID]: item_id }, updates);
}

// Delete
function removeEventItem(event_id, item_id) {
  // Remove a specific event-item link
  return relationshipJoinTableService.deleteLinkage(TABLE, { [MAIN_ID]: event_id, [RELATED_ID]: item_id });
}

function removeItemsFromEvent(event_id) {
  // Remove all items from an event
  return relationshipJoinTableService.deleteAllLinkages(TABLE, { [MAIN_ID]: event_id });
}

function removeEventsFromItem(item_id) {
  // Remove all events from an item
  return relationshipJoinTableService.deleteAllLinkages(TABLE, { [RELATED_ID]: item_id });
}

module.exports = {
  // Create
  addEventItem,
  // Read
  getItemsForEvent,
  getEventsForItem,
  getEventItem,
  // Update
  patchEventItem,
  // Delete
  removeEventItem,
  removeItemsFromEvent,
  removeEventsFromItem
};
