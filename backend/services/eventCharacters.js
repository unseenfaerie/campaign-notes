// services/eventCharacters.js
// Centralized logic for managing event-character relationships
const db = require('../db');

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

function updateEventCharacter(event_id, character_id, updates) {
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
  if (fields.length === 0) return Promise.resolve({ event_id, character_id });
  values.push(event_id, character_id);
  const sql = `UPDATE event_characters SET ${fields.join(', ')} WHERE event_id = ? AND character_id = ?`;
  return new Promise((resolve, reject) => {
    db.run(sql, values, function (err) {
      if (err) return reject(err);
      resolve({ event_id, character_id });
    });
  });
}

function removeEventCharacter(event_id, character_id) {
  return new Promise((resolve, reject) => {
    const sql = `DELETE FROM event_characters WHERE event_id = ? AND character_id = ?`;
    db.run(sql, [event_id, character_id], function (err) {
      if (err) return reject(err);
      resolve({ event_id, character_id });
    });
  });
}

// Get all events for a character (with join table metadata)
function getEventsForCharacter(character_id) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT e.*, ec.short_description, ec.long_explanation
                 FROM event_characters ec
                 JOIN events e ON ec.event_id = e.id
                 WHERE ec.character_id = ?`;
    db.all(sql, [character_id], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

// Get all characters for an event (with join table metadata)
function getCharactersForEvent(event_id) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT c.*, ec.short_description, ec.long_explanation
                 FROM event_characters ec
                 JOIN characters c ON ec.character_id = c.id
                 WHERE ec.event_id = ?`;
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

module.exports = {
  addEventCharacter,
  updateEventCharacter,
  removeEventCharacter,
  getCharactersForEvent,
  getEventsForCharacter,
  getEventCharacter
};
