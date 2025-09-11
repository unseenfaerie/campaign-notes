const express = require('express');
const router = express.Router({ mergeParams: true });
const characterDeities = require('../../services/joinTables/characterDeities');
const { mapErrorToStatus } = require('../../utils/errorUtils');

// Add a deity tenure to a character
router.post('/', async (req, res) => {
  const character_id = req.params.id;
  try {
    const result = await characterDeities.addCharacterDeity({ character_id, ...req.body });
    res.status(201).json(result);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

// Get all deities (all tenures) for a character
router.get('/', async (req, res) => {
  const character_id = req.params.id;
  try {
    const deities = await characterDeities.getDeitiesForCharacter(character_id);
    res.json(deities);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message });
  }
});

// Get all tenures for a character-deity pair
router.get('/:deityId', async (req, res) => {
  const character_id = req.params.id;
  const deity_id = req.params.deityId;
  try {
    const tenures = await characterDeities.getCharacterDeityHistory(character_id, deity_id);
    res.json(tenures);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message });
  }
});

// Get a specific tenure (instance) for a character-deity pair
router.get('/:deityId/:adoptedDate', async (req, res) => {
  const character_id = req.params.id;
  const deity_id = req.params.deityId;
  const adopted_date = req.params.adoptedDate;
  try {
    const instance = await characterDeities.getCharacterDeityInstance(character_id, deity_id, adopted_date);
    res.json(instance);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message });
  }
});

// Patch a specific tenure
router.patch('/:deityId/:adoptedDate', async (req, res) => {
  const character_id = req.params.id;
  const deity_id = req.params.deityId;
  const adopted_date = req.params.adoptedDate;
  try {
    const result = await characterDeities.patchCharacterDeity(character_id, deity_id, adopted_date, req.body);
    res.json(result);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message });
  }
});

// Remove a specific tenure
router.delete('/:deityId/:adoptedDate', async (req, res) => {
  const character_id = req.params.id;
  const deity_id = req.params.deityId;
  const adopted_date = req.params.adoptedDate;
  try {
    const result = await characterDeities.removeCharacterDeityInstance(character_id, deity_id, adopted_date);
    res.json(result);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message });
  }
});

// Remove all tenures for a character-deity pair
router.delete('/:deityId', async (req, res) => {
  const character_id = req.params.id;
  const deity_id = req.params.deityId;
  try {
    const result = await characterDeities.removeAllHistoryForCharacterDeity(character_id, deity_id);
    res.json(result);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message });
  }
});

// Remove all deities for a character
router.delete('/', async (req, res) => {
  const character_id = req.params.id;
  try {
    const result = await characterDeities.removeAllDeitiesForCharacter(character_id);
    res.json(result);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message });
  }
});

module.exports = router;