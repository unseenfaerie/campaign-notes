const eventCharacters = require('../services/eventCharacters');
const express = require('express');
const router = express.Router();
const eventsService = require('../services/events');

// Helper: Validate event data
function validateEvent(e, isUpdate = false) {
  const requiredFields = ['id', 'name'];
  if (!isUpdate) {
    for (const field of requiredFields) {
      if (!e[field] || typeof e[field] !== 'string') {
        return `Missing or invalid required field: ${field}`;
      }
    }
  }
  if (e.real_world_date && typeof e.real_world_date !== 'string') {
    return 'Field real_world_date must be a string or null';
  }
  if (e.in_game_time && typeof e.in_game_time !== 'string') {
    return 'Field in_game_time must be a string or null';
  }
  return null;
}

// Get all events
router.get('/', async (req, res) => {
  try {
    const events = await eventsService.getAllEvents();
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single event by id
router.get('/:id', async (req, res) => {
  try {
    const event = await eventsService.getEventById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new event
router.post('/', async (req, res) => {
  const e = req.body;
  const validationError = validateEvent(e);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  try {
    const existing = await eventsService.getEventById(e.id);
    if (existing) {
      return res.status(409).json({ error: 'An event with this id already exists.' });
    }
    await eventsService.createEvent(e);
    res.status(201).json({ id: e.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Partially update an existing event
router.patch('/:id', async (req, res) => {
  const updates = req.body;
  const allowed = [
    'name',
    'real_world_date',
    'in_game_time',
    'previous_event_id',
    'next_event_id',
    'short_description',
    'long_explanation'
  ];
  const fields = Object.keys(updates).filter(key => allowed.includes(key));
  if (fields.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update.' });
  }
  try {
    await eventsService.patchEvent(req.params.id, updates);
    const updated = await eventsService.getEventById(req.params.id);
    if (!updated) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json({ updated: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete an event
router.delete('/:id', async (req, res) => {
  try {
    const existing = await eventsService.getEventById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Event not found' });
    }
    await eventsService.deleteEvent(req.params.id);
    res.json({ deleted: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// EVENT - CHARACTER ASSOCIATIONS

// Add a character to an event
router.post('/:id/characters', (req, res) => {
  const event_id = req.params.id;
  const { character_id, short_description, long_explanation } = req.body;
  if (!character_id) return res.status(400).json({ error: 'character_id is required' });
  eventCharacters.addEventCharacter(event_id, character_id, short_description || '', long_explanation || '')
    .then(result => res.status(201).json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Update event-character association
router.patch('/:id/characters/:characterId', (req, res) => {
  const event_id = req.params.id;
  const character_id = req.params.characterId;
  eventCharacters.updateEventCharacter(event_id, character_id, req.body)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Remove a character from an event
router.delete('/:id/characters/:characterId', (req, res) => {
  const event_id = req.params.id;
  const character_id = req.params.characterId;
  eventCharacters.removeEventCharacter(event_id, character_id)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

module.exports