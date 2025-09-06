const express = require('express');
const router = express.Router({ mergeParams: true });
const characterItemsService = require('../../services/joinTables/characterItems');
const { isValidDateFormat } = require('../../utils/dateUtils');
const { validateFields } = require('../../../common/validate');

// Add a character to an item (association)
router.post('/', (req, res) => {
  const item_id = req.params.id;
  const { character_id, acquired_date, relinquished_date, short_description } = req.body;
  // Validate using generic entity validator
  const { valid, errors, validated } = validateFields('CharacterItem', {
    character_id,
    item_id,
    acquired_date,
    relinquished_date,
    short_description
  });
  if (!valid) return res.status(400).json({ error: errors });

  // Validate acquired_date and relinquished_date if present
  if (validated.acquired_date && !isValidDateFormat(validated.acquired_date)) {
    return res.status(400).json({ error: 'acquired_date must be formatted as mmm-dd-yyy (e.g., jan-01-177)' });
  }
  if (validated.relinquished_date && !isValidDateFormat(validated.relinquished_date)) {
    return res.status(400).json({ error: 'relinquished_date must be formatted as mmm-dd-yyy (e.g., jan-01-177)' });
  }

  characterItemsService.addCharacterItem(
    validated.character_id,
    validated.item_id,
    validated.acquired_date,
    validated.relinquished_date || '',
    validated.short_description || ''
  )
    .then(result => res.status(201).json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Get all characters for an item, with full relationship history for each character
router.get('/', async (req, res) => {
  const item_id = req.params.id;
  try {
    const results = await characterItemsService.getCharactersForItem(item_id);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get character details and all relationship records for an item-character pair
router.get('/:characterId', async (req, res) => {
  const item_id = req.params.id;
  const character_id = req.params.characterId;
  try {
    const result = await characterItemsService.getCharacterForItem(item_id, character_id);
    if (!result) {
      return res.status(404).json({ error: 'No records found for this item-character pair' });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a character for an item at a specific acquired_date
router.get('/:characterId/:acquiredDate', (req, res) => {
  const item_id = req.params.id;
  const character_id = req.params.characterId;
  const acquired_date = req.params.acquiredDate;
  characterItemsService.getCharacterItem(character_id, item_id, acquired_date)
    .then(item => {
      if (!item) return res.status(404).json({ error: 'Record not found' });
      res.json(item);
    })
    .catch(err => res.status(500).json({ error: err.message }));
});

// Update item-character association
router.patch('/:characterId/:acquiredDate', (req, res) => {
  const item_id = req.params.id;
  const character_id = req.params.characterId;
  const acquired_date = req.params.acquiredDate;
  // Validate PATCH body for allowed fields only (partial allowed)
  const { valid, errors, validated } = validateFields('CharacterItem', req.body, { allowPartial: true });
  if (!valid) return res.status(400).json({ error: errors });
  characterItemsService.updateCharacterItem(character_id, item_id, acquired_date, validated)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Remove a single instance of character owning history from an item
router.delete('/:characterId/:acquired_date', (req, res) => {
  const item_id = req.params.id;
  const character_id = req.params.characterId;
  const acquired_date = req.params.acquired_date;
  characterItemsService.removeInstanceCharacterItem(character_id, item_id, acquired_date)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Remove a character completely from an item
router.delete('/:characterId', (req, res) => {
  const item_id = req.params.id;
  const character_id = req.params.characterId;
  characterItemsService.removeCharacterItem(character_id, item_id)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Remove ALL character relationships from an item
router.delete('/', (req, res) => {
  const item_id = req.params.id;
  characterItemsService.removeAllItemCharacterRecords(item_id)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

module.exports = router;
