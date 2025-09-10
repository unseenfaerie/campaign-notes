// services/joinTables/eventOrganizations.js
const relationshipJoinTableService = require('../relationshipJoinTableService');

const tableName = 'event_organizations';

function addEventOrganization(linkage) {
  // linkage: { event_id, organization_id, short_description, long_explanation }
  return relationshipJoinTableService.createLinkage(tableName, linkage);
}

function getEventsForOrganization(organization_id) {
  return relationshipJoinTableService.getLinkagesById(tableName, 'organization_id', organization_id);
}

function getOrganizationsForEvent(event_id) {
  return relationshipJoinTableService.getLinkagesById(tableName, 'event_id', event_id);
}


function getEventOrganization(linkage) {
  // linkage: { event_id, organization_id }
  return relationshipJoinTableService.getLinkage(tableName, linkage);
}


function patchEventOrganization(linkage, updates) {
  // linkage: { event_id, organization_id }
  return relationshipJoinTableService.patchLinkage(tableName, linkage, updates);
}


function removeEventOrganization(linkage) {
  // linkage: { event_id, organization_id }
  return relationshipJoinTableService.deleteLinkage(tableName, linkage);
}

module.exports = {
  addEventOrganization,
  getOrganizationsForEvent,
  getEventOrganization,
  getEventsForOrganization,
  patchEventOrganization,
  removeEventOrganization
};
