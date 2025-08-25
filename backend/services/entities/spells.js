// services/entities/spells.js
const dbUtils = require('../../utils/dbUtils');
const TABLE = 'spells';

function addSpell(data) { return dbUtils.insert(TABLE, data); }
function getAllSpells() { return dbUtils.select(TABLE); }
function getSpellById(id) { return dbUtils.select(TABLE, { id }, true); }
function updateSpell(id, updates) { return dbUtils.update(TABLE, { id }, updates); }
function removeSpell(id) { return dbUtils.remove(TABLE, { id }); }

module.exports = { addSpell, getAllSpells, getSpellById, updateSpell, removeSpell };
