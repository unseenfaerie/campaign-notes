
// services/eventOrganizations.js
// Centralized logic for managing event-organization relationships
const dbUtils = require('../utils/dbUtils');

const TABLE = 'event_organizations';

function addEventOrganization(event_id, organization_id, short_description, long_explanation) {
  return dbUtils.insert(TABLE, { event_id, organization_id, short_description, long_explanation });
}

function getOrganizationsForEvent(event_id) {
  return dbUtils.select(TABLE, { event_id });
}

function getEventOrganization(event_id, organization_id) {
  return dbUtils.selectOne ? dbUtils.selectOne(TABLE, { event_id, organization_id }) : dbUtils.select(TABLE, { event_id, organization_id }, true);
}

function updateEventOrganization(event_id, organization_id, updates) {
  const allowed = ['short_description', 'long_explanation'];
  const filtered = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));
  if (Object.keys(filtered).length === 0) {
    return Promise.resolve({ event_id, organization_id, message: "no updates made" });
  }
  return dbUtils.update(TABLE, { event_id, organization_id }, filtered);
}

function removeEventOrganization(event_id, organization_id) {
  return dbUtils.remove(TABLE, { event_id, organization_id });
}

module.exports = {
  addEventOrganization,
  getOrganizationsForEvent,
  getEventOrganization,
  updateEventOrganization,
  removeEventOrganization
};
