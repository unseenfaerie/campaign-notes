
// services/characterDeities.js
// Thin wrapper for managing character-deity relationships using historicalJoinTableService
const historicalJoinTableService = require('../historicalJoinTableService');

const TABLE = 'character_deities';
const MAIN_ID = 'character_id';
const RELATED_ID = 'deity_id';
const DATE_KEY = 'adopted_date';

function addCharacterDeity(data) {
  // data should include character_id, deity_id, adopted_date, and any metadata fields
  return historicalJoinTableService.createLinkage(TABLE, data);
}

function getDeitiesForCharacter(character_id) {
  // All deities (all tenures) for a character
  return historicalJoinTableService.getLinkagesById(TABLE, MAIN_ID, character_id);
}

function getCharactersForDeity(deity_id) {
  // All characters (all tenures) for a deity
  return historicalJoinTableService.getLinkagesById(TABLE, RELATED_ID, deity_id);
}

function getCharacterDeityTenures(character_id, deity_id) {
  // All tenures for a character-deity pair
  return historicalJoinTableService.getLinkagesById(TABLE, null, null) // fallback below
    .then(rows => rows.filter(row => row.character_id === character_id && row.deity_id === deity_id));
}

function getCharacterDeityInstance(character_id, deity_id, adopted_date) {
  // Specific tenure
  return historicalJoinTableService.getLinkage(TABLE, {
    [MAIN_ID]: character_id,
    [RELATED_ID]: deity_id,
    [DATE_KEY]: adopted_date
  });
}

function patchCharacterDeity(character_id, deity_id, adopted_date, updates) {
  // Patch a specific tenure
  return historicalJoinTableService.patchLinkage(TABLE, {
    [MAIN_ID]: character_id,
    [RELATED_ID]: deity_id,
    [DATE_KEY]: adopted_date
  }, updates);
}

function removeCharacterDeityInstance(character_id, deity_id, adopted_date) {
  // Remove a specific tenure
  return historicalJoinTableService.deleteLinkage(TABLE, {
    [MAIN_ID]: character_id,
    [RELATED_ID]: deity_id,
    [DATE_KEY]: adopted_date
  });
}

function removeAllDeitiesForCharacter(character_id) {
  // Remove all deities for a character
  return historicalJoinTableService.deleteAllLinkages(TABLE, { [MAIN_ID]: character_id });
}

function removeAllTenuresForCharacterDeity(character_id, deity_id) {
  // Remove all tenures for a character-deity pair
  return historicalJoinTableService.deleteAllLinkages(TABLE, { [MAIN_ID]: character_id, [RELATED_ID]: deity_id });
}

module.exports = {
  addCharacterDeity,
  getDeitiesForCharacter,
  getCharactersForDeity,
  getCharacterDeityTenures,
  getCharacterDeityInstance,
  patchCharacterDeity,
  removeCharacterDeityInstance,
  removeAllDeitiesForCharacter,
  removeAllTenuresForCharacterDeity,
};