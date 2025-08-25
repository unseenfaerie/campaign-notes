const express = require('express');
const router = express.Router();
const eventsService = require('../../services/spells');

// Helper: Validate spell data
function validateSpell(s, isUpdate = false) {
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

// Get all spells
router.get('/', async (req, res) => {
  try {
    const spells = await eventsService.getAllSpells();
    res.json(spells);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single event by id
router.get('/:id', async (req, res) => {
  try {
    const spell = await eventsService.getSpellById(req.params.id);
    if (!spell) {
      return res.status(404).json({ error: 'Spell not found' });
    }
    res.json(spell);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new spell
router.post('/', async (req, res) => {
  const s = req.body;
  const validationError = validateSpell(s);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  try {
    const existing = await eventsService.getSpellById(s.id);
    if (existing) {
      return res.status(409).json({ error: 'A spell with this id already exists.' });
    }
    await eventsService.createSpell(s);
    res.status(201).json({ id: s.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Partially update an existing spell
router.patch('/:id', async (req, res) => {
  const updates = req.body;
  const allowed = [
    'type',
    'name',
    'level',
    'school',
    'sphere',
    'casting_time',
    'range',
    'components',
    'duration',
    'description'
  ];
  const fields = Object.keys(updates).filter(key => allowed.includes(key));
  if (fields.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update.' });
  }
  try {
    await spellsService.patchSpell(req.params.id, updates);
    const updated = await spellsService.getSpellById(req.params.id);
    if (!updated) {
      return res.status(404).json({ error: 'Spell not found' });
    }
    res.json({ updated: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a spell
router.delete('/:id', async (req, res) => {
  try {
    const existing = await spellsService.getSpellById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Spell not found' });
    }
    await spellsService.deleteSpell(req.params.id);
    res.json({ deleted: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.use('/:id/items', require('./items'));
router.use('/:id/spheres', require('./spheres'));

module.exports = router;