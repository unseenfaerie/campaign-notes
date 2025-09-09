// Spells service: business logic layer for spells, delegates to entityDataService for CRUD
const entityDataService = require('../entityDataService');
const entityName = 'Spell';
const ERROR_CODES = require('../../../common/errorCodes');

function validateSpellLevel(level) {
  if (level === undefined || level === null) return;
  if (typeof level !== 'number' || !Number.isInteger(level) || level < 0 || level > 9) {
    const err = new Error('Spell level must be an integer between 0 and 9');
    err.code = ERROR_CODES.BUSINESS_LOGIC_FAILED;
    throw err;
  }
}

function validateSpellComponents(components) {
  if (components === undefined || components === null || components === '') return '';
  const validSet = new Set(['V', 'S', 'M']);
  let parts = components.split(',').map(s => s.trim()).filter(Boolean);
  parts = Array.from(new Set(parts.filter(part => validSet.has(part))));
  parts.sort((a, b) => b.localeCompare(a));
  for (const part of parts) {
    if (!validSet.has(part)) {
      const err = new Error('Components must be a comma-separated list made up of V, S, and M');
      err.code = ERROR_CODES.BUSINESS_LOGIC_FAILED;
      throw err;
    }
  }
  return parts.length ? parts.join(', ') : '';
}

function validateSpellMaterials(components, materials) {
  if (components.includes('M')) {
    if (!materials || typeof materials !== 'string' || !materials.trim()) {
      const err = new Error('If components include M, materials must be provided and non-empty.');
      err.code = ERROR_CODES.BUSINESS_LOGIC_FAILED;
      throw err;
    }
  }
}

function validateSpellBusinessRules(data, { isPatch = false, existing = null } = {}) {
  // Level
  if (!isPatch || ('level' in data)) {
    validateSpellLevel(data.level);
  }

  let normalized = {};

  // Only validate and normalize components if present
  if (!isPatch || ('components' in data)) {
    let components = data.components;
    if (components === undefined || components === null) components = '';
    components = validateSpellComponents(components);
    normalized.components = components;
  }

  // Only validate and normalize materials if present
  if (!isPatch || ('materials' in data)) {
    let materials = data.materials;
    if (materials === undefined || materials === null) materials = '';
    // If components is present in patch, use normalized.components, else use data.components or existing.components
    let componentsForMaterials = (normalized.components !== undefined)
      ? normalized.components
      : (data.components !== undefined ? data.components : (existing ? existing.components : ''));
    validateSpellMaterials(componentsForMaterials, materials);
    normalized.materials = materials;
  }

  return normalized;
}

function createSpell(data) {
  const validated = validateSpellBusinessRules(data);
  return entityDataService.createEntity(entityName, { ...data, ...validated });
}

function getAllSpells() {
  return entityDataService.getAllEntities(entityName);
}

function getSpellById(id) {
  return entityDataService.getEntityById(entityName, id);
}

function getFullSpellById(id) {
  return entityDataService.getFullEntity(entityName, id);
}

async function patchSpell(id, updates) {
  // Fetch existing if needed for patch validation
  let existing = null;
  if (!('components' in updates) || !('materials' in updates)) {
    existing = await getSpellById(id);
  }
  const validated = validateSpellBusinessRules(updates, { isPatch: true, existing });
  // Only include normalized fields that are actually present in the patch
  const patch = { ...updates };
  for (const key of Object.keys(validated)) {
    if (key in updates) patch[key] = validated[key];
  }
  return entityDataService.patchEntity(entityName, id, patch);
}

function deleteSpell(id) {
  return entityDataService.deleteEntity(entityName, id);
}

module.exports = {
  createSpell,
  getAllSpells,
  getSpellById,
  getFullSpellById,
  patchSpell,
  deleteSpell
};