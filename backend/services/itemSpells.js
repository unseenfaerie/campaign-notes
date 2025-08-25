// services/itemSpells.js
const dbUtils = require('../utils/dbUtils');
const TABLE = 'item_spells';

function addItemSpell(item_id, spell_id) { return dbUtils.insert(TABLE, { item_id, spell_id }); }
function getSpellsForItem(item_id) { return dbUtils.select(TABLE, { item_id }); }
function getItemsForSpell(spell_id) { return dbUtils.select(TABLE, { spell_id }); }
function removeItemSpell(item_id, spell_id) { return dbUtils.remove(TABLE, { item_id, spell_id }); }

module.exports = { addItemSpell, getSpellsForItem, getItemsForSpell, removeItemSpell };
