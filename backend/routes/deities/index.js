const express = require('express');
const router = express.Router();
const deitiesService = require('../../services/entities/deities');
const validate = require('../../../common/validate');
const { validateIdFormat } = require('../../utils/idUtils');

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

router.post('/', async (req, res) => {
  const d = req.body;

  // 1. ID validation
  if (!d.id || typeof d.id !== 'string' || !validateIdFormat(d.id)) {
    return res.status(400).json({ error: 'Invalid or missing id format.' });
  }

  // 2. Entity schema validation
  const { valid, errors } = validate.validateFields('Deity', d);
  if (!valid) {
    return res.status(400).json({ error: errors.join(', ') });
  }

  if (validateDeity(d)) {
    return res.status(400).json({ error: validateDeity(d) });
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

// read a deity with association details
router.get('/:id/full', async (req, res) => {
  try {
    const fullDeity = await deitiesService.getFullDeityById(req.params.id);
    if (!fullDeity) {
      return res.status(404).json({ error: 'Deity not found' });
    }
    res.json(fullDeity);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update an existing deity
router.patch('/:id', async (req, res) => {
  const d = req.body;

  // 1. If id is present in body, validate it
  if (d.id && (!validateIdFormat(d.id) || typeof d.id !== 'string')) {
    return res.status(400).json({ error: 'Invalid id format.' });
  }

  // 2. Entity schema validation (allowPartial)
  const { valid, errors } = validate.validateFields('Deity', d, { allowPartial: true });
  if (!valid) {
    return res.status(400).json({ error: errors.join('; ') });
  }
  if (!Object.keys(d).length) {
    return res.status(400).json({ error: 'No valid fields to update.' });
  }

  // 3. Business logic validation
  if (validateDeity(d, true)) {
    return res.status(400).json({ error: validateDeity(d, true) });
  }

  try {
    // Patch the deity and get the changed fields
    const result = await deitiesService.patchDeity(req.params.id, d);

    // Check if deity exists after update
    const updated = await deitiesService.getDeityById(req.params.id);
    if (!updated) {
      return res.status(404).json({ error: 'Deity not found' });
    }

    // Return the changed fields (or a message if nothing changed)
    res.json(result);
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

router.use('/:id/characters', require('./characters'));
router.use('/:id/spheres', require('./spheres'));

module.exports = router;
