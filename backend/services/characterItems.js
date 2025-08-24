const { isValidDateFormat, loreDateToSortable } = require('../utils/dateUtils');
const dbUtils = require('../utils/dbUtils');

const TABLE = 'character_items';

// Add a character-item relationship
function addCharacterItem(character_id, item_id, acquired_date, relinquished_date, short_description = '') {
  return dbUtils.insert(TABLE, { character_id, item_id, acquired_date, relinquished_date, short_description });
}

// Get all item IDs for a character (custom, since it returns only IDs)
function getItemIdsForCharacter(character_id) {
  return dbUtils.select(TABLE, { character_id }).then(rows => rows.map(r => r.item_id));
}

// Get all items for a character (with join table metadata, custom logic)
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

// Get a specific character-item relationship (can use dbUtils)
function getCharacterItem(character_id, item_id, acquired_date) {
  return dbUtils.select(TABLE, { character_id, item_id, acquired_date }, true);
}

// Get all records for a character-item pair (can use dbUtils)
function getAllCharacterItemRecords(character_id, item_id) {
  return dbUtils.select(TABLE, { character_id, item_id });
}

// Get all characters for an item (with join table metadata, custom logic)
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

// Update a character-item relationship (custom validation logic)
function updateCharacterItem(character_id, item_id, acquired_date, updates) {
  const allowed = ['relinquished_date', 'short_description'];
  const fields = Object.keys(updates).filter(key => allowed.includes(key));
  if (fields.length === 0) return Promise.resolve({ character_id, item_id, acquired_date, message: 'no updates made' });
  if (fields.includes('acquired_date')) return Promise.resolve({ character_id, item_id, acquired_date, message: 'cannot update acquired date; make a new object' });
  if (fields.includes('relinquished_date') && !isValidDateFormat(updates.relinquished_date)) {
    return Promise.resolve({ character_id, item_id, acquired_date, message: 'invalid date format, use mmm-dd-yyy (eg mar-19-002 or jun-01-999)' });
  }
  return dbUtils.update(TABLE, { character_id, item_id, acquired_date }, updates);
}

// Remove a character-item relationship (can use dbUtils)
function removeInstanceCharacterItem(character_id, item_id, acquired_date) {
  return dbUtils.remove(TABLE, { character_id, item_id, acquired_date });
}

// Remove all records for a character-item pair (can use dbUtils)
function removeCharacterItem(character_id, item_id) {
  return dbUtils.remove(TABLE, { character_id, item_id });
}

// Remove ALL item relationships for this character (can use dbUtils)
function removeAllCharacterItemRecords(character_id) {
  return dbUtils.remove(TABLE, { character_id });
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
  getItemIdsForCharacter,
  removeAllCharacterItemRecords
};