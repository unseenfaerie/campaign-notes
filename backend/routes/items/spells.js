const express = require('express');
const router = express.Router({ mergeParams: true });
const itemSpellsService = require('../../services/joinTables/itemSpells');
const { validateFields } = require('../../../common/validate');

// Create a new item-spell relationship
router.post('/', (req, res) => {
  const item_id = req.params.id;
  const { spell_id } = req.body;
  // Validate using generic entity validator
  const { valid, errors, validated } = validateFields('ItemSpell', {
    item_id,
    spell_id
  });
  if (!valid) return res.status(400).json({ error: errors });

  itemSpellsService.addItemSpell(validated.item_id, validated.spell_id)
    .then(result => res.status(201).json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Get all spells for an item
router.get('/', async (req, res) => {
  const item_id = req.params.id;
  try {
    const results = await itemSpellsService.getSpellsForItem(item_id);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a specific spell relationship for an item
router.get('/:spellId', async (req, res) => {
  const item_id = req.params.id;
  const spell_id = req.params.spellId;
  try {
    const result = await itemSpellsService.getItemSpell(item_id, spell_id);
    if (!result) {
      return res.status(404).json({ error: 'No record found for this item-spell pair' });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update an item-spell relationship (PATCH)
router.patch('/:spellId', (req, res) => {
  const item_id = req.params.id;
  const spell_id = req.params.spellId;
  // Validate PATCH body for allowed fields only (partial allowed)
  const { valid, errors, validated } = validateFields('ItemSpell', req.body, { allowPartial: true });
  if (!valid) return res.status(400).json({ error: errors });
  itemSpellsService.updateItemSpell(item_id, spell_id, validated)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Delete a specific item-spell relationship
router.delete('/:spellId', (req, res) => {
  const item_id = req.params.id;
  const spell_id = req.params.spellId;
  itemSpellsService.removeItemSpell(item_id, spell_id)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Delete all spell relationships for an item
router.delete('/', (req, res) => {
  const item_id = req.params.id;
  itemSpellsService.removeAllItemSpellRecords(item_id)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

module.exports = router;
