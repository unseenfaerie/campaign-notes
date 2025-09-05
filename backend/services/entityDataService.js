
const { entityTableMap } = require('../../common/entityRegistry');
const dbUtils = require('../utils/dbUtils');
const serviceUtils = require('../utils/serviceUtils');
const fullEntityService = require('./fullEntityService');
const { validateIdFormat } = require('../utils/idUtils');
const { validateFields } = require('../../common/validate');

function getTable(entityType) {
  const table = entityTableMap[entityType];
  if (!table) throw new Error(`No table mapping for entity type: ${entityType}`);
  return table;
}


async function createEntity(entityType, data) {
  // ID format validation (for main entities)
  if (data.id !== undefined && !validateIdFormat(data.id)) {
    throw new Error('Invalid or missing id: must be lowercase letters and dashes only');
  }
  // Schema validation
  const { valid, errors, validated } = validateFields(entityType, data);
  if (!valid) {
    throw new Error('Validation failed: ' + errors.join('; '));
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
    throw new Error('Validation failed: ' + errors.join('; '));
  }
  const result = await serviceUtils.updateWithChangedFields(getTable(entityType), { id }, validated);
  if (result && result.message === 'record not found') {
    const err = new Error('Record not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  return result;
}


async function deleteEntity(entityType, id) {
  // Try to delete, then check if any row was actually deleted
  const table = getTable(entityType);
  // First, check if the record exists
  const existing = await dbUtils.select(table, { id }, true);
  if (!existing) {
    const err = new Error('Record not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  await dbUtils.remove(table, { id });
  return { deleted: { id } };
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
