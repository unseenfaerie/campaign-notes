// services/entities/spheres.js

const dbUtils = require('../../utils/dbUtils');
const serviceUtils = require('../../utils/serviceUtils');
const TABLE = 'spheres';

function addSphere(data) { return dbUtils.insert(TABLE, data); }
function getAllSpheres() { return dbUtils.select(TABLE); }
function getSphereById(id) { return dbUtils.select(TABLE, { id }, true); }

function patchSphere(id, updates) {
  return serviceUtils.updateWithChangedFields(TABLE, { id }, updates);
}
function removeSphere(id) { return dbUtils.remove(TABLE, { id }); }

module.exports = { addSphere, getAllSpheres, getSphereById, patchSphere, removeSphere };
