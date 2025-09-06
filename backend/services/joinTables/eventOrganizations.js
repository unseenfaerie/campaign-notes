// services/joinTables/eventOrganizations.js
const dbUtils = require('../../utils/dbUtils');
const { updateWithChangedFields } = require('../../utils/serviceUtils');
const TABLE = 'event_organizations';

function addEventOrganization(event_id, organization_id, short_description, long_explanation) {
  return dbUtils.insert(TABLE, { event_id, organization_id, short_description, long_explanation });
}

function getEventsForOrganization(organization_id) { return dbUtils.select(TABLE, { organization_id }); }

function getOrganizationsForEvent(event_id) { return dbUtils.select(TABLE, { event_id }); }

function getEventOrganization(event_id, organization_id) { return dbUtils.select(TABLE, { event_id, organization_id }, true); }

function patchEventOrganization(event_id, organization_id, updates) {
  return updateWithChangedFields(TABLE, { event_id, organization_id }, updates);
}

function removeEventOrganization(event_id, organization_id) { return dbUtils.remove(TABLE, { event_id, organization_id }); }

module.exports = {
  addEventOrganization,
  getOrganizationsForEvent,
  getEventOrganization,
  getEventsForOrganization,
  patchEventOrganization,
  removeEventOrganization
};
