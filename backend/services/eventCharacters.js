// services/eventCharacters.js
// Centralized logic for managing event-character relationships
const db = require('../db');

// Create a new event-character association
function addEventCharacter(event_id, character_id, short_description, long_explanation) {
  return new Promise((resolve, reject) => {
    const sql = `INSERT OR IGNORE INTO event_characters (event_id, character_id, short_description, long_explanation)
                     VALUES (?, ?, ?, ?)`;
    db.run(sql, [event_id, character_id, short_description, long_explanation], function (err) {
      if (err) return reject(err);
      resolve({ event_id, character_id });
    });
  });
}

// Get all events for a character (join table only)
function getEventsForCharacter(character_id) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM event_characters WHERE character_id = ?`;
    db.all(sql, [character_id], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

// Get all characters for an event (join table only)
function getCharactersForEvent(event_id) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM event_characters WHERE event_id = ?`;
    db.all(sql, [event_id], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

// Get a specific event-character relationship (with join table metadata)
function getEventCharacter(event_id, character_id) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM event_characters WHERE event_id = ? AND character_id = ?`;
    db.get(sql, [event_id, character_id], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

// update a specific event-character relationship
function updateEventCharacter(event_id, character_id, updates) {
  const allowed = ['short_description', 'long_explanation'];
  const fields = Object.keys(updates).filter(key => allowed.includes(key));
  if (fields.length === 0) return Promise.resolve({ event_id, character_id, message: "no updates made" });

  const setClause = fields.map(field => `${field} = ?`).join(', ');
  const values = fields.map(field => updates[field]);
  values.push(event_id, character_id);

  const sql = `UPDATE event_characters SET ${setClause} WHERE event_id = ? AND character_id = ?`;
  return new Promise((resolve, reject) => {
    db.run(sql, values, function (err) {
      if (err) return reject(err);
      resolve({ event_id, character_id });
    });
  });
}

// delete a specific event-character relationship
function removeEventCharacter(event_id, character_id) {
  return new Promise((resolve, reject) => {
    const sql = `DELETE FROM event_characters WHERE event_id = ? AND character_id = ?`;
    db.run(sql, [event_id, character_id], function (err) {
      if (err) return reject(err);
      resolve({ event_id, character_id });
    });
  });
}

module.exports = {
  addEventCharacter,
  updateEventCharacter,
  removeEventCharacter,
  getCharactersForEvent,
  getEventsForCharacter,
  getEventCharacter
};
