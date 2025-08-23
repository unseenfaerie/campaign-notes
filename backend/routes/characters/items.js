const express = require('express');
const router = express.Router({ mergeParams: true });
const characterItems = require('../../services/characterItems');
const { isValidDateFormat } = require('../../utils/dateUtils');

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

  characterItems.addCharacterItem(character_id, item_id, acquired_date, relinquished_date || '', short_description || '')
    .then(result => res.status(201).json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Get all items for a character
router.get('/', (req, res) => {
  const character_id = req.params.id;
  characterItems.getItemsForCharacter(character_id)
    .then(items => res.json(items))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Get the most recent item-character relationship (by acquired_date)
router.get('/:itemId', async (req, res) => {
  const character_id = req.params.id;
  const item_id = req.params.itemId;
  try {
    // Get all records for this character-item pair
    const records = await characterItems.getAllCharacterItemRecords(character_id, item_id);
    if (!records || records.length === 0) {
      return res.status(404).json({ error: 'No records found for this character-item pair' });
    }
    // Sort by acquired_date descending (assuming mmm-dd-yyy format, e.g., jan-01-177)
    const sorted = records.sort((a, b) => {
      // Convert mmm-dd-yyy to a comparable string: yyy-mmm-dd
      const toSortable = (date) => {
        if (!date) return '';
        const [mmm, dd, yyy] = date.split('-');
        return `${yyy}-${mmm.toLowerCase()}-${dd}`;
      };
      return toSortable(b.acquired_date).localeCompare(toSortable(a.acquired_date));
    });
    return res.json(sorted[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Get all records for a character-item pair (all acquisitions)
router.get('/:itemId/all', (req, res) => {
  const character_id = req.params.id;
  const item_id = req.params.itemId;
  const characterItems = require('../../services/characterItems');
  characterItems.getAllCharacterItemRecords(character_id, item_id)
    .then(records => res.json(records))
    .catch(err => res.status(500).json({ error: err.message }));
});


// Get an item for a character at a specific acquired_date
router.get('/:itemId/:acquiredDate', (req, res) => {
  const character_id = req.params.id;
  const item_id = req.params.itemId;
  const acquired_date = req.params.acquiredDate;
  characterItems.getCharacterItem(character_id, item_id, acquired_date)
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
  characterItems.updateCharacterItem(character_id, item_id, acquired_date, updates)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Remove a single instance of item owning history from a character
router.delete('/:itemId/:aqcuired_date', (req, res) => {
  const character_id = req.params.id;
  const item_id = req.params.itemId;
  const acquired_date = req.params.aqcuired_date;
  characterItems.removeInstanceCharacterItem(character_id, item_id, acquired_date)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Remove an item completely from a character
router.delete('/:itemId', (req, res) => {
  const character_id = req.params.id;
  const item_id = req.params.itemId;
  characterItems.removeCharacterItem(character_id, item_id)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

module.exports = router;