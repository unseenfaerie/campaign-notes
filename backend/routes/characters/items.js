const express = require('express');
const router = express.Router({ mergeParams: true });
const characterItemsService = require('../../services/characterItems');
const itemsService = require('../../services/items');
const { isValidDateFormat, sortObjectsByLoreDate } = require('../../utils/dateUtils');

// ITEM - CHARACTER ASSOCIATIONS
// Add an item to a character
router.post('/', (req, res) => {
  const character_id = req.params.id;
  const { item_id, acquired_date, relinquished_date, short_description } = req.body;
  if (!item_id) return res.status(400).json({ error: 'item_id is required' });
  if (!acquired_date) return res.status(400).json({ error: 'acquired_date is required' });

  // Validate acquired_date and relinquished_date if present
  if (acquired_date && !isValidDateFormat(acquired_date)) {
    return res.status(400).json({ error: 'acquired_date must be formatted as mmm-dd-yyy (e.g., jan-01-177)' });
  }
  if (relinquished_date && !isValidDateFormat(relinquished_date)) {
    return res.status(400).json({ error: 'relinquished_date must be formatted as mmm-dd-yyy (e.g., jan-01-177)' });
  }

  characterItemsService.addCharacterItem(character_id, item_id, acquired_date, relinquished_date || '', short_description || '')
    .then(result => res.status(201).json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Get all items for a character, with full relationship history for each item
router.get('/', async (req, res) => {
  const character_id = req.params.id;
  try {
    const results = await characterItemsService.getAllItemsWithHistoryForCharacter(character_id);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get item details and all relationship records for a character-item pair
router.get('/:itemId', async (req, res) => {
  const character_id = req.params.id;
  const item_id = req.params.itemId;
  try {
    // Get all relationship records for this character-item pair
    let records = await characterItemsService.getAllCharacterItemRecords(character_id, item_id);
    if (!records || records.length === 0) {
      return res.status(404).json({ error: 'No records found for this character-item pair' });
    }

    // Sort by acquired_date ascending (chronological) using loreDateToSortable helper
    records = sortObjectsByLoreDate(records, 'acquired_date', true);
    // Get item details using the service layer
    const item = await itemsService.getItemDetails(item_id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    return res.json({
      item,
      history: records
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Get an item for a character at a specific acquired_date
router.get('/:itemId/:acquiredDate', (req, res) => {
  const character_id = req.params.id;
  const item_id = req.params.itemId;
  const acquired_date = req.params.acquiredDate;
  characterItemsService.getCharacterItem(character_id, item_id, acquired_date)
    .then(item => {
      if (!item) return res.status(404).json({ error: 'Item not found' });
      res.json(item);
    })
    .catch(err => res.status(500).json({ error: err.message }));
});

// Update item-character association
router.patch('/:itemId/:acquiredDate', (req, res) => {
  const character_id = req.params.id;
  const item_id = req.params.itemId;
  const acquired_date = req.params.acquiredDate
  const updates = req.body;
  characterItemsService.updateCharacterItem(character_id, item_id, acquired_date, updates)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Remove a single instance of item owning history from a character
router.delete('/:itemId/:aqcuired_date', (req, res) => {
  const character_id = req.params.id;
  const item_id = req.params.itemId;
  const acquired_date = req.params.aqcuired_date;
  characterItemsService.removeInstanceCharacterItem(character_id, item_id, acquired_date)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Remove an item completely from a character
router.delete('/:itemId', (req, res) => {
  const character_id = req.params.id;
  const item_id = req.params.itemId;
  characterItemsService.removeCharacterItem(character_id, item_id)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Remove ALL item relationships from a character
router.delete('/', (req, res) => {
  const character_id = req.params.id;
  characterItemsService.removeAllCharacterItemRecords(character_id)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

module.exports = router;