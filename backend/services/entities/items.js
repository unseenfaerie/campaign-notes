const dbUtils = require('../../utils/dbUtils');
const serviceUtils = require('../../utils/serviceUtils');
const characterService = require('../entities/characters');
const eventService = require('../entities/events');
const spellService = require('../entities/spells');
const characterItems = require('../joinTables/characterItems');
const eventItems = require('../joinTables/eventItems');
const itemSpells = require('../joinTables/itemSpells');

const TABLE = 'items';

function createItem(item) {
  return dbUtils.insert(TABLE, item);
}

function getAllItems() {
  return dbUtils.select(TABLE);
}

function getItemById(id) {
  return dbUtils.select(TABLE, { id }, true);
}

function updateItem(id, item) {
  const allowed = ['name', 'short_description', 'long_explanation'];
  const updates = {};
  for (const key of allowed) {
    if (item[key] !== undefined) updates[key] = item[key];
  }
  return dbUtils.update(TABLE, { id }, updates);
}

function patchItem(id, updates) {
  const allowed = ['name', 'short_description', 'long_explanation'];
  return serviceUtils.updateWithChangedFields(TABLE, { id }, updates, allowed);
}

function deleteItem(id) {
  return dbUtils.remove(TABLE, { id });
}

// Helper: Get full item with associations and join metadata
async function getFullItemById(id) {
  // Get the item itself
  const item = await getItemById(id);
  if (!item) return null;

  // Get associated characters with join metadata (history)
  const characters = await characterItems.getCharactersForItem(id);

  // Get associated events with join metadata
  const events = await eventItems.getEventsForItem(id);

  // Get associated spells (just join table info)
  const spells = await itemSpells.getSpellsForItem(id);

  return {
    ...item,
    characters,
    events,
    spells
  };
}

module.exports = {
  createItem,
  getAllItems,
  getItemById,
  getFullItemById,
  updateItem,
  patchItem,
  deleteItem
};
