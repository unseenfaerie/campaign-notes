// services/characterDeities.js
// Centralized logic for managing character-deity relationships
const dbUtils = require('../../utils/dbUtils');

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

// Update a character-deity relationship
function updateCharacterDeity(character_id, deity_id, updates) {
  const allowed = ['short_description', 'long_explanation'];
  const filtered = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));
  return dbUtils.update(TABLE, { character_id, deity_id }, filtered);
}

// Remove a character-deity relationship
function removeCharacterDeity(character_id, deity_id) {
  return dbUtils.remove(TABLE, { character_id, deity_id });
}

module.exports = {
  addCharacterDeity,
  updateCharacterDeity,
  removeCharacterDeity,
  getDeitiesForCharacter,
  getCharactersForDeity,
  getCharacterDeity
};