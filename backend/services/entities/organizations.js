// services/entities/organizations.js
// Centralized logic for managing organization CRUD and queries
const dbUtils = require('../../utils/dbUtils');

const TABLE = 'organizations';

// Create a new organization
function createOrganization(org) {
  return dbUtils.insert(TABLE, org);
}

// Get all organizations
function getAllOrganizations() {
  return dbUtils.select(TABLE);
}

// Get an organization by id
function getOrganizationById(id) {
  return dbUtils.select(TABLE, { id }, true);
}

// Update an organization (full update)
function updateOrganization(id, org) {
  // Only update allowed fields (excluding id)
  const allowed = ['name', 'type', 'parent_id', 'short_description', 'long_explanation'];
  const updates = {};
  for (const key of allowed) {
    if (org[key] !== undefined) updates[key] = org[key];
  }
  return dbUtils.update(TABLE, { id }, updates);
}

// Patch (partial update) an organization
function patchOrganization(id, updates) {
  const allowed = ['name', 'type', 'parent_id', 'short_description', 'long_explanation'];
  const filtered = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));
  return dbUtils.update(TABLE, { id }, filtered);
}

// Delete an organization
function deleteOrganization(id) {
  return dbUtils.remove(TABLE, { id });
}

module.exports = {
  createOrganization,
  getAllOrganizations,
  getOrganizationById,
  updateOrganization,
  patchOrganization,
  deleteOrganization,
};
