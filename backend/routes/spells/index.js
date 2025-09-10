const express = require('express');
const router = express.Router();
const spellService = require('../../services/entities/spells');
const { mapErrorToStatus } = require('../../utils/errorUtils');

// Create a new spell
router.post('/', async (req, res) => {
  try {
    const result = await spellService.createSpell(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

// Get all spells
router.get('/', async (req, res) => {
  try {
    const spells = await spellService.getAllSpells();
    res.json(spells);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

// Get a single spell by id
router.get('/:id', async (req, res) => {
  try {
    const spell = await spellService.getSpellById(req.params.id);
    res.json(spell);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

// Get a full-detail spell with all associations
router.get('/:id/full', async (req, res) => {
  try {
    const fullSpell = await spellService.getFullSpellById(req.params.id);
    res.json(fullSpell);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

// Partially update an existing spell
router.patch('/:id', async (req, res) => {
  try {
    const result = await spellService.patchSpell(req.params.id, req.body);
    res.json(result);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

// Delete a spell
router.delete('/:id', async (req, res) => {
  try {
    const result = await spellService.deleteSpell(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

router.use('/:id/spheres', require('./spheres'));
router.use('/:id/items', require('./items'));

module.exports = router;