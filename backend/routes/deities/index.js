const express = require('express');
const router = express.Router();
const deitiesService = require('../../services/entities/deities');

// Helper: Validate deity data
function validateDeity(d, isUpdate = false) {
  const requiredFields = ['id', 'name'];
  if (!isUpdate) {
    for (const field of requiredFields) {
      if (!d[field] || typeof d[field] !== 'string') {
        return `Missing or invalid required field: ${field}`;
      }
    }
  }
  // pantheon, alignment, short_description can be null or string
  if (d.pantheon && typeof d.pantheon !== 'string') {
    return 'Field pantheon must be a string or null';
  }
  if (d.alignment && typeof d.alignment !== 'string') {
    return 'Field alignment must be a string or null';
  }
  if (d.short_description && typeof d.short_description !== 'string') {
    return 'Field short_description must be a string or null';
  }
  return null;
}

// Create a new deity
router.post('/', async (req, res) => {
  const d = req.body;
  const validationError = validateDeity(d);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  try {
    const existing = await deitiesService.getDeityById(d.id);
    if (existing) {
      return res.status(409).json({ error: 'A deity with this id already exists.' });
    }
    await deitiesService.createDeity(d);
    res.status(201).json({ id: d.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update an existing deity
router.patch('/:id', async (req, res) => {
  const d = req.body;
  if (!Object.keys(d).length) {
    return res.status(400).json({ error: 'No valid fields to update.' });
  }
  try {
    const result = await deitiesService.patchDeity(req.params.id, d);
    // Check if deity exists after update
    const updated = await deitiesService.getDeityById(req.params.id);
    if (!updated) {
      return res.status(404).json({ error: 'Deity not found' });
    }
    res.json({ updated: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a deity
router.delete('/:id', async (req, res) => {
  try {
    const existing = await deitiesService.getDeityById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Deity not found' });
    }
    await deitiesService.deleteDeity(req.params.id);
    res.json({ deleted: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all deities (JSON)
router.get('/', async (req, res) => {
  try {
    const rows = await deitiesService.getAllDeities();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single deity by id (JSON)
router.get('/:id', async (req, res) => {
  try {
    const row = await deitiesService.getDeityById(req.params.id);
    if (!row) {
      return res.status(404).json({ error: 'Deity not found' });
    }
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
