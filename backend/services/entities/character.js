// services/character.js
// Centralized logic for managing character CRUD and queries
const dbUtils = require('../../utils/dbUtils');
const characterDeities = require('../characterDeities');
const characterItems = require('../characterItems');
const characterOrganizations = require('../characterOrganizations');
const characterRelationships = require('../characterRelationships');

const TABLE = 'characters';

// Create a new character
function createCharacter(character) {
  return dbUtils.insert(TABLE, character);
}

// Get all characters
function getAllCharacters() {
  return dbUtils.select(TABLE);
}

// Get a character by id
function getCharacterById(id) {
  return dbUtils.select(TABLE, { id }, true);
}

// Update a character (full update)
function updateCharacter(id, character) {
  // Only update allowed fields (excluding id)
  const allowed = ['type', 'name', 'class', 'level', 'alignment', 'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'total_health', 'deceased', 'short_description', 'long_explanation'];
  const updates = {};
  for (const key of allowed) {
    if (character[key] !== undefined) updates[key] = character[key];
  }
  return dbUtils.update(TABLE, { id }, updates);
}

// Patch (partial update) a character
function patchCharacter(id, updates) {
  const allowed = ['type', 'name', 'class', 'level', 'alignment', 'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'total_health', 'deceased', 'short_description', 'long_explanation'];
  const filtered = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));
  return dbUtils.update(TABLE, { id }, filtered);
}

// Delete a character
function deleteCharacter(id) {
  return dbUtils.remove(TABLE, { id });
}

// Fetch full character details with all associations
async function getFullCharacterById(id) {
  const [character, deities, items, organizations, relationships] = await Promise.all([
    getCharacterById(id),
    characterDeities.getDeitiesForCharacter(id),
    characterItems.getItemsForCharacter(id),
    characterOrganizations.getOrganizationsForCharacter(id),
    characterRelationships.getRelationshipsForCharacter(id)
  ]);
  if (!character) return null;
  return {
    ...character,
    deities,
    items,
    organizations,
    relationships
  };
}

module.exports = {
  createCharacter,
  getAllCharacters,
  getCharacterById,
  updateCharacter,
  patchCharacter,
  deleteCharacter,
  getFullCharacterById
};