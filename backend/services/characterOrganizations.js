// services/characterOrganizations.js
// Centralized logic for managing character-organization relationships
const db = require('../db');

function addCharacterOrganization(character_id, organization_id, short_description = '', long_explanation = '') {
  return new Promise((resolve, reject) => {
    const sql = `INSERT OR IGNORE INTO character_organizations (character_id, organization_id, short_description, long_explanation)
                 VALUES (?, ?, ?, ?)`;
    db.run(sql, [character_id, organization_id, short_description, long_explanation], function (err) {
      if (err) return reject(err);
      resolve({ character_id, organization_id });
    });
  });
}

function updateCharacterOrganization(character_id, organization_id, updates) {
  const fields = [];
  const values = [];
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

module.exports = {
  addCharacterOrganization,
  updateCharacterOrganization,
  removeCharacterOrganization
};
