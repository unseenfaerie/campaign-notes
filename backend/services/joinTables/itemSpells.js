// services/joinTables/itemSpells.js
const simpleJoinTableService = require('../simpleJoinTableService');

const tableName = 'item_spells';

function addItemSpell(linkage) {
  // linkage should be an object with item_id, spell_id, and possibly extra fields
  return simpleJoinTableService.createLinkage(tableName, linkage);
}

function getSpellsForItem(item_id) {
  return simpleJoinTableService.getLinkagesById(tableName, 'item_id', item_id);
}

function getItemsForSpell(spell_id) {
  return simpleJoinTableService.getLinkagesById(tableName, 'spell_id', spell_id);
}


function removeAllItemsForSpell(spell_id) {
  return simpleJoinTableService.deleteAllLinkages(tableName, { spell_id });
}

function removeAllSpellsForItem(item_id) {
  return simpleJoinTableService.deleteAllLinkages(tableName, { item_id });
}

function removeItemSpell(item_id, spell_id) {
  return simpleJoinTableService.deleteLinkage(tableName, { item_id, spell_id });
}

module.exports = {
  addItemSpell,
  getSpellsForItem,
  getItemsForSpell,
  removeItemSpell,
  removeAllItemsForSpell,
  removeAllSpellsForItem
};
