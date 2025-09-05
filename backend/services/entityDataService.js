
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


function createEntity(entityType, data) {
  // ID format validation (for main entities)
  if (data.id !== undefined && !validateIdFormat(data.id)) {
    throw new Error('Invalid or missing id: must be lowercase letters and dashes only');
  }
  // Schema validation
  const { valid, errors, validated } = validateFields(entityType, data);
  if (!valid) {
    throw new Error('Validation failed: ' + errors.join('; '));
  }
  return dbUtils.insert(getTable(entityType), validated);
}

function getAllEntities(entityType) {
  return dbUtils.select(getTable(entityType));
}

function getEntityById(entityType, id) {
  return dbUtils.select(getTable(entityType), { id }, true);
}


function patchEntity(entityType, id, updates) {
  // Allow partial validation for patch
  const { valid, errors, validated } = validateFields(entityType, updates, { allowPartial: true });
  if (!valid) {
    throw new Error('Validation failed: ' + errors.join('; '));
  }
  return serviceUtils.updateWithChangedFields(getTable(entityType), { id }, validated);
}

function deleteEntity(entityType, id) {
  return dbUtils.remove(getTable(entityType), { id });
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
