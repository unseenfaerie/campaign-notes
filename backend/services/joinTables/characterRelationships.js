// services/characterRelationships.js
// Centralized logic for managing character-to-character relationships
const dbUtils = require('../../utils/dbUtils');
const serviceUtils = require('../../utils/serviceUtils');

const TABLE = 'character_relationships';

// Create a new character-character relationship
function addCharacterRelationship(character_id, related_id, relationship_type, short_description = '', long_explanation = '') {
  return dbUtils.insert(TABLE, { character_id, related_id, relationship_type, short_description, long_explanation });
}

// Update an existing character-character relationship
async function updateCharacterRelationship(character_id, related_id, updates) {
  return serviceUtils.updateWithChangedFields(
    TABLE,
    { character_id, related_id },
    updates
  );
}

// Delete a character-character relationship
function removeCharacterRelationship(character_id, related_id) {
  return dbUtils.remove(TABLE, { character_id, related_id });
}

// Get all relationships for a character (as either character_id or related_id)
async function getRelationshipsForCharacter(character_id) {
  // Get relationships where character is the source
  const asSource = await dbUtils.select(TABLE, { character_id });
  // Get relationships where character is the target
  const asTarget = await dbUtils.select(TABLE, { related_id: character_id });
  // Merge and deduplicate (in case of self-relationships)
  const all = [...asSource, ...asTarget];
  const seen = new Set();
  return all.filter(r => {
    const key = `${r.character_id}|${r.related_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Get a specific character-character relationship
function getCharacterRelationship(character_id, related_id) {
  return dbUtils.select(TABLE, { character_id, related_id }, true);
}

module.exports = {
  addCharacterRelationship,
  updateCharacterRelationship,
  removeCharacterRelationship,
  getRelationshipsForCharacter,
  getCharacterRelationship
};