// backend/services/historicalJoinTableService.js
// Generic service for historical join tables (with two foreign keys and a date-based primary key)

const dbUtils = require('../utils/dbUtils');
const { entityRegistry, entityTableMap } = require('../../common/entityRegistry');
const ERROR_CODES = require('../../common/errorCodes');

/**
 * Find the registry entry for a given join table name (type: 'history')
 */
function getHistoricalJoinTableInfo(joinTable) {
  for (const entity in entityRegistry) {
    for (const assoc of entityRegistry[entity]) {
      if (assoc.joinTable === joinTable && assoc.type === 'history') {
        return assoc;
      }
    }
  }
  throw new Error(`No historical join table registry entry for: ${joinTable}`);
}

/**
 * Create a new historical linkage (requires all PKs: mainId, relatedId, dateKey)
 */
async function createLinkage(joinTable, idsAndMeta) {
  const info = getHistoricalJoinTableInfo(joinTable);
  const { mainIdField, relatedIdField, dateKey } = info;
  if (!idsAndMeta[mainIdField] || !idsAndMeta[relatedIdField] || !idsAndMeta[dateKey]) {
    const err = new Error(`Missing required linkage fields: ${mainIdField}, ${relatedIdField}, ${dateKey}`);
    err.code = ERROR_CODES.ENTITY_VALIDATION_FAILED;
    throw err;
  }
  // Foreign key existence checks
  let mainEntity = null;
  for (const entityName in entityRegistry) {
    if (entityRegistry[entityName].some(assoc => assoc.joinTable === joinTable && assoc.mainIdField === mainIdField)) {
      mainEntity = entityName;
      break;
    }
  }
  const relatedEntity = info.relatedEntity;
  if (!mainEntity || !relatedEntity) {
    const err = new Error(`Could not resolve main or related entity for join table: ${joinTable}`);
    err.code = ERROR_CODES.ENTITY_VALIDATION_FAILED;
    throw err;
  }
  const mainTable = entityTableMap[mainEntity];
  const relatedTable = entityTableMap[relatedEntity];
  // Check main entity existence
  await dbUtils.select(mainTable, { id: idsAndMeta[mainIdField] }, true);
  await dbUtils.select(relatedTable, { id: idsAndMeta[relatedIdField] }, true);
  // Insert (let dbUtils handle duplicate error)
  await dbUtils.insert(joinTable, idsAndMeta);
  return { id: { [mainIdField]: idsAndMeta[mainIdField], [relatedIdField]: idsAndMeta[relatedIdField], [dateKey]: idsAndMeta[dateKey] } };
}

/**
 * Get all linkages for a given entity (by main or related id)
 */
function getLinkagesById(joinTable, idField, idValue) {
  getHistoricalJoinTableInfo(joinTable); // throws if not valid
  if (idField && idValue === undefined) {
    const err = new Error(`Missing value for idField: ${idField}`);
    err.code = ERROR_CODES.ENTITY_VALIDATION_FAILED;
    throw err;
  }
  return idField ? dbUtils.select(joinTable, { [idField]: idValue }) : dbUtils.select(joinTable);
}

/**
 * Get a specific linkage (by all PKs)
 */
function getLinkage(joinTable, ids) {
  getHistoricalJoinTableInfo(joinTable);
  if (!ids || typeof ids !== 'object' || Object.keys(ids).length === 0) {
    const err = new Error('Missing or invalid primary key fields for lookup.');
    err.code = ERROR_CODES.ENTITY_VALIDATION_FAILED;
    throw err;
  }
  // Let dbUtils handle not found error
  return dbUtils.select(joinTable, ids, true);
}

/**
 * Patch metadata fields for a linkage (cannot patch PKs)
 */
async function patchLinkage(joinTable, ids, updates) {
  const info = getHistoricalJoinTableInfo(joinTable);
  const { mainIdField, relatedIdField, dateKey, joinFields } = info;
  // Prevent patching PKs
  for (const key of [mainIdField, relatedIdField, dateKey]) {
    if (key in updates) {
      const err = new Error(`Cannot update primary key field: ${key}`);
      err.code = ERROR_CODES.ENTITY_VALIDATION_FAILED;
      throw err;
    }
  }
  // Only allow patching joinFields (metadata)
  const allowed = joinFields;
  const filtered = {};
  for (const key of Object.keys(updates)) {
    if (allowed.includes(key)) filtered[key] = updates[key];
  }
  if (Object.keys(filtered).length === 0) {
    const err = new Error('No valid fields to update.');
    err.code = ERROR_CODES.ENTITY_VALIDATION_FAILED;
    throw err;
  }
  // Patch
  return dbUtils.update(joinTable, ids, filtered);
}

/**
 * Delete a specific linkage (by all PKs)
 */
async function deleteLinkage(joinTable, ids) {
  getHistoricalJoinTableInfo(joinTable);
  // Let dbUtils handle not found error
  await dbUtils.remove(joinTable, ids);
  return { deleted: { ...ids } };
}

/**
 * Bulk delete all linkages for a given entity (by main or related id)
 */
async function deleteAllLinkages(joinTable, where) {
  getHistoricalJoinTableInfo(joinTable);
  const rows = await dbUtils.select(joinTable, where);
  await dbUtils.remove(joinTable, where);
  return { deleted: { ...where }, deletedCount: rows.length };
}

module.exports = {
  createLinkage,
  getLinkagesById,
  getLinkage,
  patchLinkage,
  deleteLinkage,
  deleteAllLinkages
};
