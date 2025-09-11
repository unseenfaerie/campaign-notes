const entityDataService = require('../entityDataService');
const fullEntityService = require('../fullEntityService');

function createSphere(sphere) {
  return entityDataService.createEntity('Sphere', sphere);
}
function getAllSpheres() {
  return entityDataService.getAllEntities('Sphere');
}
function getSphereById(id) {
  return entityDataService.getEntityById('Sphere', id);
}

function getFullSphereById(id) {
  return fullEntityService.getFullEntityById('Sphere', id);
}

function patchSphere(id, updates) {
  return entityDataService.patchEntity('Sphere', id, updates);
}

function deleteSphere(id) {
  return entityDataService.deleteEntity('Sphere', id);
}

module.exports = {
  createSphere,
  getAllSpheres,
  getSphereById,
  getFullSphereById,
  patchSphere,
  deleteSphere
};
