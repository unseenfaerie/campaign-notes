const express = require('express');
const router = express.Router({ mergeParams: true });
const characterRelationships = require('../../services/joinTables/characterRelationships');
const { validateFields } = require('../../../common/validate');

// CHARACTER - CHARACTER ASSOCIATIONS
// Add a relationship to another character
router.post('/', (req, res) => {
  const character_id = req.params.id;
  const { related_id, relationship_type, short_description, long_explanation } = req.body;
  // Validate using generic entity validator
  const { valid, errors, validated } = validateFields('CharacterRelationship', {
    character_id,
    related_id: related_id,
    relationship_type,
    short_description,
    long_explanation
  });
  if (!valid) return res.status(400).json({ errors });
  characterRelationships.addCharacterRelationship(
    validated.character_id,
    validated.related_id,
    validated.relationship_type,
    validated.short_description || '',
    validated.long_explanation || ''
  )
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
  const related_id = req.params.targetId;
  // Validate PATCH body for allowed fields only (partial allowed)
  const { valid, errors, validated } = validateFields('CharacterRelationship', req.body, { allowPartial: true });
  if (!valid) return res.status(400).json({ errors });
  characterRelationships.updateCharacterRelationship(character_id, related_id, validated)
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