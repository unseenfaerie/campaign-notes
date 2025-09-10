const entityDataService = require('../../entityDataService');
const fullEntityService = require('../fullEntityService');

function createEvent(event) {
  return entityDataService.createEntity('Event', event);
}

function getAllEvents() {
  return entityDataService.getAllEntities('Event');
}

function getEventById(id) {
  return entityDataService.getEntityById('Event', id);
}

function getFullEventById(id) {
  return fullEntityService.getFullEntityById('Event', id);
}

function patchEvent(id, updates) {
  return entityDataService.patchEntity('Event', id, updates);
}

function deleteEvent(id) {
  return entityDataService.deleteEntity('Event', id);
}

module.exports = {
  createEvent,
  getAllEvents,
  getEventById,
  patchEvent,
  deleteEvent,
  getFullEventById
};
