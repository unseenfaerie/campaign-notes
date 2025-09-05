// backend/services/simpleJoinTableService.js
// Generic service for simple join tables (no metadata, just two foreign keys)

const dbUtils = require('../utils/dbUtils');
const { entityRegistry, entityTableMap } = require('../../common/entityRegistry');
const entities = require('../../common/entities');

/**
 * Find the registry entry for a given join table name (e.g. 'spell_spheres')
 * Throws if not found or not type 'simple'.
 */
function getSimpleJoinTableInfo(joinTable) {
  for (const entity in entityRegistry) {
    for (const assoc of entityRegistry[entity]) {
      if (assoc.joinTable === joinTable && assoc.type === 'simple') {
        return assoc;
      }
    }
  }
  throw new Error(`No simple join table registry entry for: ${joinTable}`);
}

/**
 * Create a new linkage in a simple join table.
 * @param {string} joinTable - e.g. 'spell_spheres'
 * @param {object} ids - e.g. { spell_id, sphere_id }
 */
function createLinkage(joinTable, ids) {
  const info = getSimpleJoinTableInfo(joinTable);
  // Validate required fields
  if (!ids[info.mainIdField] || !ids[info.relatedIdField]) {
    throw new Error(`Missing required linkage fields: ${info.mainIdField}, ${info.relatedIdField}`);
  }

  // Use registry and table map for foreign key checks
  // Find the entity that owns this joinTable entry
  let mainEntity = null;
  for (const entityName in entityRegistry) {
    if (entityRegistry[entityName].some(assoc => assoc.joinTable === joinTable && assoc.mainIdField === info.mainIdField)) {
      mainEntity = entityName;
      break;
    }
  }
  const relatedEntity = info.relatedEntity;
  if (!mainEntity || !relatedEntity) {
    throw new Error(`Could not resolve main or related entity for join table: ${joinTable}`);
  }
  const mainTable = entityTableMap[mainEntity];
  const relatedTable = entityTableMap[relatedEntity];
  if (!mainTable || !relatedTable) {
    throw new Error(`Could not resolve table names for entities: ${mainEntity}, ${relatedEntity}`);
  }

  // Check main entity existence
  return dbUtils.select(mainTable, { id: ids[info.mainIdField] }, true)
    .then(mainRow => {
      if (!mainRow) {
        throw new Error(`Referenced ${mainEntity} (${ids[info.mainIdField]}) does not exist.`);
      }
      return dbUtils.select(relatedTable, { id: ids[info.relatedIdField] }, true);
    })
    .then(relatedRow => {
      if (!relatedRow) {
        throw new Error(`Referenced ${relatedEntity} (${ids[info.relatedIdField]}) does not exist.`);
      }
      return dbUtils.insert(joinTable, ids);
    });
}

/**
 * Get all linkages in a simple join table.
 */
function getAllLinkages(joinTable) {
  getSimpleJoinTableInfo(joinTable); // throws if not valid
  return dbUtils.select(joinTable);
}

/**
 * Get all linkages for a given entity ID in a simple join table.
 * @param {string} joinTable
 * @param {string} idField - e.g. 'spell_id' or 'sphere_id'
 * @param {string|number} idValue
 */
function getLinkagesById(joinTable, idField, idValue) {
  getSimpleJoinTableInfo(joinTable); // throws if not valid
  return dbUtils.select(joinTable, { [idField]: idValue });
}

/**
 * Delete a linkage between two entities in a simple join table.
 * @param {string} joinTable
 * @param {object} ids - e.g. { spell_id, sphere_id }
 */
function deleteLinkage(joinTable, ids) {
  const info = getSimpleJoinTableInfo(joinTable);
  if (!ids[info.mainIdField] || !ids[info.relatedIdField]) {
    throw new Error(`Missing required linkage fields: ${info.mainIdField}, ${info.relatedIdField}`);
  }
  // Check if linkage exists first
  return dbUtils.select(joinTable, ids, true)
    .then(linkage => {
      if (!linkage) {
        throw new Error(`Linkage does not exist in ${joinTable}: ${JSON.stringify(ids)}`);
      }
      return dbUtils.remove(joinTable, ids);
    })
    .then(() => ({ deleted: { ...ids } }));
}

/**
 * Delete all linkages for a given entity in a simple join table.
 * @param {string} joinTable
 * @param {object} where - e.g. { spell_id } or { sphere_id }
 */
function deleteAllLinkages(joinTable, where) {
  getSimpleJoinTableInfo(joinTable); // throws if not valid
  // Count how many will be deleted for reporting
  return dbUtils.select(joinTable, where)
    .then(rows => dbUtils.remove(joinTable, where)
      .then(() => ({ deleted: { ...where }, deletedCount: rows.length }))
    );
}

module.exports = {
  createLinkage,
  getAllLinkages,
  getLinkagesById,
  deleteLinkage,
  deleteAllLinkages
};
