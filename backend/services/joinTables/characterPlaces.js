// services/characterPlaces.js
// Centralized logic for managing character-place relationships (historical)
const TABLE = 'character_places';
const MAIN_ID = 'character_id';
const RELATED_ID = 'place_id';
const DATE_KEY = 'arrived_date';

// Create
function addCharacterPlace(data) {
  // data: { character_id, place_id, arrived_date, ...metadata }
  return historicalJoinTableService.createLinkage(TABLE, data);
}

// Read
function getPlacesForCharacter(character_id) {
  // All places (all history) for a character
  return historicalJoinTableService.getLinkagesById(TABLE, MAIN_ID, character_id);
}

function getCharactersForPlace(place_id) {
  // All characters (all history) for a place
  return historicalJoinTableService.getLinkagesById(TABLE, RELATED_ID, place_id);
}

function getCharacterPlaceHistory(character_id, place_id) {
  // All history for a character-place pair
  return historicalJoinTableService.getLinkagesByFields(TABLE, { [MAIN_ID]: character_id, [RELATED_ID]: place_id });
}

function getCharacterPlaceInstance(character_id, place_id, arrived_date) {
  // Specific instance
  return historicalJoinTableService.getLinkage(TABLE, {
    [MAIN_ID]: character_id,
    [RELATED_ID]: place_id,
    [DATE_KEY]: arrived_date
  });
}

// Patch
function patchCharacterPlace(character_id, place_id, arrived_date, updates) {
  // Patch a specific instance
  return historicalJoinTableService.patchLinkage(TABLE, {
    [MAIN_ID]: character_id,
    [RELATED_ID]: place_id,
    [DATE_KEY]: arrived_date
  }, updates);
}

// Delete
function removeCharacterPlaceInstance(character_id, place_id, arrived_date) {
  // Remove a specific instance
  return historicalJoinTableService.deleteLinkage(TABLE, {
    [MAIN_ID]: character_id,
    [RELATED_ID]: place_id,
    [DATE_KEY]: arrived_date
  });
}

function removeAllPlacesForCharacter(character_id) {
  // Remove all places for a character
  return historicalJoinTableService.deleteAllLinkages(TABLE, { [MAIN_ID]: character_id });
}

function removeAllCharactersForPlace(place_id) {
  // Remove all characters for a place
  return historicalJoinTableService.deleteAllLinkages(TABLE, { [RELATED_ID]: place_id });
}

function removeAllHistoryForCharacterPlace(character_id, place_id) {
  // Remove all history for a character-place pair
  return historicalJoinTableService.deleteAllLinkages(TABLE, { [MAIN_ID]: character_id, [RELATED_ID]: place_id });
}

module.exports = {
  // Create
  addCharacterPlace,
  // Read
  getPlacesForCharacter,
  getCharactersForPlace,
  getCharacterPlaceHistory,
  getCharacterPlaceInstance,
  // Patch
  patchCharacterPlace,
  // Delete
  removeCharacterPlaceInstance,
  removeAllPlacesForCharacter,
  removeAllCharactersForPlace,
  removeAllHistoryForCharacterPlace
};
