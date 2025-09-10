const express = require('express');
const router = express.Router({ mergeParams: true });
const itemSpellsService = require('../../services/joinTables/itemSpells');
const { mapErrorToStatus } = require('../../utils/errorUtils');

router.post('/', async (req, res) => {
  // Pass the full linkage object, including spell_id from params and all fields from body
  const linkage = { ...req.body, spell_id: req.params.id };
  try {
    const result = await itemSpellsService.addItemSpell(linkage);
    res.status(201).json(result);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

router.get('/', async (req, res) => {
  const spell_id = req.params.id;
  try {
    const linkages = await itemSpellsService.getItemsForSpell(spell_id);
    res.json(linkages);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

router.delete('/', async (req, res) => {
  const spell_id = req.params.id;
  try {
    const result = await itemSpellsService.removeAllItemsForSpell(spell_id);
    res.json(result);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

router.delete('/:itemId', async (req, res) => {
  const spell_id = req.params.id;
  const item_id = req.params.itemId;
  try {
    const result = await itemSpellsService.removeItemSpell(item_id, spell_id);
    res.json(result);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

module.exports = router;
