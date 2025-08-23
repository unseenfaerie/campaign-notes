// Centralized logic for managing character-item relationships
const { isValidDateFormat, loreDateToSortable } = require('../utils/dateUtils');
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

// Get all item IDs for a character
function getItemIdsForCharacter(character_id) {
  return new Promise((resolve, reject) => {
    db.all('SELECT DISTINCT item_id FROM character_items WHERE character_id = ?', [character_id], (err, rows) => {
      if (err) return reject(err);
      resolve(rows.map(r => r.item_id));
    });
  });
}

// Get all items for a character (with join table metadata)
function getItemsForCharacter(character_id) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT i.*, ci.item_id, ci.acquired_date, ci.relinquished_date, ci.short_description
                 FROM character_items ci
                 JOIN items i ON ci.item_id = i.id
                 WHERE ci.character_id = ?`;
    db.all(sql, [character_id], (err, rows) => {
      if (err) return reject(err);

      const latest = new Map();
      for (const row of rows || []) {
        const key = row.item_id;
        const current = latest.get(key);
        if (isValidDateFormat(row.acquired_date)) {
          if (!current || loreDateToSortable(row.acquired_date) > loreDateToSortable(current.acquired_date)) {
            latest.set(key, row);
          }
        }
      }
      resolve(Array.from(latest.values()));
    });
  });
}

// Get a specific character-item relationship (with join table metadata)
function getCharacterItem(character_id, item_id, acquired_date) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM character_items WHERE character_id = ? AND item_id = ? AND acquired_date = ?`;
    db.get(sql, [character_id, item_id, acquired_date], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

// Get all records for a character-item pair (all acquisitions)
function getAllCharacterItemRecords(character_id, item_id) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM character_items WHERE character_id = ? AND item_id = ?`;
    db.all(sql, [character_id, item_id], (err, rows) => {
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

// Update a character-item relationship
function updateCharacterItem(character_id, item_id, acquired_date, updates) {
  // character_id TEXT,
  // item_id TEXT,
  // acquired_date TEXT,
  // relinquished_date TEXT,
  // short_description TEXT,
  const allowed = ['relinquished_date', 'short_description'];
  const fields = Object.keys(updates).filter(key => allowed.includes(key));
  if (fields.length === 0) return Promise.resolve({ character_id, item_id, acquired_date, message: 'no updates made' });
  if (fields.includes('acquired_date')) return Promise.resolve({ character_id, item_id, acquired_date, message: 'cannot update acquired date; make a new object' });
  if (fields.includes('relinquished_date') && !isValidDateFormat(updates.relinquished_date)) {
    return Promise.resolve({ character_id, item_id, acquired_date, message: 'invalid date format, use mmm-dd-yyy (eg mar-19-002 or jun-01-999)' });
  }
  const setClause = fields.map(field => `${field} = ?`).join(', ');
  const values = fields.map(field => updates[field]);
  values.push(character_id, item_id, acquired_date);


  const sql = `UPDATE character_items SET ${setClause} WHERE character_id = ? AND item_id = ? AND acquired_date = ?`;
  return new Promise((resolve, reject) => {
    db.run(sql, values, function (err) {
      if (err) {
        return reject(err);
      }
      resolve({ character_id, item_id, acquired_date });
    });
  });
}

// Remove a character-item relationship
function removeInstanceCharacterItem(character_id, item_id, acquired_date) {
  return new Promise((resolve, reject) => {
    const sql = `DELETE FROM character_items WHERE character_id = ? AND item_id = ? AND acquired_date = ?`;
    db.run(sql, [character_id, item_id, acquired_date], function (err) {
      if (err) return reject(err);
      resolve({ character_id, item_id, acquired_date });
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

// Remove ALL item relationships for this character
function removeAllCharacterItemRecords(character_id) {
  return new Promise((resolve, reject) => {
    const sql = `DELETE FROM character_items WHERE character_id = ?`;
    db.run(sql, [character_id], function (err) {
      if (err) return reject(err);
      resolve({ character_id });
    });
  });
}

module.exports = {
  addCharacterItem,
  updateCharacterItem,
  removeCharacterItem,
  removeInstanceCharacterItem,
  getItemsForCharacter,
  getCharactersForItem,
  getCharacterItem,
  getAllCharacterItemRecords,
  getItemIdsForCharacter
};
