// Spells service: business logic layer for spells, delegates to entityDataService for CRUD

const entityDataService = require('../entityDataService');
const entityName = 'Spell';

function validateSpellLevel(level) {
  if (level === undefined || level === null) return;
  if (typeof level !== 'number' || !Number.isInteger(level) || level < 0 || level > 9) {
    throw new Error('Spell level must be an integer between 0 and 9');
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
      throw new Error('Components must be a comma-separated list made up of V, S, and M');
    }
  }
  return parts.length ? parts.join(', ') : '';
}

function validateSpellMaterials(components, materials) {
  if (components.includes('M')) {
    if (!materials || typeof materials !== 'string' || !materials.trim()) {
      throw new Error('If components include M, materials must be provided and non-empty.');
    }
  }
}

function validateSpellBusinessRules(data, { isPatch = false, existing = null } = {}) {
  // Level
  if (!isPatch || ('level' in data)) {
    validateSpellLevel(data.level);
  }

  // Components (normalize)
  let components = (isPatch && !('components' in data) && existing) ? existing.components : data.components;
  components = validateSpellComponents(components);

  // Materials
  let materials = (isPatch && !('materials' in data) && existing) ? existing.materials : data.materials;
  validateSpellMaterials(components, materials);

  // For patch, return normalized fields to merge into updates
  return { components, materials };
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
  return entityDataService.patchEntity(entityName, id, { ...updates, ...validated });
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