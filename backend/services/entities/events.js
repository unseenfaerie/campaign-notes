// services/entities/event.js
const dbUtils = require('../../utils/dbUtils');
const serviceUtils = require('../../utils/serviceUtils');
const TABLE = 'events';

function createEvent(event) { return dbUtils.insert(TABLE, event); }
function getAllEvents() { return dbUtils.select(TABLE); }
function getEventById(id) { return dbUtils.select(TABLE, { id }, true); }
function updateEvent(id, event) {
  // Route already validates and filters allowed fields
  return dbUtils.update(TABLE, { id }, event);
}
function patchEvent(id, updates) {
  // Route already validates and filters allowed fields
  return serviceUtils.updateWithChangedFields(TABLE, { id }, updates);
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
