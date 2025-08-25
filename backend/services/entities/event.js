// services/entities/event.js
const dbUtils = require('../../utils/dbUtils');
const TABLE = 'events';

function createEvent(event) { return dbUtils.insert(TABLE, event); }
function getAllEvents() { return dbUtils.select(TABLE); }
function getEventById(id) { return dbUtils.select(TABLE, { id }, true); }
function updateEvent(id, event) {
  const allowed = [
    'name',
    'real_world_date',
    'in_game_time',
    'previous_event_id',
    'next_event_id',
    'short_description',
    'long_explanation'
  ];
  const updates = {};
  for (const key of allowed) {
    if (event[key] !== undefined) updates[key] = event[key];
  }
  return dbUtils.update(TABLE, { id }, updates);
}
function patchEvent(id, updates) {
  const allowed = [
    'name',
    'real_world_date',
    'in_game_time',
    'previous_event_id',
    'next_event_id',
    'short_description',
    'long_explanation'
  ];
  const filtered = Object.fromEntries(
    Object.entries(updates).filter(([k]) => allowed.includes(k))
  );
  return dbUtils.update(TABLE, { id }, filtered);
}
function deleteEvent(id) { return dbUtils.remove(TABLE, { id }); }

module.exports = {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  patchEvent,
  deleteEvent
};
