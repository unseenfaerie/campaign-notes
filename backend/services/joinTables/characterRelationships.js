// services/characterRelationships.js
// Centralized logic for managing character-to-character relationships
const historicalJoinTableService = require('../historicalJoinTableService');

const TABLE = 'character_relationships';
const MAIN_ID = 'character_id';
const RELATED_ID = 'related_id';
const DATE_KEY = 'established_date';

// Create
function addCharacterRelationship(data) {
  // data: { character_id, related_id, established_date, ...metadata }
  return historicalJoinTableService.createLinkage(TABLE, data);
}

// Read
function getRelationshipsForCharacter(character_id) {
  // All relationships (all history) for a character
  return historicalJoinTableService.getLinkagesById(TABLE, MAIN_ID, character_id);
}

function getCharacterRelationshipHistory(character_id, related_id) {
  // All history for a character-character pair
  return historicalJoinTableService.getLinkagesByFields(TABLE, { [MAIN_ID]: character_id, [RELATED_ID]: related_id });
}

function getCharacterRelationshipInstance(character_id, related_id, established_date) {
  // Specific instance
  return historicalJoinTableService.getLinkage(TABLE, {
    [MAIN_ID]: character_id,
    [RELATED_ID]: related_id,
    [DATE_KEY]: established_date
  });
}

// Patch
function patchCharacterRelationship(character_id, related_id, established_date, updates) {
  // Patch a specific instance
  return historicalJoinTableService.patchLinkage(TABLE, {
    [MAIN_ID]: character_id,
    [RELATED_ID]: related_id,
    [DATE_KEY]: established_date
  }, updates);
}

// Delete
function removeCharacterRelationshipInstance(character_id, related_id, established_date) {
  // Remove a specific instance
  return historicalJoinTableService.deleteLinkage(TABLE, {
    [MAIN_ID]: character_id,
    [RELATED_ID]: related_id,
    [DATE_KEY]: established_date
  });
}

function removeAllRelationshipsForCharacter(character_id) {
  // Remove all relationships for a character
  return historicalJoinTableService.deleteAllLinkages(TABLE, { [MAIN_ID]: character_id });
}

function removeAllHistoryForCharacterRelationship(character_id, related_id) {
  // Remove all history for a character-character pair
  return historicalJoinTableService.deleteAllLinkages(TABLE, { [MAIN_ID]: character_id, [RELATED_ID]: related_id });
}

module.exports = {
  // Create
  addCharacterRelationship,
  // Read
  getRelationshipsForCharacter,
  getCharacterRelationshipHistory,
  getCharacterRelationshipInstance,
  // Patch
  patchCharacterRelationship,
  // Delete
  removeCharacterRelationshipInstance,
  removeAllRelationshipsForCharacter,
  removeAllHistoryForCharacterRelationship
};