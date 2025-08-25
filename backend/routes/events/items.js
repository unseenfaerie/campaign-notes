const express = require('express');
const router = express.Router({ mergeParams: true });
const eventItems = require('../../services/eventItems');

// Add an item to an event
router.post('/', (req, res) => {
  const event_id = req.params.id;
  const { item_id, short_description, long_explanation } = req.body;
  if (!item_id) return res.status(400).json({ error: 'item_id is required' });
  eventItems.addEventItem(event_id, item_id, short_description || '', long_explanation || '')
    .then(result => res.status(201).json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Read event-item associations
router.get('/', (req, res) => {
  const event_id = req.params.id;
  eventItems.getItemsForEvent(event_id)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Read specific event-item association
router.get('/:itemId', (req, res) => {
  const event_id = req.params.id;
  const item_id = req.params.itemId;
  eventItems.getEventItem(event_id, item_id)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Update event-item association
router.patch('/:itemId', (req, res) => {
  const event_id = req.params.id;
  const item_id = req.params.itemId;
  eventItems.updateEventItem(event_id, item_id, req.body)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Remove event-item association
router.delete('/:itemId', (req, res) => {
  const event_id = req.params.id;
  const item_id = req.params.itemId;
  eventItems.removeEventItem(event_id, item_id)
    .then(result => res.json({ success: true, result }))
    .catch(err => res.status(500).json({ error: err.message }));
});

module.exports = router;
