const express = require('express');
const router = express.Router({ mergeParams: true });
const characterDeities = require('../../services/characterDeities');

// DEITY - CHARACTER ASSOCIATIONS
// Add a deity to a character
router.post('/', (req, res) => {
  const character_id = req.params.id;
  const { deity_id, short_description, long_explanation } = req.body;
  if (!deity_id) return res.status(400).json({ error: 'deity_id is required' });
  characterDeities.addCharacterDeity(character_id, deity_id, short_description || '', long_explanation || '')
    .then(result => res.status(201).json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Get all deities for a character
router.get('/', (req, res) => {
  const character_id = req.params.id;
  characterDeities.getDeitiesForCharacter(character_id)
    .then(deities => res.json(deities))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Get a specific deity-character relationship
router.get('/:deityId', (req, res) => {
  const character_id = req.params.id;
  const deity_id = req.params.deityId;
  characterDeities.getCharacterDeity(character_id, deity_id)
    .then(relationship => res.json(relationship))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Update deity-character association
router.patch('/:deityId', (req, res) => {
  const character_id = req.params.id;
  const deity_id = req.params.deityId;
  const updates = req.body;
  characterDeities.updateCharacterDeity(character_id, deity_id, updates)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Remove a deity from a character
router.delete('/:deityId', (req, res) => {
  const character_id = req.params.id;
  const deity_id = req.params.deityId;
  characterDeities.removeCharacterDeity(character_id, deity_id)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

module.exports = router;