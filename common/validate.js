// common/validate.js
// Generic data validator for entity schemas

const entities = require('./entities');

// Validate the fields of an entity against its schema. 
// allowPartial is part of an options object to allow us to add more validation or options down the line.
function validateFields(entityName, data, { allowPartial = false } = {}) {
  const schema = entities[entityName];
  if (!schema) throw new Error(`Unknown entity: ${entityName}`);

  const errors = [];
  const validated = {};

  // Check for unknown fields
  for (const key of Object.keys(data)) {
    if (!schema[key]) {
      errors.push(`Unknown field: ${key}`);
    }
  }

  // Check types and required fields
  for (const [field, def] of Object.entries(schema)) {
    const value = data[field];
    if (value === undefined) {
      if (!allowPartial && !def.optional && !def.primary) {
        errors.push(`Missing required field: ${field}`);
      }
      continue;
    }
    if (!typeMatches(def.type, value)) {
      errors.push(`Invalid type for field ${field}: expected ${def.type}`);
    } else {
      validated[field] = value;
    }
  }

  return { valid: errors.length === 0, errors, validated };
}

function typeMatches(type, value) {
  if (type === 'string') return typeof value === 'string';
  if (type === 'number') return typeof value === 'number' && !isNaN(value);
  if (type === 'boolean') return typeof value === 'boolean';
  // Add more types as needed
  return true;
}

module.exports = { validateFields };
