/**
 * dbHelpers.js
 * 
 * Provides generic CRUD helper functions for interacting with SQLite tables.
 * Each function is designed to be reusable across different service layer modules.
 */

const db = require('../db');

/**
 * Inserts a new record into the specified table.
 * 
 * @param {string} table - The name of the table to insert into.
 * @param {Object} data - An object representing the fields and values to insert.
 * @returns {Promise<Object>} - Resolves with the inserted data object.
 */
function insert(table, data) {
  const fields = Object.keys(data);
  const placeholders = fields.map(() => '?').join(', ');
  const sql = `INSERT OR IGNORE INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`;
  return new Promise((resolve, reject) => {
    db.run(sql, Object.values(data), function (err) {
      if (err) return reject(err);
      resolve(data);
    });
  });
}

/**
 * Retrieves records from the specified table matching the given criteria.
 * 
 * @param {string} table - The name of the table to query.
 * @param {Object} [where={}] - An object representing the WHERE clause fields and values.
 * @param {boolean} [single=false] - If true, resolves with a single object or null; otherwise, resolves with an array.
 * @returns {Promise<Object|Array>} - Resolves with the found record(s).
 */
function select(table, where = {}, single = false) {
  const fields = Object.keys(where);
  const clause = fields.length ? `WHERE ${fields.map(f => `${f} = ?`).join(' AND ')}` : '';
  const sql = `SELECT * FROM ${table} ${clause}`;
  return new Promise((resolve, reject) => {
    const cb = (err, rows) => {
      if (err) return reject(err);
      resolve(single ? (rows[0] || null) : (rows || []));
    };
    if (single) db.get(sql, Object.values(where), (err, row) => cb(err, [row]));
    else db.all(sql, Object.values(where), cb);
  });
}

/**
 * Updates records in the specified table matching the given criteria.
 * 
 * @param {string} table - The name of the table to update.
 * @param {Object} where - An object representing the WHERE clause fields and values.
 * @param {Object} updates - An object representing the fields and new values to update.
 * @returns {Promise<Object>} - Resolves with the where object or a message if no updates were made.
 */
function update(table, where, updates) {
  const updateFields = Object.keys(updates);
  if (!updateFields.length) return Promise.resolve({ ...where, message: "no updates made" });
  const setClause = updateFields.map(f => `${f} = ?`).join(', ');
  const whereFields = Object.keys(where);
  const whereClause = whereFields.map(f => `${f} = ?`).join(' AND ');
  const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
  return new Promise((resolve, reject) => {
    db.run(sql, [...updateFields.map(f => updates[f]), ...whereFields.map(f => where[f])], function (err) {
      if (err) return reject(err);
      resolve({ ...where });
    });
  });
}

/**
 * Deletes records from the specified table matching the given criteria.
 * 
 * @param {string} table - The name of the table to delete from.
 * @param {Object} where - An object representing the WHERE clause fields and values.
 * @returns {Promise<Object>} - Resolves with the where object.
 */
function remove(table, where) {
  const fields = Object.keys(where);
  const clause = fields.map(f => `${f} = ?`).join(' AND ');
  const sql = `DELETE FROM ${table} WHERE ${clause}`;
  return new Promise((resolve, reject) => {
    db.run(sql, Object.values(where), function (err) {
      if (err) return reject(err);
      resolve({ ...where });
    });
  });
}

module.exports = { insert, select, update, remove };