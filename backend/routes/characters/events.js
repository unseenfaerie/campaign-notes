const express = require('express');
const router = express.Router({ mergeParams: true });
const eventCharacters = require('../../services/joinTables/eventCharacters.js');
const { validateFields } = require('../../../common/validate');

// EVENT - CHARACTER ASSOCIATIONS

// Add a character to an event
router.post('/', (req, res) => {
  const character_id = req.params.id;
  const { event_id, short_description, long_explanation } = req.body;
  // Validate using generic entity validator
  const { valid, errors, validated } = validateFields('EventCharacter', {
    event_id,
    character_id,
    short_description,
    long_explanation
  });
  if (!valid) return res.status(400).json({ errors });
  eventCharacters.addEventCharacter(
    validated.event_id,
    validated.character_id,
    validated.short_description || '',
    validated.long_explanation || ''
  )
    .then(result => res.status(201).json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Get all events for a character
router.get('/', (req, res) => {
  const character_id = req.params.id;
  eventCharacters.getEventsForCharacter(character_id)
    .then(events => res.json(events))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Get a specific event-character relationship
router.get('/:eventId', (req, res) => {
  const character_id = req.params.id;
  const event_id = req.params.eventId;
  eventCharacters.getEventCharacter(event_id, character_id)
    .then(relationship => res.json(relationship))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Update event-character association
router.patch('/:eventId', (req, res) => {
  const character_id = req.params.id;
  const event_id = req.params.eventId;
  // Validate PATCH body for allowed fields only (partial allowed)
  const { valid, errors, validated } = validateFields('EventCharacter', req.body, { allowPartial: true });
  if (!valid) return res.status(400).json({ errors });
  eventCharacters.updateEventCharacter(event_id, character_id, validated)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Remove a character from an event
router.delete('/:eventId', (req, res) => {
  const character_id = req.params.id;
  const event_id = req.params.eventId;
  eventCharacters.removeEventCharacter(event_id, character_id)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

module.exports = router;