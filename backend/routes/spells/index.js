const express = require('express');
const router = express.Router();
const spellService = require('../../services/entities/spells');

// Create a new spell
router.post('/', async (req, res) => {
  const s = req.body;
  try {
    await spellService.createSpell(s);
    res.status(201).json({ id: s.id });
  } catch (err) {
    if (err.code === 'DUPLICATE_ID') {
      return res.status(409).json({ error: err.message });
    }
    res.status(400).json({ error: err.message });
  }
});

// Get all spells
router.get('/', async (req, res) => {
  try {
    const spells = await spellService.getAllSpells();
    res.json(spells);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single spell by id
router.get('/:id', async (req, res) => {
  try {
    const spell = await spellService.getSpellById(req.params.id);
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
    const fullSpell = await spellService.getFullSpellById(req.params.id);
    if (!fullSpell) {
      return res.status(404).json({ error: 'Spell not found' });
    }
    res.json(fullSpell);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Partially update an existing spell
router.patch('/:id', async (req, res) => {
  const updates = req.body;
  try {
    const result = await spellService.patchSpell(req.params.id, updates);
    res.json(result);
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Spell not found' });
    }
    res.status(400).json({ error: err.message });
  }
});

// Delete a spell
router.delete('/:id', async (req, res) => {
  try {
    await spellService.deleteSpell(req.params.id);
    res.json({ deleted: req.params.id });
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Spell not found' });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;