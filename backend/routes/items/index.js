const express = require('express');
const router = express.Router();
const idUtils = require('../../utils/idUtils')
const itemsService = require('../../services/entities/items');

// Helper: Validate item data
function validateItem(i, isUpdate = false) {
  const requiredFields = ['id', 'name'];
  if (!isUpdate) {
    for (const field of requiredFields) {
      if (!i[field] || typeof i[field] !== 'string') {
        return `Missing or invalid required field: ${field}`;
      }
    }
    if (!idUtils.validateIdFormat(i.id)) {
      return `Invalid id format. Only use lowercase letters and dashes.`;
    }
  }
  return null;
}

// Create a new item
router.post('/', async (req, res) => {
  const i = req.body;
  const validationError = validateItem(i);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  try {
    // Check for duplicate
    const existing = await itemsService.getItemById(i.id);
    if (existing) {
      return res.status(409).json({ error: 'An item with this id already exists.' });
    }
    await itemsService.createItem(i);
    res.status(201).json({ id: i.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
  const allowed = ['name', 'short_description', 'long_explanation'];
  const fields = Object.keys(updates).filter(key => allowed.includes(key));
  if (fields.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update.' });
  }
  try {
    const result = await itemsService.patchItem(req.params.id, updates);
    // Optionally, check if item exists
    const updated = await itemsService.getItemById(req.params.id);
    if (!updated) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ updated: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete an item
router.delete('/:id', async (req, res) => {
  try {
    const existing = await itemsService.getItemById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Item not found' });
    }
    await itemsService.deleteItem(req.params.id);
    res.json({ deleted: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;