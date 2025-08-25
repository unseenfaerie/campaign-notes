// services/spellSpheres.js
const dbUtils = require('../utils/dbUtils');
const TABLE = 'spell_spheres';

function addSpellSphere(spell_id, sphere_id) { return dbUtils.insert(TABLE, { spell_id, sphere_id }); }
function getSpheresForSpell(spell_id) { return dbUtils.select(TABLE, { spell_id }); }
function getSpellsForSphere(sphere_id) { return dbUtils.select(TABLE, { sphere_id }); }
function removeSpellSphere(spell_id, sphere_id) { return dbUtils.remove(TABLE, { spell_id, sphere_id }); }

module.exports = { addSpellSphere, getSpheresForSpell, getSpellsForSphere, removeSpellSphere };
