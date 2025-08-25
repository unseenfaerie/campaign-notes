const express = require('express');
const router = express.Router();


const organizationsService = require('../../services/entities/organizations');
// Helper: Validate organization data
function validateOrganization(o, isUpdate = false) {
  const requiredFields = ['id', 'name', 'type'];
  if (!isUpdate) {
    for (const field of requiredFields) {
      if (!o[field] || typeof o[field] !== 'string') {
        return `Missing or invalid required field: ${field}`;
      }
    }
  }
  // locations can be null or string (CSV or JSON, up to you)
  if (o.locations && typeof o.locations !== 'string') {
    return 'Field locations must be a string or null';
  }
  return null;
}

// Create a new organization
router.post('/', async (req, res) => {
  const o = req.body;
  const validationError = validateOrganization(o);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  try {
    const existing = await organizationsService.getOrganizationById(o.id);
    if (existing) {
      return res.status(409).json({ error: 'An organization with this id already exists.' });
    }
    await organizationsService.createOrganization(o);
    res.status(201).json({ id: o.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Partially update an existing organization
router.patch('/:id', async (req, res) => {
  const o = req.body;
  if (!Object.keys(o).length) {
    return res.status(400).json({ error: 'No valid fields to update.' });
  }
  try {
    const result = await organizationsService.patchOrganization(req.params.id, o);
    // Check if organization exists after update
    const updated = await organizationsService.getOrganizationById(req.params.id);
    if (!updated) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    res.json({ updated: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete an organization
router.delete('/:id', async (req, res) => {
  try {
    const existing = await organizationsService.getOrganizationById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    await organizationsService.deleteOrganization(req.params.id);
    res.json({ deleted: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all organizations (JSON)
router.get('/', async (req, res) => {
  try {
    const rows = await organizationsService.getAllOrganizations();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single organization by id (JSON)
router.get('/:id', async (req, res) => {
  try {
    const row = await organizationsService.getOrganizationById(req.params.id);
    if (!row) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
