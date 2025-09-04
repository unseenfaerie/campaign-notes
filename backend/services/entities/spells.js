// services/entities/spells.js

const dbUtils = require('../../utils/dbUtils');
const serviceUtils = require('../../utils/serviceUtils');
const TABLE = 'spells';

function addSpell(data) { return dbUtils.insert(TABLE, data); }
function getAllSpells() { return dbUtils.select(TABLE); }
function getSpellById(id) { return dbUtils.select(TABLE, { id }, true); }

function patchSpell(id, updates) {
  return serviceUtils.updateWithChangedFields(TABLE, { id }, updates);
}
function removeSpell(id) { return dbUtils.remove(TABLE, { id }); }

module.exports = { addSpell, getAllSpells, getSpellById, patchSpell, removeSpell };
