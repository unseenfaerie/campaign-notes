// services/characterRelationships.js
// Centralized logic for managing character-to-character relationships
const db = require('../db');

// Create a new character-character relationship
function addCharacterRelationship(character_id_1, character_id_2, short_description = '', long_explanation = '') {
  return new Promise((resolve, reject) => {
    const sql = `INSERT OR IGNORE INTO character_relationships (character_id_1, character_id_2, short_description, long_explanation)
                 VALUES (?, ?, ?, ?)`;
    db.run(sql, [character_id_1, character_id_2, short_description, long_explanation], function (err) {
      if (err) return reject(err);
      resolve({ character_id_1, character_id_2 });
    });
  });
}

// Update an existing character-character relationship
function updateCharacterRelationship(character_id_1, character_id_2, updates) {
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
  if (fields.length === 0) return Promise.resolve({ character_id_1, character_id_2 });
  values.push(character_id_1, character_id_2);
  const sql = `UPDATE character_relationships SET ${fields.join(', ')} WHERE character_id_1 = ? AND character_id_2 = ?`;
  return new Promise((resolve, reject) => {
    db.run(sql, values, function (err) {
      if (err) return reject(err);
      resolve({ character_id_1, character_id_2 });
    });
  });
}

// Delete a character-character relationship
function removeCharacterRelationship(character_id_1, character_id_2) {
  return new Promise((resolve, reject) => {
    const sql = `DELETE FROM character_relationships WHERE character_id_1 = ? AND character_id_2 = ?`;
    db.run(sql, [character_id_1, character_id_2], function (err) {
      if (err) return reject(err);
      resolve({ character_id_1, character_id_2 });
    });
  });
}

// Get all relationships for a character (as either character_id_1 or character_id_2)
function getRelationshipsForCharacter(character_id) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM character_relationships WHERE character_id_1 = ? OR character_id_2 = ?`;
    db.all(sql, [character_id, character_id], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

// Get a specific character-character relationship
function getCharacterRelationship(character_id_1, character_id_2) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM character_relationships WHERE character_id_1 = ? AND character_id_2 = ?`;
    db.get(sql, [character_id_1, character_id_2], (err, row) => {
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
