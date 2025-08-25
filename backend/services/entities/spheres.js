// services/entities/spheres.js
const dbUtils = require('../../utils/dbUtils');
const TABLE = 'spheres';

function addSphere(data) { return dbUtils.insert(TABLE, data); }
function getAllSpheres() { return dbUtils.select(TABLE); }
function getSphereById(id) { return dbUtils.select(TABLE, { id }, true); }
function updateSphere(id, updates) { return dbUtils.update(TABLE, { id }, updates); }
function removeSphere(id) { return dbUtils.remove(TABLE, { id }); }

module.exports = { addSphere, getAllSpheres, getSphereById, updateSphere, removeSphere };
