// utils/serviceUtils.js
// High-level service helpers for update patterns
const dbUtils = require('./dbUtils');

/**
 * Generic update helper for service layers.
 * Fetches the original, filters allowed fields, compares, updates, and returns changed fields.
 * @param {string} table - Table name
 * @param {Object} where - Where clause for identifying the record
 * @param {Object} updates - Fields to update
 * @param {string[]} allowedFields - List of allowed fields to update
 * @returns {Promise<Object>} - Info about the update and changed fields
 */
async function updateWithChangedFields(table, where, updates, allowedFields) {
  const filtered = Object.fromEntries(
    Object.entries(updates).filter(([k]) => allowedFields.includes(k))
  );
  if (Object.keys(filtered).length === 0) {
    return { ...where, message: 'no updates made' };
  }
  const original = await dbUtils.select(table, where, true);
  if (!original) {
    return { ...where, message: 'record not found' };
  }
  const changedFields = dbUtils.getChangedFields(original, { ...original, ...filtered });
  if (Object.keys(changedFields).length === 0) {
    return { ...where, message: 'no changes detected' };
  }
  await dbUtils.update(table, where, changedFields);
  return { ...where, ...changedFields };
}

module.exports = { updateWithChangedFields };
