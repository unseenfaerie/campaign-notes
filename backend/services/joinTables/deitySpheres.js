// services/deitySpheres.js
const simpleJoinTableService = require('../simpleJoinTableService');

const tableName = 'deity_spheres';

function addDeitySphere(linkage) {
  // linkage: { deity_id, sphere_id }
  return simpleJoinTableService.createLinkage(tableName, linkage);
}

function getSpheresForDeity(deity_id) {
  return simpleJoinTableService.getLinkagesById(tableName, 'deity_id', deity_id);
}

function getDeitiesForSphere(sphere_id) {
  return simpleJoinTableService.getLinkagesById(tableName, 'sphere_id', sphere_id);
}

function removeAllSpheresForDeity(deity_id) {
  return simpleJoinTableService.deleteAllLinkages(tableName, { deity_id });
}

function removeAllDeitiesForSphere(sphere_id) {
  return simpleJoinTableService.deleteAllLinkages(tableName, { sphere_id });
}

function removeDeitySphere(linkage) {
  // linkage: { deity_id, sphere_id }
  return simpleJoinTableService.deleteLinkage(tableName, linkage);
}

module.exports = {
  addDeitySphere,
  getSpheresForDeity,
  getDeitiesForSphere,
  removeDeitySphere,
  removeAllSpheresForDeity,
  removeAllDeitiesForSphere
};
