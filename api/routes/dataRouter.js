const express = require('express');
const { manifestCrudService } = require('../genericCrudService');
const manifestHelpers = require('../utils/manifestHelpers');

const router = express.Router();

void manifestHelpers;

function coerceValueByType(type, value) {
  if (value === undefined || value === null) return value;

  if (type === 'number') {
    const n = Number(value);
    if (Number.isNaN(n)) {
      throw new Error(`Invalid number value: ${value}`);
    }
    return n;
  }

  if (type === 'boolean') {
    if (value === true || value === false) return value;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') return true;
      if (normalized === 'false') return false;
    }
    throw new Error(`Invalid boolean value: ${value}`);
  }

  if (type === 'string') {
    return String(value);
  }

  return value;
}

function coerceWhere(resourceName, where) {
  const info = manifestCrudService.getResourceInfo(resourceName);
  const normalized = {};

  for (const [field, rawValue] of Object.entries(where || {})) {
    const fieldDef = info.fields[field];
    if (!fieldDef) {
      throw new Error(`Unknown where field for ${resourceName}: ${field}`);
    }

    normalized[field] = coerceValueByType(fieldDef.type, rawValue);
  }

  return normalized;
}

function toHttpError(err) {
  const message = err && err.message ? err.message : 'Unexpected error';

  if (/Unknown resource/i.test(message)) {
    return { status: 404, message };
  }

  if (
    /Unknown field|Unknown where field|Missing required field|Invalid type|Data must be an object|Where clause|Primary key updates are not allowed|Invalid number value|Invalid boolean value/i.test(
      message
    )
  ) {
    return { status: 400, message };
  }

  if (err && err.code === 'SQLITE_CONSTRAINT') {
    return { status: 409, message };
  }

  return { status: 500, message };
}

router.get('/resources', (req, res) => {
  res.json(manifestCrudService.listResources());
});

router.get('/:resource', async (req, res) => {
  try {
    const where = coerceWhere(req.params.resource, req.query);
    const rows = await manifestCrudService.getMany(req.params.resource, where);

    if (Object.keys(where).length > 0 && rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json(rows);
  } catch (err) {
    const httpErr = toHttpError(err);
    res.status(httpErr.status).json({ error: httpErr.message });
  }
});

module.exports = router;