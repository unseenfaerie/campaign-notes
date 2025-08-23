// services/characterOrganizations.js
// Centralized logic for managing character-organization relationships
const db = require('../db');

// Get all organization IDs for a character
function getOrganizationIdsForCharacter(character_id) {
  return new Promise((resolve, reject) => {
    db.all('SELECT DISTINCT organization_id FROM character_organizations WHERE character_id = ?', [character_id], (err, rows) => {
      if (err) return reject(err);
      resolve(rows.map(r => r.organization_id));
    });
  });
}

// Get all records for a character-organization pair (all joinings)
function getAllCharacterOrganizationRecords(character_id, organization_id) {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM character_organizations WHERE character_id = ? AND organization_id = ?', [character_id, organization_id], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

// Get a specific character-organization relationship by joined_date
function getCharacterOrganizationByDate(character_id, organization_id, joined_date) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM character_organizations WHERE character_id = ? AND organization_id = ? AND joined_date = ?', [character_id, organization_id, joined_date], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

// Remove a single instance of organization membership from a character
function removeInstanceCharacterOrganization(character_id, organization_id, joined_date) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM character_organizations WHERE character_id = ? AND organization_id = ? AND joined_date = ?', [character_id, organization_id, joined_date], function (err) {
      if (err) return reject(err);
      resolve({ character_id, organization_id, joined_date });
    });
  });
}

// Remove ALL organization relationships for this character
function removeCharacterOrganizationRecords(character_id, organization_id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM character_organizations WHERE character_id = ? AND organization_id = ?', [character_id, organization_id], function (err) {
      if (err) return reject(err);
      resolve({ character_id, organization_id });
    });
  });
}

// Remove ALL organization relationships for this character
function removeAllCharacterOrganizationRecords(character_id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM character_organizations WHERE character_id = ?', [character_id], function (err) {
      if (err) return reject(err);
      resolve({ character_id });
    });
  });
}


function addCharacterOrganization(character_id, organization_id, joined_date = '', left_date = '', short_description = '', long_explanation = '') {
  return new Promise((resolve, reject) => {
    const sql = `INSERT OR IGNORE INTO character_organizations (character_id, organization_id, joined_date, left_date, short_description, long_explanation)
                 VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(sql, [character_id, organization_id, joined_date, left_date, short_description, long_explanation], function (err) {
      if (err) return reject(err);
      resolve({ character_id, organization_id });
    });
  });
}

// Get all organizations for a character (join table only)
function getOrganizationsForCharacter(character_id) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM character_organizations WHERE character_id = ?`;
    db.all(sql, [character_id], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

// Get all characters for an organization (join table only)
function getCharactersForOrganization(organization_id) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM character_organizations WHERE organization_id = ?`;
    db.all(sql, [organization_id], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

// Get a specific character-organization relationship
function getCharacterOrganization(character_id, organization_id) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM character_organizations WHERE character_id = ? AND organization_id = ?`;
    db.get(sql, [character_id, organization_id], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

function updateCharacterOrganization(character_id, organization_id, joined_date, updates) {
  const allowed = ['left_date', 'short_description', 'long_explanation'];
  const fields = Object.keys(updates).filter(key => allowed.includes(key));
  if (fields.length === 0) return Promise.resolve({ organization_id, character_id, joined_date, message: "no updates made" });

  const setClause = fields.map(field => `${field} = ?`).join(', ');
  const values = fields.map(field => updates[field]);
  values.push(character_id, organization_id, joined_date);

  const sql = `UPDATE character_organizations SET ${setClause} WHERE character_id = ? AND organization_id = ? AND joined_date = ?`;
  return new Promise((resolve, reject) => {
    db.run(sql, values, function (err) {
      if (err) return reject(err);
      resolve({ character_id, organization_id, joined_date });
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

module.exports = {
  addCharacterOrganization,
  updateCharacterOrganization,
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
