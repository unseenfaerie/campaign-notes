const dbUtils = require('../../utils/dbUtils');
const serviceUtils = require('../../utils/serviceUtils');
const fullEntityService = require('../fullEntityService');

const TABLE = 'events';

function createEvent(event) {
  return dbUtils.insert(TABLE, event);
}

function getAllEvents() {
  return dbUtils.select(TABLE);
}

function getEventById(id) {
  return dbUtils.select(TABLE, { id }, true);
}

async function getFullEventById(id) {
  return fullEntityService.getFullEntityById('Event', id);
}

function updateEvent(id, event) {
  return dbUtils.update(TABLE, { id }, event);
}

function patchEvent(id, updates) {
  return serviceUtils.updateWithChangedFields(TABLE, { id }, updates);
}

function deleteEvent(id) {
  return dbUtils.remove(TABLE, { id });
}

module.exports = {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  patchEvent,
  deleteEvent,
  getFullEventById
};
