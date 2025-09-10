// services/joinTables/eventDeities.js
const relationshipJoinTableService = require('../relationshipJoinTableService');

const tableName = 'event_deities';

function addEventDeity(linkage) {
  // linkage: { event_id, deity_id, short_description, long_explanation }
  return relationshipJoinTableService.createLinkage(tableName, linkage);
}

function getDeitiesForEvent(event_id) {
  return relationshipJoinTableService.getLinkagesById(tableName, 'event_id', event_id);
}

function getEventsForDeity(deity_id) {
  return relationshipJoinTableService.getLinkagesById(tableName, 'deity_id', deity_id);
}

function getEventDeity(linkage) {
  // linkage: { event_id, deity_id }
  return relationshipJoinTableService.getLinkage(tableName, linkage);
}

function patchEventDeity(linkage, updates) {
  // linkage: { event_id, deity_id }
  return relationshipJoinTableService.patchLinkage(tableName, linkage, updates);
}

function removeEventDeity(linkage) {
  // linkage: { event_id, deity_id }
  return relationshipJoinTableService.deleteLinkage(tableName, linkage);
}

module.exports = {
  addEventDeity,
  getDeitiesForEvent,
  getEventsForDeity,
  getEventDeity,
  patchEventDeity,
  removeEventDeity
};
