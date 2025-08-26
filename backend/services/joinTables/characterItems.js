const { isValidDateFormat, loreDateToSortable } = require('../../utils/dateUtils');
const dbUtils = require('../../utils/dbUtils');
const { updateWithChangedFields } = require('../../utils/serviceUtils');

const TABLE = 'character_items';

// Add a character-item relationship
function addCharacterItem(character_id, item_id, acquired_date, relinquished_date, short_description = '') {
  return dbUtils.insert(TABLE, { character_id, item_id, acquired_date, relinquished_date, short_description });
}

// Get all item IDs for a character (custom, since it returns only IDs)
function getItemIdsForCharacter(character_id) {
  return dbUtils.select(TABLE, { character_id }).then(rows => rows.map(r => r.item_id));
}

// Get all unique item IDs for a character
function getUniqueItemIdsForCharacter(character_id) {
  return dbUtils.select(TABLE, { character_id }).then(rows => {
    const uniqueIds = new Set(rows.map(r => r.item_id));
    return Array.from(uniqueIds);
  });
}

// Get all items for a character (with join table metadata, custom logic)
function getItemForCharacter(character_id, item_id) {
  return dbUtils.getEntityWithHistory(
    'items',           // mainTable
    'character_items', // joinTable
    'id',              // entityKey (items.id)
    'item_id',         // joinKey (character_items.item_id)
    item_id,           // entityId
    { character_id },  // historyWhere
    'acquired_date',   // historySortField
    true               // ascending
  );
}

// Get all items (with history) for a character
async function getAllItemsWithHistoryForCharacter(character_id) {
  // Get all item_ids for this character
  const itemIds = await getUniqueItemIdsForCharacter(character_id);
  // For each item_id, get the item and its history for this character
  const results = await Promise.all(itemIds.map(item_id =>
    dbUtils.getEntityWithHistory(
      'items',
      'character_items',
      'id',
      'item_id',
      item_id,
      { character_id },
      'acquired_date',
      true
    )
  ));
  // Filter out any nulls (in case an item was deleted)
  return results.filter(Boolean);
}


// Get a specific character-item relationship (can use dbUtils)
function getCharacterItem(character_id, item_id, acquired_date) {
  return dbUtils.select(TABLE, { character_id, item_id, acquired_date }, true);
}

// Get all records for a character-item pair (can use dbUtils)
function getAllCharacterItemRecords(character_id, item_id) {
  return dbUtils.select(TABLE, { character_id, item_id });
}

function getCharactersForItem(item_id) {
  return dbUtils.select(TABLE, { item_id }).then(rows => rows.map(r => r.character_id));
}

// Update a character-item relationship (custom validation logic)
async function updateCharacterItem(character_id, item_id, acquired_date, updates) {
  const allowed = ['relinquished_date', 'short_description'];
  if ('relinquished_date' in updates && !isValidDateFormat(updates.relinquished_date)) {
    return { character_id, item_id, acquired_date, message: 'invalid date format, use mmm-dd-yyy (eg mar-19-002 or jun-01-999)' };
  }
  const filtered = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));
  if (Object.keys(filtered).length === 0) {
    return { character_id, item_id, acquired_date, message: 'no updates made' };
  }
  return updateWithChangedFields(
    TABLE,
    { character_id, item_id, acquired_date },
    filtered,
    allowed
  );
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
  getItemForCharacter,
  getCharacterItem,
  getAllCharacterItemRecords,
  getItemIdsForCharacter,
  removeAllCharacterItemRecords,
  getAllItemsWithHistoryForCharacter,
  getUniqueItemIdsForCharacter,
  getCharactersForItem
};