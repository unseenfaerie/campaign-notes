const express = require('express');
const router = express.Router();
const idUtils = require('../../utils/idUtils');
const { validateFields } = require('../../../common/validate');
const itemsService = require('../../services/entities/items');

// Helper: Validate item data using generic validator
function validateItemEntity(i, isUpdate = false) {
  const { valid, errors } = validateFields('Item', i, { allowPartial: isUpdate });
  if (!valid) return errors.join('; ');
  if (!isUpdate && !idUtils.validateIdFormat(i.id)) {
    return 'Invalid id format. Only use lowercase letters and dashes.';
  }
  return null;
}

// Create a new item
router.post('/', async (req, res) => {
  const i = req.body;
  const validationError = validateItemEntity(i, false);
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
  const validationError = validateItemEntity(updates, true);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  try {
    const result = await itemsService.patchItem(req.params.id, updates);
    if (result && result.message === 'record not found') {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(result);
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

router.use('/:id/characters', require('./characters'));
router.use('/:id/spells', require('./spells'));

module.exports = router;