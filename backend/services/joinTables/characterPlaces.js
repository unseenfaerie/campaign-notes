// services/characterPlaces.js
// Centralized logic for managing character-place relationships
const dbUtils = require('../../utils/dbUtils');
const serviceUtils = require('../../utils/serviceUtils');

const TABLE = 'character_places';

// Add a character-place relationship
function addCharacterPlace(character_id, place_id, arrived_date = '', left_date = '', short_description = '', long_explanation = '') {
  return dbUtils.insert(TABLE, { character_id, place_id, arrived_date, left_date, short_description, long_explanation });
}

// Get all places for a character
function getPlacesForCharacter(character_id) {
  return dbUtils.select(TABLE, { character_id });
}

// Get all characters for a place
function getCharactersForPlace(place_id) {
  return dbUtils.select(TABLE, { place_id });
}

// Get a specific character-place relationship
function getCharacterPlace(character_id, place_id, arrived_date) {
  return dbUtils.select(TABLE, { character_id, place_id, arrived_date }, true);
}

// Patch a character-place relationship
async function patchCharacterPlace(character_id, place_id, arrived_date, updates) {
  return serviceUtils.updateWithChangedFields(
    TABLE,
    { character_id, place_id, arrived_date },
    updates
  );
}

// Remove a character-place relationship
function removeCharacterPlace(character_id, place_id, arrived_date) {
  return dbUtils.remove(TABLE, { character_id, place_id, arrived_date });
}

// Remove all records for a character-place pair
function removeAllCharacterPlaceRecords(character_id, place_id) {
  return dbUtils.remove(TABLE, { character_id, place_id });
}

// Remove ALL place relationships for this character
function removeAllCharacterPlaces(character_id) {
  return dbUtils.remove(TABLE, { character_id });
}

module.exports = {
  addCharacterPlace,
  patchCharacterPlace,
  removeCharacterPlace,
  removeAllCharacterPlaceRecords,
  removeAllCharacterPlaces,
  getPlacesForCharacter,
  getCharactersForPlace,
  getCharacterPlace
};
