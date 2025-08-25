const express = require('express');
const router = express.Router();
const placesService = require('../../services/entities/places');

// Helper: Validate place data
function validatePlace(p, isUpdate = false) {
  const requiredFields = ['id', 'name', 'type'];
  if (!isUpdate) {
    for (const field of requiredFields) {
      if (!p[field] || typeof p[field] !== 'string') {
        return `Missing or invalid required field: ${field}`;
      }
    }
  }
  // parent_id can be null or string
  if (p.parent_id && typeof p.parent_id !== 'string') {
    return 'Field parent_id must be a string or null';
  }
  return null;
}

// Create a new place
router.post('/', async (req, res) => {
  const p = req.body;
  const validationError = validatePlace(p);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  try {
    const existing = await placesService.getPlaceById(p.id);
    if (existing) {
      return res.status(409).json({ error: 'A place with this id already exists.' });
    }
    await placesService.createPlace(p);
    res.status(201).json({ id: p.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update an existing place
router.patch('/:id', async (req, res) => {
  const p = req.body;
  if (!Object.keys(p).length) {
    return res.status(400).json({ error: 'No valid fields to update.' });
  }
  try {
    const result = await placesService.patchPlace(req.params.id, p);
    // Check if place exists after update
    const updated = await placesService.getPlaceById(req.params.id);
    if (!updated) {
      return res.status(404).json({ error: 'Place not found' });
    }
    res.json({ updated: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a place
router.delete('/:id', async (req, res) => {
  try {
    const existing = await placesService.getPlaceById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Place not found' });
    }
    await placesService.deletePlace(req.params.id);
    res.json({ deleted: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all places (JSON)
router.get('/', async (req, res) => {
  try {
    const rows = await placesService.getAllPlaces();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single place by id (JSON)
router.get('/:id', async (req, res) => {
  try {
    const row = await placesService.getPlaceById(req.params.id);
    if (!row) {
      return res.status(404).json({ error: 'Place not found' });
    }
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
