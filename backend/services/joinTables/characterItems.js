const historicalJoinTableService = require('../historicalJoinTableService');
const dbUtils = require('../../utils/dbUtils');

// Custom logic: get all item IDs for a character (returns only IDs)
function getItemIdsForCharacter(character_id) {
  return historicalJoinTableService.getLinkagesById('character_items', 'character_id', character_id)
    .then(rows => rows.map(r => r.item_id));
}

// Custom logic: get all unique item IDs for a character
function getUniqueItemIdsForCharacter(character_id) {
  return historicalJoinTableService.getLinkagesById('character_items', 'character_id', character_id)
    .then(rows => {
      const uniqueIds = new Set(rows.map(r => r.item_id));
      return Array.from(uniqueIds);
    });
}

// Custom logic: get all items for a character (with join table metadata)

function getItemForCharacter(character_id, item_id) {
  return dbUtils.getEntityWithHistory(
    'items',
    'character_items',
    'id',
    'item_id',
    item_id,
    { character_id },
    'acquired_date',
    true
  );
}

// Custom logic: get all items (with history) for a character
async function getAllItemsWithHistoryForCharacter(character_id) {
  const itemIds = await getUniqueItemIdsForCharacter(character_id);
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
  return results.filter(Boolean);
}

// CRUD wrappers using the generic historicalJoinTableService
function addCharacterItem(character_id, item_id, acquired_date, relinquished_date, short_description = '') {
  return historicalJoinTableService.createLinkage('character_items', {
    character_id,
    item_id,
    acquired_date,
    relinquished_date,
    short_description
  });
}

function getCharacterItem(character_id, item_id, acquired_date) {
  return historicalJoinTableService.getLinkage('character_items', { character_id, item_id, acquired_date });
}

function getAllCharacterItemRecords(character_id, item_id) {
  return historicalJoinTableService.getLinkagesById('character_items', 'character_id', character_id)
    .then(rows => rows.filter(r => r.item_id === item_id));
}

function getCharactersForItem(item_id) {
  return historicalJoinTableService.getLinkagesById('character_items', 'item_id', item_id);
}

function patchCharacterItem(character_id, item_id, acquired_date, updates) {
  return historicalJoinTableService.patchLinkage('character_items', { character_id, item_id, acquired_date }, updates);
}

function removeInstanceCharacterItem(character_id, item_id, acquired_date) {
  return historicalJoinTableService.deleteLinkage('character_items', { character_id, item_id, acquired_date });
}

function removeCharacterItem(character_id, item_id) {
  // Remove all records for a character-item pair
  return historicalJoinTableService.deleteAllLinkages('character_items', { character_id, item_id });
}

function removeAllCharacterItemRecords(character_id) {
  // Remove ALL item relationships for this character
  return historicalJoinTableService.deleteAllLinkages('character_items', { character_id });
}

function removeAllItemCharacterRecords(item_id) {
  // Remove ALL character relationships for this item
  return historicalJoinTableService.deleteAllLinkages('character_items', { item_id });
}

module.exports = {
  addCharacterItem,
  patchCharacterItem,
  removeCharacterItem,
  removeInstanceCharacterItem,
  getItemForCharacter,
  getCharacterItem,
  getAllCharacterItemRecords,
  getItemIdsForCharacter,
  removeAllCharacterItemRecords,
  removeAllItemCharacterRecords,
  getAllItemsWithHistoryForCharacter,
  getUniqueItemIdsForCharacter,
  getCharactersForItem
};