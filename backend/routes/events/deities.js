const express = require('express');
const router = express.Router({ mergeParams: true });
const eventDeities = require('../../services/eventDeities');

// Add a deity to an event
router.post('/', (req, res) => {
  const event_id = req.params.id;
  const { deity_id, short_description, long_explanation } = req.body;
  if (!deity_id) return res.status(400).json({ error: 'deity_id is required' });
  eventDeities.addEventDeity(event_id, deity_id, short_description || '', long_explanation || '')
    .then(result => res.status(201).json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Read event-deity associations
router.get('/', (req, res) => {
  const event_id = req.params.id;
  eventDeities.getDeitiesForEvent(event_id)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Read specific event-deity association
router.get('/:deityId', (req, res) => {
  const event_id = req.params.id;
  const deity_id = req.params.deityId;
  eventDeities.getEventDeity(event_id, deity_id)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Update event-deity association
router.patch('/:deityId', (req, res) => {
  const event_id = req.params.id;
  const deity_id = req.params.deityId;
  eventDeities.updateEventDeity(event_id, deity_id, req.body)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Remove event-deity association
router.delete('/:deityId', (req, res) => {
  const event_id = req.params.id;
  const deity_id = req.params.deityId;
  eventDeities.removeEventDeity(event_id, deity_id)
    .then(result => res.json({ success: true, result }))
    .catch(err => res.status(500).json({ error: err.message }));
});

module.exports = router;
