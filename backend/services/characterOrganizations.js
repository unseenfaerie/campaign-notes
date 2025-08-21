// services/characterOrganizations.js
// Centralized logic for managing character-organization relationships
const db = require('../db');

function addCharacterOrganization(character_id, organization_id, role = '', joined_date = '', left_date = '', short_description = '', long_explanation = '') {
  return new Promise((resolve, reject) => {
    const sql = `INSERT OR IGNORE INTO character_organizations (character_id, organization_id, role, joined_date, left_date, short_description, long_explanation)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.run(sql, [character_id, organization_id, role, joined_date, left_date, short_description, long_explanation], function (err) {
      if (err) return reject(err);
      resolve({ character_id, organization_id });
    });
  });
}

function updateCharacterOrganization(character_id, organization_id, updates) {
  const fields = [];
  const values = [];
  if (updates.role !== undefined) {
    fields.push('role = ?');
    values.push(updates.role);
  }
  if (updates.joined_date !== undefined) {
    fields.push('joined_date = ?');
    values.push(updates.joined_date);
  }
  if (updates.left_date !== undefined) {
    fields.push('left_date = ?');
    values.push(updates.left_date);
  }
  if (updates.short_description !== undefined) {
    fields.push('short_description = ?');
    values.push(updates.short_description);
  }
  if (updates.long_explanation !== undefined) {
    fields.push('long_explanation = ?');
    values.push(updates.long_explanation);
  }
  if (fields.length === 0) return Promise.resolve({ character_id, organization_id });
  values.push(character_id, organization_id);
  const sql = `UPDATE character_organizations SET ${fields.join(', ')} WHERE character_id = ? AND organization_id = ?`;
  return new Promise((resolve, reject) => {
    db.run(sql, values, function (err) {
      if (err) return reject(err);
      resolve({ character_id, organization_id });
    });
  });
}

function removeCharacterOrganization(character_id, organization_id) {
  return new Promise((resolve, reject) => {
    const sql = `DELETE FROM character_organizations WHERE character_id = ? AND organization_id = ?`;
    db.run(sql, [character_id, organization_id], function (err) {
      if (err) return reject(err);
      resolve({ character_id, organization_id });
    });
  });
}

// Get all organizations for a character (with join table metadata)
function getOrganizationsForCharacter(character_id) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT o.*, co.short_description, co.long_explanation
                 FROM character_organizations co
                 JOIN organizations o ON co.organization_id = o.id
                 WHERE co.character_id = ?`;
    db.all(sql, [character_id], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

// Get all characters for an organization (with join table metadata)
function getCharactersForOrganization(organization_id) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT c.*, co.short_description, co.long_explanation
                 FROM character_organizations co
                 JOIN characters c ON co.character_id = c.id
                 WHERE co.organization_id = ?`;
    db.all(sql, [organization_id], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

// Get a specific character-organization relationship (with join table metadata)
function getCharacterOrganization(character_id, organization_id) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM character_organizations WHERE character_id = ? AND organization_id = ?`;
    db.get(sql, [character_id, organization_id], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

module.exports = {
  addCharacterOrganization,
  updateCharacterOrganization,
  removeCharacterOrganization,
  getOrganizationsForCharacter,
  getCharactersForOrganization,
  getCharacterOrganization
};
