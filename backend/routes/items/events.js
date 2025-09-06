const express = require('express');
const router = express.Router({ mergeParams: true });
const eventItemsService = require('../../services/joinTables/eventItems');

// Add an event-item association
router.post('/', async (req, res) => {
  const item_id = req.params.id;
  const { event_id, short_description, long_explanation } = req.body;
  try {
    const result = await eventItemsService.addEventItem(event_id, item_id, short_description, long_explanation);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all events for an item
router.get('/', async (req, res) => {
  const item_id = req.params.id;
  try {
    const results = await eventItemsService.getEventsForItem(item_id);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a specific event-item association
router.get('/:eventId', async (req, res) => {
  const item_id = req.params.id;
  const event_id = req.params.eventId;
  try {
    const result = await eventItemsService.getEventItem(event_id, item_id);
    if (!result) {
      return res.status(404).json({ error: 'No record found for this event-item pair' });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update an event-item association
router.patch('/:eventId', async (req, res) => {
  const item_id = req.params.id;
  const event_id = req.params.eventId;
  try {
    const result = await eventItemsService.patchEventItem(event_id, item_id, req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Remove an event-item association
router.delete('/:eventId', async (req, res) => {
  const item_id = req.params.id;
  const event_id = req.params.eventId;
  try {
    const result = await eventItemsService.removeEventItem(event_id, item_id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
