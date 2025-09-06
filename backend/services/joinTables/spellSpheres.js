// services/joinTables/spellSpheres.js
const simpleJoinTableService = require('../simpleJoinTableService');

const tableName = 'spell_spheres';

function addSpellSphere(spell_id, sphere_id) {
  return simpleJoinTableService.createLinkage(tableName, { spell_id, sphere_id });
}

function getSpheresForSpell(spell_id) {
  return simpleJoinTableService.getLinkagesById(tableName, 'spell_id', spell_id);
}

function getSpellsForSphere(sphere_id) {
  return simpleJoinTableService.getLinkagesById(tableName, 'sphere_id', sphere_id);
}

function removeAllSpheresForSpell(spell_id) {
  return simpleJoinTableService.deleteAllLinkages(tableName, { spell_id });
}

function removeSpellSphere(spell_id, sphere_id) {
  return simpleJoinTableService.deleteLinkage(tableName, { spell_id, sphere_id });
}

module.exports = {
  addSpellSphere,
  getSpheresForSpell,
  getSpellsForSphere,
  removeSpellSphere,
  removeAllSpheresForSpell
};
