// services/deitySpheres.js
const dbUtils = require('../utils/dbUtils');
const TABLE = 'deity_spheres';

function addDeitySphere(deity_id, sphere_id) { return dbUtils.insert(TABLE, { deity_id, sphere_id }); }
function getSpheresForDeity(deity_id) { return dbUtils.select(TABLE, { deity_id }); }
function getDeitiesForSphere(sphere_id) { return dbUtils.select(TABLE, { sphere_id }); }
function removeDeitySphere(deity_id, sphere_id) { return dbUtils.remove(TABLE, { deity_id, sphere_id }); }

module.exports = { addDeitySphere, getSpheresForDeity, getDeitiesForSphere, removeDeitySphere };
