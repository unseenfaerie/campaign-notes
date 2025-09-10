// services/characterOrganizations.js
// Centralized logic for managing character-organization relationships
const historicalJoinTableService = require('../historicalJoinTableService');

const TABLE = 'character_organizations';
const MAIN_ID = 'character_id';
const RELATED_ID = 'organization_id';
const DATE_KEY = 'joined_date';

// Create
function addCharacterOrganization(data) {
  // data: { character_id, organization_id, joined_date, ...metadata }
  return historicalJoinTableService.createLinkage(TABLE, data);
}



// Read
function getOrganizationsForCharacter(character_id) {
  // All organizations (all history) for a character
  return historicalJoinTableService.getLinkagesById(TABLE, MAIN_ID, character_id);
}

function getCharactersForOrganization(organization_id) {
  // All characters (all history) for an organization
  return historicalJoinTableService.getLinkagesById(TABLE, RELATED_ID, organization_id);
}

function getCharacterOrganizationHistory(character_id, organization_id) {
  // All history for a character-organization pair
  return historicalJoinTableService.getLinkagesByFields(TABLE, { [MAIN_ID]: character_id, [RELATED_ID]: organization_id });
}

function getCharacterOrganizationInstance(character_id, organization_id, joined_date) {
  // Specific instance
  return historicalJoinTableService.getLinkage(TABLE, {
    [MAIN_ID]: character_id,
    [RELATED_ID]: organization_id,
    [DATE_KEY]: joined_date
  });
}

// Patch
function patchCharacterOrganization(character_id, organization_id, joined_date, updates) {
  // Patch a specific instance
  return historicalJoinTableService.patchLinkage(TABLE, {
    [MAIN_ID]: character_id,
    [RELATED_ID]: organization_id,
    [DATE_KEY]: joined_date
  }, updates);
}

// Delete
function removeCharacterOrganizationInstance(character_id, organization_id, joined_date) {
  // Remove a specific instance
  return historicalJoinTableService.deleteLinkage(TABLE, {
    [MAIN_ID]: character_id,
    [RELATED_ID]: organization_id,
    [DATE_KEY]: joined_date
  });
}

function removeAllOrganizationsForCharacter(character_id) {
  // Remove all organizations for a character
  return historicalJoinTableService.deleteAllLinkages(TABLE, { [MAIN_ID]: character_id });
}

function removeAllCharactersForOrganization(organization_id) {
  // Remove all characters for an organization
  return historicalJoinTableService.deleteAllLinkages(TABLE, { [RELATED_ID]: organization_id });
}

function removeAllHistoryForCharacterOrganization(character_id, organization_id) {
  // Remove all history for a character-organization pair
  return historicalJoinTableService.deleteAllLinkages(TABLE, { [MAIN_ID]: character_id, [RELATED_ID]: organization_id });
}

module.exports = {
  // Create
  addCharacterOrganization,
  // Read
  getOrganizationsForCharacter,
  getCharactersForOrganization,
  getCharacterOrganizationHistory,
  getCharacterOrganizationInstance,
  // Patch
  patchCharacterOrganization,
  // Delete
  removeCharacterOrganizationInstance,
  removeAllOrganizationsForCharacter,
  removeAllCharactersForOrganization,
  removeAllHistoryForCharacterOrganization
};