
const { entityTableMap } = require('../../common/entityRegistry');
const dbUtils = require('../utils/dbUtils');
const serviceUtils = require('../utils/serviceUtils');
const fullEntityService = require('./fullEntityService');
const { validateIdFormat } = require('../utils/idUtils');
const { validateFields } = require('../../common/validate');
const ERROR_CODES = require('../../common/errorCodes');

function getTable(entityType) {
  const table = entityTableMap[entityType];
  if (!table) throw new Error(`No table mapping for entity type: ${entityType}`);
  return table;
}

async function createEntity(entityType, data) {
  // ID format validation (for main entities)
  if (data.id !== undefined && !validateIdFormat(data.id)) {
    const err = new Error('Invalid or missing id: must be lowercase letters and dashes only');
    err.code = ERROR_CODES.INVALID_ID;
    throw err;
  }
  // Schema/entity validation
  const { valid, errors, validated } = validateFields(entityType, data);
  if (!valid) {
    const err = new Error('Validation failed: ' + errors.join('; '));
    err.code = ERROR_CODES.ENTITY_VALIDATION_FAILED;
    err.details = errors;
    throw err;
  }
  await dbUtils.insert(getTable(entityType), validated);
  return { id: validated.id };
}

function getAllEntities(entityType) {
  return dbUtils.select(getTable(entityType));
}

function getEntityById(entityType, id) {
  return dbUtils.select(getTable(entityType), { id }, true);
}



async function patchEntity(entityType, id, updates) {
  // Allow partial validation for patch
  const { valid, errors, validated } = validateFields(entityType, updates, { allowPartial: true });
  if (!valid) {
    const err = new Error('Validation failed: ' + errors.join('; '));
    err.code = ERROR_CODES.ENTITY_VALIDATION_FAILED;
    err.details = errors;
    throw err;
  }
  // Let dbUtils/serviceUtils handle not found and no changes made
  return serviceUtils.updateWithChangedFields(getTable(entityType), { id }, validated);
}


async function deleteEntity(entityType, id) {
  // Let dbUtils handle not found and no changes made
  const table = getTable(entityType);
  return dbUtils.remove(table, { id });
}

function getFullEntity(entityType, id) {
  return fullEntityService.getFullEntityById(entityType, id);
}

module.exports = {
  createEntity,
  getAllEntities,
  getEntityById,
  getFullEntity,
  patchEntity,
  deleteEntity
};
