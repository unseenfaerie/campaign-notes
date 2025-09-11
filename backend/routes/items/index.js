const express = require('express');
const router = express.Router();
const itemsService = require('../../services/entities/items');
const { mapErrorToStatus } = require('../../utils/errorUtils');

// Create a new item
router.post('/', async (req, res) => {
  try {
    const result = await itemsService.createItem(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

// Get all items (JSON)
router.get('/', async (req, res) => {
  try {
    const items = await itemsService.getAllItems();
    res.json(items);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

// Get a single item by id (JSON)
router.get('/:id', async (req, res) => {
  try {
    const item = await itemsService.getItemById(req.params.id);
    res.json(item);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

// Get a single item by id (JSON)
router.get('/:id/full', async (req, res) => {
  try {
    const item = await itemsService.getFullItemById(req.params.id);
    res.json(item);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

// Update an existing item (PATCH)
router.patch('/:id', async (req, res) => {
  try {
    const result = await itemsService.patchItem(req.params.id, req.body);
    res.json(result);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

// Delete an item
router.delete('/:id', async (req, res) => {
  try {
    const result = await itemsService.deleteItem(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

router.use('/:id/characters', require('./characters'));
router.use('/:id/events', require('./events'));
router.use('/:id/spells', require('./spells'));

module.exports = router;