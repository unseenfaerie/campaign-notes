// services/joinTables/eventDeities.js
const relationshipJoinTableService = require('../relationshipJoinTableService');

const TABLE = 'event_deities';
const MAIN_ID = 'event_id';
const RELATED_ID = 'deity_id';

// Create
function addEventDeity(data) {
  // data: { event_id, deity_id, ...metadata }
  return relationshipJoinTableService.createLinkage(TABLE, data);
}

// Read
function getDeitiesForEvent(event_id) {
  // All deities for an event
  return relationshipJoinTableService.getLinkagesById(TABLE, MAIN_ID, event_id);
}

function getEventsForDeity(deity_id) {
  // All events for a deity
  return relationshipJoinTableService.getLinkagesById(TABLE, RELATED_ID, deity_id);
}

function getEventDeity(event_id, deity_id) {
  // Get a specific event-deity link
  return relationshipJoinTableService.getLinkage(TABLE, { [MAIN_ID]: event_id, [RELATED_ID]: deity_id });
}

// Update
function patchEventDeity(event_id, deity_id, updates) {
  // Patch a specific event-deity link
  return relationshipJoinTableService.patchLinkage(TABLE, { [MAIN_ID]: event_id, [RELATED_ID]: deity_id }, updates);
}

// Delete
function removeEventDeity(event_id, deity_id) {
  // Remove a specific event-deity link
  return relationshipJoinTableService.deleteLinkage(TABLE, { [MAIN_ID]: event_id, [RELATED_ID]: deity_id });
}

function removeDeitiesFromEvent(event_id) {
  // Remove all deities from an event
  return relationshipJoinTableService.deleteAllLinkages(TABLE, { [MAIN_ID]: event_id });
}

function removeEventsFromDeity(deity_id) {
  // Remove all events from a deity
  return relationshipJoinTableService.deleteAllLinkages(TABLE, { [RELATED_ID]: deity_id });
}

module.exports = {
  // Create
  addEventDeity,
  // Read
  getDeitiesForEvent,
  getEventsForDeity,
  getEventDeity,
  // Update
  patchEventDeity,
  // Delete
  removeEventDeity,
  removeDeitiesFromEvent,
  removeEventsFromDeity
};
