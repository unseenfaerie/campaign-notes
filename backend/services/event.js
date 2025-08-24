const dbUtils = require('../utils/dbUtils');

const TABLE = 'events';

// Create a new event
function createEvent(event) {
  return dbUtils.insert(TABLE, event);
}

// Get all events
function getAllEvents() {
  return dbUtils.select(TABLE);
}

// Get an event by id
function getEventById(id) {
  return dbUtils.select(TABLE, { id }, true);
}

// Update an event (full update)
function updateEvent(id, event) {
  // Only update allowed fields (excluding id)
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

// Patch (partial update) an event
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

// Delete an event
function deleteEvent(id) {
  return dbUtils.remove(TABLE, { id });
}

module.exports = {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  patchEvent,
  deleteEvent
};