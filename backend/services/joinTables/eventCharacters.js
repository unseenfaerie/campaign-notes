// services/eventCharacters.js
// Centralized logic for managing event-character relationships
const relationshipJoinTableService = require('../relationshipJoinTableService');

const tableName = 'event_characters';

// Create a new event-character association
function addEventCharacter(linkage) {
  // linkage: { event_id, character_id, short_description, long_explanation }
  return relationshipJoinTableService.createLinkage(tableName, linkage);
}

// Get all events for a character (join table only)
function getEventsForCharacter(character_id) {
  return relationshipJoinTableService.getLinkagesById(tableName, 'character_id', character_id);
}

// Get all characters for an event (join table only)
function getCharactersForEvent(event_id) {
  return relationshipJoinTableService.getLinkagesById(tableName, 'event_id', event_id);
}

// Get a specific event-character relationship (with join table metadata)
function getEventCharacter(linkage) {
  // linkage: { event_id, character_id }
  return relationshipJoinTableService.getLinkage(tableName, linkage);
}

// Patch a specific event-character relationship
function patchEventCharacter(linkage, updates) {
  // linkage: { event_id, character_id }
  return relationshipJoinTableService.patchLinkage(tableName, linkage, updates);
}


// Delete a specific event-character relationship
function removeEventCharacter(linkage) {
  // linkage: { event_id, character_id }
  return relationshipJoinTableService.deleteLinkage(tableName, linkage);
}

// Remove all events from a character
function removeEventsFromCharacter(character_id) {
  return relationshipJoinTableService.deleteAllLinkages(tableName, { character_id });
}

// Remove all characters from an event
function removeCharactersFromEvent(event_id) {
  return relationshipJoinTableService.deleteAllLinkages(tableName, { event_id });
}

module.exports = {
  // Create
  addEventCharacter,
  // Read
  getEventsForCharacter,
  getCharactersForEvent,
  getEventCharacter,
  // Update
  patchEventCharacter,
  // Delete
  removeEventCharacter,
  removeEventsFromCharacter,
  removeCharactersFromEvent
};