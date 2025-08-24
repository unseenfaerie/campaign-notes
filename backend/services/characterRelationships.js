// services/characterRelationships.js
// Centralized logic for managing character-to-character relationships
const dbUtils = require('../utils/dbUtils');
const db = require('../db');

const TABLE = 'character_relationships';

// Create a new character-character relationship
function addCharacterRelationship(character_id, related_id, short_description = '', long_explanation = '') {
  return dbUtils.insert(TABLE, { character_id, related_id, short_description, long_explanation });
}

// Update an existing character-character relationship
function updateCharacterRelationship(character_id, related_id, updates) {
  const allowed = ['short_description', 'long_explanation'];
  const filtered = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));
  if (Object.keys(filtered).length === 0) {
    return Promise.resolve({ character_id, related_id, message: "no updates made" });
  }
  return dbUtils.update(TABLE, { character_id, related_id }, filtered);
}

// Delete a character-character relationship
function removeCharacterRelationship(character_id, related_id) {
  return dbUtils.remove(TABLE, { character_id, related_id });
}

// Get all relationships for a character (as either character_id or related_id)
function getRelationshipsForCharacter(character_id) {
  // Custom logic: need OR condition, so can't use dbUtils.select directly
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM ${TABLE} WHERE character_id = ? OR related_id = ?`;
    db.all(sql, [character_id, character_id], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
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