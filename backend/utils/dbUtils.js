/**
 * Returns an object with only the fields that have changed between original and updated.
 * @param {Object} original - The original object from the database.
 * @param {Object} updated - The updated object after changes.
 * @returns {Object} - Object with only changed fields and their new values.
 */
function getChangedFields(original, updated) {
  const changed = {};
  for (const key in updated) {
    if (
      Object.prototype.hasOwnProperty.call(updated, key) &&
      original[key] !== updated[key]
    ) {
      changed[key] = updated[key];
    }
  }
  return changed;
}

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

/**
 * Selects rows from a join between two tables, returning both main and join-table fields.
 * @param {string} joinTable - The join table name (e.g., 'character_items')
 * @param {string} mainTable - The main table name (e.g., 'items')
 * @param {string} joinKey - The key to join on (e.g., 'item_id')
 * @param {object} where - Where clause for the join table (e.g., { character_id: 1 })
 * @param {string[]} joinFields - Fields to select from the join table
 * @param {string[]} mainFields - Fields to select from the main table
 * @returns {Promise<Array>} Array of joined rows
 */
function selectJoin(joinTable, mainTable, joinKey, where, joinFields = [], mainFields = ['*']) {
  return new Promise((resolve, reject) => {
    const whereKeys = Object.keys(where);
    const whereClause = whereKeys.map(k => `${joinTable}.${k} = ?`).join(' AND ');
    const fields = [
      ...mainFields.map(f => `${mainTable}.${f}`),
      ...joinFields.map(f => `${joinTable}.${f}`)
    ].join(', ');
    const sql = `SELECT ${fields} FROM ${joinTable} JOIN ${mainTable} ON ${joinTable}.${joinKey} = ${mainTable}.id WHERE ${whereClause}`;
    db.all(sql, whereKeys.map(k => where[k]), (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

/**
 * Fetches an entity and its relationship history.
 * @param {string} mainTable - The main entity table (e.g., 'items')
 * @param {string} joinTable - The relationship table (e.g., 'character_items')
 * @param {string} entityKey - The entity's primary key (e.g., 'id')
 * @param {string} joinKey - The foreign key in the join table (e.g., 'item_id')
 * @param {any} entityId - The entity's ID value
 * @param {object} [historyWhere] - Optional extra where clause for history (e.g., { character_id: ... })
 * @param {string} [historySortField] - Field to sort history by (e.g., 'acquired_date')
 * @param {boolean} [ascending] - Sort order for history
 * @returns {Promise<{item: object, history: object[]}|null>}
 */
async function getEntityWithHistory(mainTable, joinTable, entityKey, joinKey, entityId, historyWhere = {}, historySortField, ascending = true) {
  // Get entity details
  const entityRows = await select(mainTable, { [entityKey]: entityId }, true);
  if (!entityRows) return null;

  // Build where clause for history
  const where = { ...historyWhere, [joinKey]: entityId };
  const history = await select(joinTable, where);

  // Optionally sort history
  let sortedHistory = history;
  if (historySortField) {
    // You may want to use your loreDateToSortable here if it's a date field
    sortedHistory = history.sort((a, b) => {
      if (a[historySortField] === b[historySortField]) return 0;
      return (a[historySortField] > b[historySortField] ? 1 : -1) * (ascending ? 1 : -1);
    });
  }

  return { item: entityRows, history: sortedHistory };
}

module.exports = { insert, select, update, remove, selectJoin, getEntityWithHistory, getChangedFields };