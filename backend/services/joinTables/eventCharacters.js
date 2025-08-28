// services/eventCharacters.js
// Centralized logic for managing event-character relationships
const dbUtils = require('../../utils/dbUtils');
const serviceUtils = require('../../utils/serviceUtils');

const TABLE = 'event_characters';

// Create a new event-character association
function addEventCharacter(event_id, character_id, short_description, long_explanation) {
  return dbUtils.insert(TABLE, { event_id, character_id, short_description, long_explanation });
}

// Get all events for a character (join table only)
function getEventsForCharacter(character_id) {
  return dbUtils.select(TABLE, { character_id });
}

// Get all characters for an event (join table only)
function getCharactersForEvent(event_id) {
  return dbUtils.select(TABLE, { event_id });
}

// Get a specific event-character relationship (with join table metadata)
function getEventCharacter(event_id, character_id) {
  return dbUtils.select(TABLE, { event_id, character_id }, true);
}

// Update a specific event-character relationship
async function updateEventCharacter(event_id, character_id, updates) {
  return serviceUtils.updateWithChangedFields(
    TABLE,
    { event_id, character_id },
    updates
  );
}

// Delete a specific event-character relationship
function removeEventCharacter(event_id, character_id) {
  return dbUtils.remove(TABLE, { event_id, character_id });
}

module.exports = {
  addEventCharacter,
  updateEventCharacter,
  removeEventCharacter,
  getCharactersForEvent,
  getEventsForCharacter,
  getEventCharacter
};