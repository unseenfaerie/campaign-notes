const express = require('express');
const router = express.Router();
const placesService = require('../../services/entities/places');
const { mapErrorToStatus } = require('../../utils/errorUtils');

// Create a new place
router.post('/', async (req, res) => {
  try {
    const result = await placesService.createPlace(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

// Get all places (JSON)
router.get('/', async (req, res) => {
  try {
    const rows = await placesService.getAllPlaces();
    res.json(rows);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

// Get a single place by id (JSON)
router.get('/:id', async (req, res) => {
  try {
    const row = await placesService.getPlaceById(req.params.id);
    res.json(row);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

// Update an existing place
router.patch('/:id', async (req, res) => {
  try {
    const result = await placesService.patchPlace(req.params.id, req.body);
    res.json(result);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

// Delete a place
router.delete('/:id', async (req, res) => {
  try {
    const result = await placesService.deletePlace(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

module.exports = router;
