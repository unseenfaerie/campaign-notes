const entityDataService = require('../entityDataService');
const fullEntityService = require('../fullEntityService');

function createOrganization(org) {
  return entityDataService.createEntity('Organization', org);
}

function getAllOrganizations() {
  return entityDataService.getAllEntities('Organization');
}

function getOrganizationById(id) {
  return entityDataService.getEntityById('Organization', id);
}

function getFullOrganizationById(id) {
  return fullEntityService.getFullEntityById('Organization', id);
}

function patchOrganization(id, updates) {
  return entityDataService.patchEntity('Organization', id, updates);
}

function deleteOrganization(id) {
  return entityDataService.deleteEntity('Organization', id);
}

module.exports = {
  createOrganization,
  getAllOrganizations,
  getOrganizationById,
  getFullOrganizationById,
  patchOrganization,
  deleteOrganization,
};
