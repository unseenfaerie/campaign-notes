const express = require('express');
const router = express.Router();
const deityService = require('../../services/entities/deities');
const { mapErrorToStatus } = require('../../utils/errorUtils');

// Create a new deity
router.post('/', async (req, res) => {
  try {
    const result = await deityService.createDeity(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

// Get all spells
router.get('/', async (req, res) => {
  try {
    const deities = await deityService.getAllDeities();
    res.json(deities);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

// Get a single deity by id
router.get('/:id', async (req, res) => {
  try {
    const deity = await deityService.getDeityById(req.params.id);
    res.json(deity);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

// Get a full-detail deity with all associations
router.get('/:id/full', async (req, res) => {
  try {
    const fullDeity = await deityService.getFullDeityById(req.params.id);
    res.json(fullDeity);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

// Partially update an existing deity
router.patch('/:id', async (req, res) => {
  try {
    const result = await deityService.patchDeity(req.params.id, req.body);
    res.json(result);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

// Delete a deity
router.delete('/:id', async (req, res) => {
  try {
    const result = await deityService.deleteDeity(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

router.use('/:id/characters', require('./characters'));
router.use('/:id/spheres', require('./spheres'));

module.exports = router;
