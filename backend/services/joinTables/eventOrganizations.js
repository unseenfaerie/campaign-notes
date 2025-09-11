// services/joinTables/eventOrganizations.js
const relationshipJoinTableService = require('../relationshipJoinTableService');

const TABLE = 'event_organizations';
const MAIN_ID = 'event_id';
const RELATED_ID = 'organization_id';

// Create
function addEventOrganization(data) {
  // data: { event_id, organization_id, ...metadata }
  return relationshipJoinTableService.createLinkage(TABLE, data);
}

// Read
function getOrganizationsForEvent(event_id) {
  // All organizations for an event
  return relationshipJoinTableService.getLinkagesById(TABLE, MAIN_ID, event_id);
}

function getEventsForOrganization(organization_id) {
  // All events for an organization
  return relationshipJoinTableService.getLinkagesById(TABLE, RELATED_ID, organization_id);
}

function getEventOrganization(event_id, organization_id) {
  // Get a specific event-organization link
  return relationshipJoinTableService.getLinkage(TABLE, { [MAIN_ID]: event_id, [RELATED_ID]: organization_id });
}

// Update
function patchEventOrganization(event_id, organization_id, updates) {
  // Patch a specific event-organization link
  return relationshipJoinTableService.patchLinkage(TABLE, { [MAIN_ID]: event_id, [RELATED_ID]: organization_id }, updates);
}

// Delete
function removeEventOrganization(event_id, organization_id) {
  // Remove a specific event-organization link
  return relationshipJoinTableService.deleteLinkage(TABLE, { [MAIN_ID]: event_id, [RELATED_ID]: organization_id });
}

function removeOrganizationsFromEvent(event_id) {
  // Remove all organizations from an event
  return relationshipJoinTableService.deleteAllLinkages(TABLE, { [MAIN_ID]: event_id });
}

function removeEventsFromOrganization(organization_id) {
  // Remove all events from an organization
  return relationshipJoinTableService.deleteAllLinkages(TABLE, { [RELATED_ID]: organization_id });
}

module.exports = {
  // Create
  addEventOrganization,
  // Read
  getOrganizationsForEvent,
  getEventsForOrganization,
  getEventOrganization,
  // Update
  patchEventOrganization,
  // Delete
  removeEventOrganization,
  removeOrganizationsFromEvent,
  removeEventsFromOrganization
};
