// services/character.js
// Centralized logic for managing character CRUD and queries
const db = require('../db');

// Create a new character
function createCharacter(character) {
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO characters (id, type, name, class, level, alignment, strength, dexterity, constitution, intelligence, wisdom, charisma, total_health, deceased, short_description, long_explanation)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [
      character.id, character.type, character.name, character.class, character.level, character.alignment,
      character.strength, character.dexterity, character.constitution, character.intelligence, character.wisdom,
      character.charisma, character.total_health, character.deceased, character.short_description, character.long_explanation
    ];
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ id: character.id });
    });
  });
}

// Get all characters
function getAllCharacters() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM characters', [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

// Get a character by id
function getCharacterById(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM characters WHERE id = ?', [id], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

// Update a character (full update)
function updateCharacter(id, character) {
  return new Promise((resolve, reject) => {
    const sql = `UPDATE characters SET type=?, name=?, class=?, level=?, alignment=?, strength=?, dexterity=?, constitution=?, intelligence=?, wisdom=?, charisma=?, total_health=?, deceased=?, description=? WHERE id=?`;
    const params = [
      character.type, character.name, character.class, character.level, character.alignment,
      character.strength, character.dexterity, character.constitution, character.intelligence, character.wisdom,
      character.charisma, character.total_health, character.deceased, character.description, id
    ];
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ updated: id });
    });
  });
}

// Patch (partial update) a character
function patchCharacter(id, updates) {
  return new Promise((resolve, reject) => {
    const allowed = ['type', 'name', 'class', 'level', 'alignment', 'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'total_health', 'deceased', 'short_description', 'long_explanation'];
    const fields = Object.keys(updates).filter(key => allowed.includes(key));
    if (fields.length === 0) return resolve({ updated: id });
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const params = fields.map(f => updates[f]);
    params.push(id);
    const sql = `UPDATE characters SET ${setClause} WHERE id = ?`;
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ updated: id });
    });
  });
}

// Delete a character
function deleteCharacter(id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM characters WHERE id = ?', [id], function (err) {
      if (err) return reject(err);
      resolve({ deleted: id });
    });
  });
}

module.exports = {
  createCharacter,
  getAllCharacters,
  getCharacterById,
  updateCharacter,
  patchCharacter,
  deleteCharacter
};
