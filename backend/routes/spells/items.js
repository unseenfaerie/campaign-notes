const express = require('express');
const router = express.Router({ mergeParams: true });
const itemSpellsService = require('../../services/joinTables/itemSpells');

router.post('/', async (req, res) => {
  const spell_id = req.params.id;
  const { item_id } = req.body;
  if (!item_id) {
    return res.status(400).json({ error: 'item_id is required' });
  }
  try {
    const result = await itemSpellsService.addItemSpell(item_id, spell_id);
    res.status(201).json(result);
  } catch (err) {
    if (err.code === 'DUPLICATE_ID') {
      return res.status(409).json({ error: 'This item-spell relationship already exists.' });
    }
    res.status(400).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  const spell_id = req.params.id;
  try {
    const linkages = await itemSpellsService.getItemsForSpell(spell_id);
    res.json(linkages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/', async (req, res) => {
  const spell_id = req.params.id;
  try {
    const result = await itemSpellsService.removeAllItemsForSpell(spell_id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:itemId', async (req, res) => {
  const spell_id = req.params.id;
  const item_id = req.params.itemId;
  try {
    const result = await itemSpellsService.removeItemSpell(item_id, spell_id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
