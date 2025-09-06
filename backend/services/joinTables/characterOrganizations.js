// services/characterOrganizations.js
// Centralized logic for managing character-organization relationships
const dbUtils = require('../../utils/dbUtils');
const { updateWithChangedFields } = require('../../utils/serviceUtils');

const TABLE = 'character_organizations';

// Add a character-organization relationship
function addCharacterOrganization(character_id, organization_id, joined_date = '', left_date = '', short_description = '', long_explanation = '') {
  return dbUtils.insert(TABLE, { character_id, organization_id, joined_date, left_date, short_description, long_explanation });
}

// Get all organization IDs for a character (custom, returns only IDs)
function getOrganizationIdsForCharacter(character_id) {
  return dbUtils.select(TABLE, { character_id }).then(rows => rows.map(r => r.organization_id));
}

// Get all records for a character-organization pair (all joinings)
function getAllCharacterOrganizationRecords(character_id, organization_id) {
  return dbUtils.select(TABLE, { character_id, organization_id });
}

// Get a specific character-organization relationship by joined_date
function getCharacterOrganizationByDate(character_id, organization_id, joined_date) {
  return dbUtils.select(TABLE, { character_id, organization_id, joined_date }, true);
}

// Remove a single instance of organization membership from a character
function removeInstanceCharacterOrganization(character_id, organization_id, joined_date) {
  return dbUtils.remove(TABLE, { character_id, organization_id, joined_date });
}

// Remove ALL organization relationships for this character and organization
function removeCharacterOrganizationRecords(character_id, organization_id) {
  return dbUtils.remove(TABLE, { character_id, organization_id });
}

// Remove ALL organization relationships for this character
function removeAllCharacterOrganizationRecords(character_id) {
  return dbUtils.remove(TABLE, { character_id });
}

// Get all organizations for a character (join table only)
function getOrganizationsForCharacter(character_id) {
  return dbUtils.select(TABLE, { character_id });
}

// Get all characters for an organization (join table only)
function getCharactersForOrganization(organization_id) {
  return dbUtils.select(TABLE, { organization_id });
}

// Get a specific character-organization relationship
function getCharacterOrganization(character_id, organization_id) {
  return dbUtils.select(TABLE, { character_id, organization_id }, true);
}

// Patch a character-organization relationship
async function patchCharacterOrganization(character_id, organization_id, joined_date, updates) {
  return updateWithChangedFields(
    TABLE,
    { character_id, organization_id, joined_date },
    updates
  );
}

// Remove all records for a character-organization pair (alias for removeCharacterOrganizationRecords)
function removeCharacterOrganization(character_id, organization_id) {
  return removeCharacterOrganizationRecords(character_id, organization_id);
}

module.exports = {
  addCharacterOrganization,
  patchCharacterOrganization,
  removeCharacterOrganization,
  getOrganizationsForCharacter,
  getCharactersForOrganization,
  getCharacterOrganization,
  getOrganizationIdsForCharacter,
  getAllCharacterOrganizationRecords,
  getCharacterOrganizationByDate,
  removeInstanceCharacterOrganization,
  removeCharacterOrganizationRecords,
  removeAllCharacterOrganizationRecords
};