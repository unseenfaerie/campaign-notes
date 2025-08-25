const express = require('express');
const router = express.Router();
const eventsService = require('../../services/entities/spheres');

// Helper: Validate sphere data
function validateSphere(s, isUpdate = false) {
  const requiredFields = ['id', 'name'];
  if (!isUpdate) {
    for (const field of requiredFields) {
      if (!s[field] || typeof s[field] !== 'string') {
        return `Missing or invalid required field: ${field}`;
      }
    }
  }
  return null;
}

// Get all spheres
router.get('/', async (req, res) => {
  try {
    const spheres = await eventsService.getAllSpheres();
    res.json(spheres);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single sphere by id
router.get('/:id', async (req, res) => {
  try {
    const sphere = await eventsService.getSphereById(req.params.id);
    if (!sphere) {
      return res.status(404).json({ error: 'Sphere not found' });
    }
    res.json(sphere);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new sphere
router.post('/', async (req, res) => {
  const s = req.body;
  const validationError = validateSphere(s);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  try {
    const existing = await eventsService.getSphereById(s.id);
    if (existing) {
      return res.status(409).json({ error: 'A sphere with this id already exists.' });
    }
    await eventsService.createSphere(s);
    res.status(201).json({ id: s.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Partially update an existing sphere
router.patch('/:id', async (req, res) => {
  const updates = req.body;
  const allowed = [
    'name',
    'short_description',
    'long_explanation'
  ];
  const fields = Object.keys(updates).filter(key => allowed.includes(key));
  if (fields.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update.' });
  }
  try {
    await spheresService.patchSphere(req.params.id, updates);
    const updated = await spheresService.getSphereById(req.params.id);
    if (!updated) {
      return res.status(404).json({ error: 'Sphere not found' });
    }
    res.json({ updated: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a spell
router.delete('/:id', async (req, res) => {
  try {
    const existing = await spheresService.getSphereById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Sphere not found' });
    }
    await spheresService.deleteSphere(req.params.id);
    res.json({ deleted: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;