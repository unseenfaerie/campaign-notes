const express = require('express');
const router = express.Router({ mergeParams: true });
const characterItemsService = require('../../services/joinTables/characterItems');

router.post('/', async (req, res) => {
  const item_id = req.params.id;
  const { character_id, acquired_date, relinquished_date, short_description } = req.body;
  try {
    const result = await characterItemsService.addCharacterItem(
      character_id,
      item_id,
      acquired_date,
      relinquished_date,
      short_description
    );
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
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
    const records = await characterItemsService.getAllCharacterItemRecords(character_id, item_id);
    if (!records || records.length === 0) {
      return res.status(404).json({ error: 'No records found for this item-character pair' });
    }
    res.json(records);
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
router.patch('/:characterId/:acquiredDate', async (req, res) => {
  const item_id = req.params.id;
  const character_id = req.params.characterId;
  const acquired_date = req.params.acquiredDate;
  try {
    const result = await characterItemsService.updateCharacterItem(
      character_id,
      item_id,
      acquired_date,
      req.body
    );
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
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
