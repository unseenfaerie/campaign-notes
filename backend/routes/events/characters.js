const express = require('express');
const router = express.Router({ mergeParams: true });
const eventCharacters = require('../../services/joinTables/eventCharacters');

// Add a character to an event
router.post('/', (req, res) => {
  const event_id = req.params.id;
  const { character_id, short_description, long_explanation } = req.body;
  if (!character_id) return res.status(400).json({ error: 'character_id is required' });
  eventCharacters.addEventCharacter(event_id, character_id, short_description || '', long_explanation || '')
    .then(result => res.status(201).json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Read event-character associations
router.get('/', (req, res) => {
  const event_id = req.params.id;
  eventCharacters.getCharactersForEvent(event_id)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Read specific event character association
router.get('/:characterId', (req, res) => {
  const event_id = req.params.id;
  const character_id = req.params.characterId;
  eventCharacters.getEventCharacter(event_id, character_id)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Update event-character association
router.patch('/:characterId', (req, res) => {
  const event_id = req.params.id;
  const character_id = req.params.characterId;
  eventCharacters.updateEventCharacter(event_id, character_id, req.body)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Remove a character from an event
router.delete('/:characterId', (req, res) => {
  const event_id = req.params.id;
  const character_id = req.params.characterId;
  eventCharacters.removeEventCharacter(event_id, character_id)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

module.exports = router;