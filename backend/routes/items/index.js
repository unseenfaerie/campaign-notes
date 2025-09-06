const express = require('express');
const router = express.Router();
const itemsService = require('../../services/entities/items');

// Create a new item
router.post('/', async (req, res) => {
  const i = req.body;
  try {
    const result = await itemsService.createItem(i);
    res.status(201).json(result);
  } catch (err) {
    if (err.code === 'DUPLICATE_ID') {
      return res.status(409).json({ error: err.message });
    }
    res.status(400).json({ error: err.message });
  }
});

// Get all items (JSON)
router.get('/', async (req, res) => {
  try {
    const items = await itemsService.getAllItems();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single item by id (JSON)
router.get('/:id', async (req, res) => {
  try {
    const item = await itemsService.getItemById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single item by id (JSON)
router.get('/:id/full', async (req, res) => {
  try {
    const item = await itemsService.getFullItemById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update an existing item (PATCH)
router.patch('/:id', async (req, res) => {
  const updates = req.body;
  try {
    const result = await itemsService.patchItem(req.params.id, updates);
    res.json(result);
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.status(400).json({ error: err.message });
  }
});

// Delete an item
router.delete('/:id', async (req, res) => {
  try {
    const result = await itemsService.deleteItem(req.params.id);
    res.json(result);
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.use('/:id/characters', require('./characters'));
router.use('/:id/events', require('./events'));
router.use('/:id/spells', require('./spells'));

module.exports = router;