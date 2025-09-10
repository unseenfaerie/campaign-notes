const historicalJoinTableService = require('../historicalJoinTableService');

const TABLE = 'character_items';
const MAIN_ID = 'character_id';
const RELATED_ID = 'item_id';
const DATE_KEY = 'acquired_date';

// Create
function addCharacterItem(data) {
  // data: { character_id, item_id, acquired_date, ...metadata }
  return historicalJoinTableService.createLinkage(TABLE, data);
}

// Read
function getItemsForCharacter(character_id) {
  // All items (all history) for a character
  return historicalJoinTableService.getLinkagesById(TABLE, MAIN_ID, character_id);
}

function getCharactersForItem(item_id) {
  // All characters (all history) for an item
  return historicalJoinTableService.getLinkagesById(TABLE, RELATED_ID, item_id);
}

function getCharacterItemHistory(character_id, item_id) {
  // All history for a character-item pair
  return historicalJoinTableService.getLinkagesByFields(TABLE, { [MAIN_ID]: character_id, [RELATED_ID]: item_id });
}

function getCharacterItemInstance(character_id, item_id, acquired_date) {
  // Specific instance
  return historicalJoinTableService.getLinkage(TABLE, {
    [MAIN_ID]: character_id,
    [RELATED_ID]: item_id,
    [DATE_KEY]: acquired_date
  });
}

// Patch
function patchCharacterItem(character_id, item_id, acquired_date, updates) {
  // Patch a specific instance
  return historicalJoinTableService.patchLinkage(TABLE, {
    [MAIN_ID]: character_id,
    [RELATED_ID]: item_id,
    [DATE_KEY]: acquired_date
  }, updates);
}

// Delete
function removeCharacterItemInstance(character_id, item_id, acquired_date) {
  // Remove a specific instance
  return historicalJoinTableService.deleteLinkage(TABLE, {
    [MAIN_ID]: character_id,
    [RELATED_ID]: item_id,
    [DATE_KEY]: acquired_date
  });
}

function removeAllItemsForCharacter(character_id) {
  // Remove all items for a character
  return historicalJoinTableService.deleteAllLinkages(TABLE, { [MAIN_ID]: character_id });
}

function removeAllCharactersForItem(item_id) {
  // Remove all characters for an item
  return historicalJoinTableService.deleteAllLinkages(TABLE, { [RELATED_ID]: item_id });
}

function removeAllHistoryForCharacterItem(character_id, item_id) {
  // Remove all history for a character-item pair
  return historicalJoinTableService.deleteAllLinkages(TABLE, { [MAIN_ID]: character_id, [RELATED_ID]: item_id });
}

module.exports = {
  // Create
  addCharacterItem,
  // Read
  getItemsForCharacter,
  getCharactersForItem,
  getCharacterItemHistory,
  getCharacterItemInstance,
  // Patch
  patchCharacterItem,
  // Delete
  removeCharacterItemInstance,
  removeAllItemsForCharacter,
  removeAllCharactersForItem,
  removeAllHistoryForCharacterItem
};