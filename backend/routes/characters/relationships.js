const express = require('express');
const router = express.Router({ mergeParams: true });
const characterRelationships = require('../../services/joinTables/characterRelationships');

// CHARACTER - CHARACTER ASSOCIATIONS
// Add a relationship to another character
router.post('/', (req, res) => {
  const character_id = req.params.id;
  const { target_character_id, short_description, long_explanation } = req.body;
  if (!target_character_id) return res.status(400).json({ error: 'target_character_id is required' });
  characterRelationships.addCharacterRelationship(character_id, target_character_id, short_description || '', long_explanation || '')
    .then(result => res.status(201).json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Get all relationships that involve the character
router.get('/', (req, res) => {
  const character_id = req.params.id;
  characterRelationships.getRelationshipsForCharacter(character_id)
    .then(relationships => res.json(relationships))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Get a relationship with another character
router.get('/:targetId', (req, res) => {
  const character_id = req.params.id;
  const target_character_id = req.params.targetId;
  characterRelationships.getCharacterRelationship(character_id, target_character_id)
    .then(relationship => res.json(relationship))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Update a relationship to another character
router.patch('/:targetId', (req, res) => {
  const character_id = req.params.id;
  const target_character_id = req.params.targetId;
  const updates = req.body;
  characterRelationships.updateCharacterRelationship(character_id, target_character_id, updates)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Remove a relationship to another character
router.delete('/:targetId', (req, res) => {
  const character_id = req.params.id;
  const target_character_id = req.params.targetId;
  characterRelationships.removeCharacterRelationship(character_id, target_character_id)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

module.exports = router;