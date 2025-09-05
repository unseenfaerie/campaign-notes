const express = require('express');
const router = express.Router();
const entityDataService = require('../../services/entityDataService');

// Get all spells
router.get('/', async (req, res) => {
  try {
    const spells = await entityDataService.getAllEntities('Spell');
    res.json(spells);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single spell by id
router.get('/:id', async (req, res) => {
  try {
    const spell = await entityDataService.getEntityById('Spell', req.params.id);
    if (!spell) {
      return res.status(404).json({ error: 'Spell not found' });
    }
    res.json(spell);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a full-detail spell with all associations
router.get('/:id/full', async (req, res) => {
  try {
    const fullSpell = await entityDataService.getFullEntity('Spell', req.params.id);
    if (!fullSpell) {
      return res.status(404).json({ error: 'Spell not found' });
    }
    res.json(fullSpell);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new spell
router.post('/', async (req, res) => {
  const s = req.body;
  try {
    const existing = await entityDataService.getEntityById('Spell', s.id);
    if (existing) {
      return res.status(409).json({ error: 'A spell with this id already exists.' });
    }
    await entityDataService.createEntity('Spell', s);
    res.status(201).json({ id: s.id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Partially update an existing spell
router.patch('/:id', async (req, res) => {
  const updates = req.body;
  try {
    await entityDataService.patchEntity('Spell', req.params.id, updates);
    const updated = await entityDataService.getEntityById('Spell', req.params.id);
    if (!updated) {
      return res.status(404).json({ error: 'Spell not found' });
    }
    res.json({ updated: req.params.id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a spell
router.delete('/:id', async (req, res) => {
  try {
    const existing = await entityDataService.getEntityById('Spell', req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Spell not found' });
    }
    await entityDataService.deleteEntity('Spell', req.params.id);
    res.json({ deleted: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;