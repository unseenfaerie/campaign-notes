// services/characterItems.js
// Centralized logic for managing character-item relationships
const db = require('../db');

// Add a character-item relationship
function addCharacterItem(character_id, item_id, acquired_date, relinquished_date, short_description = '') {
  return new Promise((resolve, reject) => {
    const sql = `INSERT OR IGNORE INTO character_items (character_id, item_id, acquired_date, relinquished_date, short_description)
                 VALUES (?, ?, ?, ?, ?)`;
    db.run(sql, [character_id, item_id, acquired_date, relinquished_date, short_description], function (err) {
      if (err) return reject(err);
      resolve({ character_id, item_id });
    });
  });
}

// Update a character-item relationship
function updateCharacterItem(character_id, item_id, updates) {
  const values = [];
      // character_id TEXT,
      // item_id TEXT,
      // acquired_date TEXT,
      // relinquished_date TEXT,
      // short_description TEXT,
  const allowed = ['acquired_date', 'relinquished_date', 'short_description'];
  const fields = Object.keys(updates).filter(key => allowed.includes(key));
  if (fields.length === 0) return Promise.resolve({ character_id, item_id, message: "no updates made"});
  values.push(character_id, item_id);
  const sql = `UPDATE character_items SET ${fields.join(', ')} WHERE character_id = ? AND item_id = ?`;
  return new Promise((resolve, reject) => {
    db.run(sql, values, function (err) {
      if (err) return reject(err);
      resolve({ character_id, item_id });
    });
  });
}

// Remove a character-item relationship
function removeCharacterItem(character_id, item_id) {
  return new Promise((resolve, reject) => {
    const sql = `DELETE FROM character_items WHERE character_id = ? AND item_id = ?`;
    db.run(sql, [character_id, item_id], function (err) {
      if (err) return reject(err);
      resolve({ character_id, item_id });
    });
  });
}

// Get all items for a character (with join table metadata)
function getItemsForCharacter(character_id) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT i.*, ci.acquired_date, ci.relinquished_date, ci.short_description
                 FROM character_items ci
                 JOIN items i ON ci.item_id = i.id
                 WHERE ci.character_id = ?`;
    db.all(sql, [character_id], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

// Get all characters for an item (with join table metadata)
function getCharactersForItem(item_id) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT c.*, ci.acquired_date, ci.relinquished_date, ci.short_description
                 FROM character_items ci
                 JOIN characters c ON ci.character_id = c.id
                 WHERE ci.item_id = ?`;
    db.all(sql, [item_id], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

// Get a specific character-item relationship (with join table metadata)
function getCharacterItem(character_id, item_id) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM character_items WHERE character_id = ? AND item_id = ?`;
    db.get(sql, [character_id, item_id], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

module.exports = {
  addCharacterItem,
  updateCharacterItem,
  removeCharacterItem,
  getItemsForCharacter,
  getCharactersForItem,
  getCharacterItem
};
