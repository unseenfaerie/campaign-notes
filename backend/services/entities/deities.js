const dbUtils = require('../../utils/dbUtils');
const { updateWithChangedFields } = require('../../utils/serviceUtils');
const fullEntityService = require('../fullEntityService');

const TABLE = 'deities';

function createDeity(deity) {
  return dbUtils.insert(TABLE, deity);
}

function getAllDeities() {
  return dbUtils.select(TABLE);
}

function getDeityById(id) {
  return dbUtils.select(TABLE, { id }, true);
}

async function getFullDeityById(id) {
  return fullEntityService.getFullEntityById('Deity', id);
}

async function patchDeity(id, updates) {
  return updateWithChangedFields(TABLE, { id }, updates);
}

function deleteDeity(id) {
  return dbUtils.remove(TABLE, { id });
}

module.exports = {
  createDeity,
  getAllDeities,
  getDeityById,
  patchDeity,
  deleteDeity,
  getFullDeityById
};
