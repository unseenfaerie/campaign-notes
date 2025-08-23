// services/characterDeities.js
// Centralized logic for managing character-deity relationships
const db = require('../db');

// Add a character-deity relationship
function addCharacterDeity(character_id, deity_id, short_description = '', long_explanation = '') {
  return new Promise((resolve, reject) => {
    const sql = `INSERT OR IGNORE INTO character_deities (character_id, deity_id, short_description, long_explanation)
                 VALUES (?, ?, ?, ?)`;
    db.run(sql, [character_id, deity_id, short_description, long_explanation], function (err) {
      if (err) return reject(err);
      resolve({ character_id, deity_id });
    });
  });
}

// Update a character-deity relationship
function updateCharacterDeity(character_id, deity_id, updates) {
  const allowed = ['short_description', 'long_explanation'];
  const fields = Object.keys(updates).filter(key => allowed.includes(key));
  if (fields.length === 0) return Promise.resolve({ character_id, item_id, message: "no updates made"});
  values.push(character_id, deity_id);
  const sql = `UPDATE character_deities SET ${fields.join(', ')} WHERE character_id = ? AND deity_id = ?`;
  return new Promise((resolve, reject) => {
    db.run(sql, values, function (err) {
      if (err) return reject(err);
      resolve({ character_id, deity_id });
    });
  });
}

// Remove a character-deity relationship
function removeCharacterDeity(character_id, deity_id) {
  return new Promise((resolve, reject) => {
    const sql = `DELETE FROM character_deities WHERE character_id = ? AND deity_id = ?`;
    db.run(sql, [character_id, deity_id], function (err) {
      if (err) return reject(err);
      resolve({ character_id, deity_id });
    });
  });
}

// Get all deities for a character (with join table metadata)
function getDeitiesForCharacter(character_id) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT d.*, cd.short_description, cd.long_explanation
                 FROM character_deities cd
                 JOIN deities d ON cd.deity_id = d.id
                 WHERE cd.character_id = ?`;
    db.all(sql, [character_id], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

// Get all characters for a deity (with join table metadata)
function getCharactersForDeity(deity_id) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT c.*, cd.short_description, cd.long_explanation
                 FROM character_deities cd
                 JOIN characters c ON cd.character_id = c.id
                 WHERE cd.deity_id = ?`;
    db.all(sql, [deity_id], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

// Get a specific character-deity relationship (with join table metadata)
function getCharacterDeity(character_id, deity_id) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM character_deities WHERE character_id = ? AND deity_id = ?`;
    db.get(sql, [character_id, deity_id], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

module.exports = {
  addCharacterDeity,
  updateCharacterDeity,
  removeCharacterDeity,
  getDeitiesForCharacter,
  getCharactersForDeity,
  getCharacterDeity
};
