const dbUtils = require('../../utils/dbUtils');
const serviceUtils = require('../../utils/serviceUtils');
const fullEntityService = require('../fullEntityService');

const TABLE = 'spells';

function addSpell(data) {
  return dbUtils.insert(TABLE, data);
}
function getAllSpells() {
  return dbUtils.select(TABLE);
}
function getSpellById(id) {
  return dbUtils.select(TABLE, { id }, true);
}

async function getFullSpellById(id) {
  return fullEntityService.getFullEntityById('Spell', id);
}

function patchSpell(id, updates) {
  return serviceUtils.updateWithChangedFields(TABLE, { id }, updates);
}

function removeSpell(id) {
  return dbUtils.remove(TABLE, { id });
}

module.exports = {
  addSpell,
  getAllSpells,
  getSpellById,
  getFullSpellById,
  patchSpell,
  removeSpell
};
