const dbUtils = require('../../utils/dbUtils');
const serviceUtils = require('../../utils/serviceUtils');
const fullEntityService = require('../fullEntityService');

const TABLE = 'organizations';

function createOrganization(org) {
  return dbUtils.insert(TABLE, org);
}

function getAllOrganizations() {
  return dbUtils.select(TABLE);
}

function getOrganizationById(id) {
  return dbUtils.select(TABLE, { id }, true);
}

async function getFullOrganizationById(id) {
  return fullEntityService.getFullEntityById('Organization', id);
}

function patchOrganization(id, updates) {
  return serviceUtils.updateWithChangedFields(TABLE, { id }, updates);
}

function deleteOrganization(id) {
  return dbUtils.remove(TABLE, { id });
}

module.exports = {
  createOrganization,
  getAllOrganizations,
  getOrganizationById,
  getFullOrganizationById,
  patchOrganization,
  deleteOrganization,
};
