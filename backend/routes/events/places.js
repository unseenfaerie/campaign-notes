const express = require('express');
const router = express.Router({ mergeParams: true });
const eventPlaces = require('../../services/joinTables/eventPlaces');

// Add a place to an event
router.post('/', (req, res) => {
  const event_id = req.params.id;
  const { place_id, short_description, long_explanation } = req.body;
  if (!place_id) return res.status(400).json({ error: 'place_id is required' });
  eventPlaces.addEventPlace(event_id, place_id, short_description || '', long_explanation || '')
    .then(result => res.status(201).json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Read event-place associations
router.get('/', (req, res) => {
  const event_id = req.params.id;
  eventPlaces.getPlacesForEvent(event_id)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Read specific event place association
router.get('/:placeId', (req, res) => {
  const event_id = req.params.id;
  const place_id = req.params.placeId;
  eventPlaces.getEventPlace(event_id, place_id)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Update event-place association
router.patch('/:placeId', (req, res) => {
  const event_id = req.params.id;
  const place_id = req.params.placeId;
  eventPlaces.updateEventPlace(event_id, place_id, req.body)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Remove a place from an event
router.delete('/:placeId', (req, res) => {
  const event_id = req.params.id;
  const place_id = req.params.placeId;
  eventPlaces.removeEventPlace(event_id, place_id)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

module.exports = router;