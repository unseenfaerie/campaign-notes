const express = require('express');
const router = express.Router({ mergeParams: true });
const itemSpellsService = require('../../services/joinTables/itemSpells');

// Add a spell to an item
router.post('/', async (req, res) => {
  const item_id = req.params.id;
  const { spell_id, ...rest } = req.body;
  if (!spell_id) {
    return res.status(400).json({ error: 'spell_id is required' });
  }
  if (Object.keys(rest).length > 0) {
    return res.status(400).json({ error: 'Only spell_id is allowed in the request body.' });
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

// Get all spells for an item
router.get('/', async (req, res) => {
  const item_id = req.params.id;
  try {
    const linkages = await itemSpellsService.getSpellsForItem(item_id);
    res.json(linkages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk delete: remove all spells for an item
router.delete('/', async (req, res) => {
  const item_id = req.params.id;
  try {
    const result = await itemSpellsService.removeAllSpellsForItem(item_id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a specific item-spell linkage
router.delete('/:spellId', async (req, res) => {
  const item_id = req.params.id;
  const spell_id = req.params.spellId;
  try {
    const result = await itemSpellsService.removeItemSpell(item_id, spell_id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
