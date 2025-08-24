// services/characterRelationships.js
// Centralized logic for managing character-to-character relationships
const db = require('../db');

// Create a new character-character relationship
function addCharacterRelationship(character_id, related_id, short_description = '', long_explanation = '') {
  return new Promise((resolve, reject) => {
    const sql = `INSERT OR IGNORE INTO character_relationships (character_id, related_id, short_description, long_explanation)
                 VALUES (?, ?, ?, ?)`;
    db.run(sql, [character_id, related_id, short_description, long_explanation], function (err) {
      if (err) return reject(err);
      resolve({ character_id, related_id });
    });
  });
}

// Update an existing character-character relationship
function updateCharacterRelationship(character_id, related_id, updates) {
  const fields = [];
  const values = [];
  if (updates.short_description !== undefined) {
    fields.push('short_description = ?');
    values.push(updates.short_description);
  }
  if (updates.long_explanation !== undefined) {
    fields.push('long_explanation = ?');
    values.push(updates.long_explanation);
  }
  if (fields.length === 0) return Promise.resolve({ character_id, related_id });
  values.push(character_id, related_id);
  const sql = `UPDATE character_relationships SET ${fields.join(', ')} WHERE character_id = ? AND related_id = ?`;
  return new Promise((resolve, reject) => {
    db.run(sql, values, function (err) {
      if (err) return reject(err);
      resolve({ character_id, related_id });
    });
  });
}

// Delete a character-character relationship
function removeCharacterRelationship(character_id, related_id) {
  return new Promise((resolve, reject) => {
    const sql = `DELETE FROM character_relationships WHERE character_id = ? AND related_id = ?`;
    db.run(sql, [character_id, related_id], function (err) {
      if (err) return reject(err);
      resolve({ character_id, related_id });
    });
  });
}

// Get all relationships for a character (as either character_id or related_id)
function getRelationshipsForCharacter(character_id) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM character_relationships WHERE character_id = ? OR related_id = ?`;
    db.all(sql, [character_id, character_id], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

// Get a specific character-character relationship
function getCharacterRelationship(character_id, related_id) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM character_relationships WHERE character_id = ? AND related_id = ?`;
    db.get(sql, [character_id, related_id], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

module.exports = {
  addCharacterRelationship,
  updateCharacterRelationship,
  removeCharacterRelationship,
  getRelationshipsForCharacter,
  getCharacterRelationship
};
