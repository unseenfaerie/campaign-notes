// services/entities/deities.js
// Centralized logic for managing deity CRUD and queries
const dbUtils = require('../../utils/dbUtils');
const { updateWithChangedFields } = require('../../utils/serviceUtils');
const characterDeities = require('../joinTables/characterDeities');
const deitySpheres = require('../joinTables/deitySpheres');

const TABLE = 'deities';

// Create a new deity
function createDeity(deity) {
  return dbUtils.insert(TABLE, deity);
}

// Get all deities
function getAllDeities() {
  return dbUtils.select(TABLE);
}

// Get a deity by id
function getDeityById(id) {
  return dbUtils.select(TABLE, { id }, true);
}

// Patch (partial update) a deity, returning changed fields
async function patchDeity(id, updates) {
  const allowed = ['name', 'pantheon', 'alignment', 'short_description', 'long_explanation'];
  const filtered = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));
  return updateWithChangedFields(TABLE, { id }, filtered, allowed);
}

// Delete a deity
function deleteDeity(id) {
  return dbUtils.remove(TABLE, { id });
}

// Fetch full deity details with all associations
async function getFullDeityById(id) {
  const [deity, characters, spheres] = await Promise.all([
    getDeityById(id),
    characterDeities.getCharactersForDeity(id),
    deitySpheres.getSpheresForDeity(id)
  ]);
  if (!deity) return null;
  return {
    ...deity,
    characters,
    spheres
  };
}

module.exports = {
  createDeity,
  getAllDeities,
  getDeityById,
  patchDeity,
  deleteDeity,
  getFullDeityById
};
