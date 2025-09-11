const express = require('express');
const router = express.Router();
const organizationsService = require('../../services/entities/organizations');
const { mapErrorToStatus } = require('../../utils/errorUtils');

// Create a new organization
router.post('/', async (req, res) => {
  try {
    const result = await organizationsService.createOrganization(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

// Get all organizations (JSON)
router.get('/', async (req, res) => {
  try {
    const rows = await organizationsService.getAllOrganizations();
    res.json(rows);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

// Get a single organization by id (JSON)
router.get('/:id', async (req, res) => {
  try {
    const row = await organizationsService.getOrganizationById(req.params.id);
    res.json(row);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

// Partially update an existing organization
router.patch('/:id', async (req, res) => {
  try {
    const result = await organizationsService.patchOrganization(req.params.id, req.body);
    res.json(result);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

// Delete an organization
router.delete('/:id', async (req, res) => {
  try {
    const result = await organizationsService.deleteOrganization(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

module.exports = router;
