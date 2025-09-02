const dbUtils = require('../../utils/dbUtils');
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
  const filtered = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));
  return dbUtils.update(TABLE, { id }, filtered);
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
  const charRows = await characterItems.getCharactersForItem(id);
  // Group by character_id
  const charMap = {};
  for (const row of charRows) {
    if (!charMap[row.character_id]) charMap[row.character_id] = [];
    charMap[row.character_id].push(row);
  }
  const characters = await Promise.all(Object.keys(charMap).map(async charId => {
    const charInfo = await characterService.getCharacterById(charId);
    return {
      ...charInfo,
      history: charMap[charId]
    };
  }));

  // Get associated events with join metadata
  const eventRows = await eventItems.getEventsForItem(id);
  // Group by event_id
  const eventMap = {};
  for (const row of eventRows) {
    if (!eventMap[row.event_id]) eventMap[row.event_id] = [];
    eventMap[row.event_id].push(row);
  }
  const events = await Promise.all(Object.keys(eventMap).map(async eventId => {
    const eventInfo = await eventService.getEventById(eventId);
    return {
      ...eventInfo,
      join: eventMap[eventId]
    };
  }));

  // Get associated spells (no join metadata except ids)
  const spellRows = await itemSpells.getSpellsForItem(id);
  const spellIds = spellRows.map(r => r.spell_id);
  const spells = await Promise.all(spellIds.map(spellId => spellService.getSpellById(spellId)));

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
