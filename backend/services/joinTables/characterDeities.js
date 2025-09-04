// services/characterDeities.js
// Centralized logic for managing character-deity relationships
const dbUtils = require('../../utils/dbUtils');
const serviceUtils = require('../../utils/serviceUtils');

const TABLE = 'character_deities';

// Add a character-deity relationship
function addCharacterDeity(character_id, deity_id, short_description = '', long_explanation = '') {
  return dbUtils.insert(TABLE, { character_id, deity_id, short_description, long_explanation });
}

// Get all deities for a character (join table only)
function getDeitiesForCharacter(character_id) {
  return dbUtils.select(TABLE, { character_id });
}

// Get all characters for a deity (join table only)
function getCharactersForDeity(deity_id) {
  return dbUtils.select(TABLE, { deity_id });
}

// Get a specific character-deity relationship (with join table metadata)
function getCharacterDeity(character_id, deity_id) {
  return dbUtils.select(TABLE, { character_id, deity_id }, true);
}

// Patch a character-deity relationship
async function patchCharacterDeity(character_id, deity_id, updates) {
  return serviceUtils.updateWithChangedFields(
    TABLE,
    { character_id, deity_id },
    updates
  );
}

// Remove a character-deity relationship
function removeCharacterDeity(character_id, deity_id) {
  return dbUtils.remove(TABLE, { character_id, deity_id });
}

module.exports = {
  addCharacterDeity,
  patchCharacterDeity,
  removeCharacterDeity,
  getDeitiesForCharacter,
  getCharactersForDeity,
  getCharacterDeity
};