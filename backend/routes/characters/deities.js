const express = require('express');
const router = express.Router({ mergeParams: true });

const characterDeities = require('../../services/joinTables/characterDeities');
const { validateFields } = require('../../../common/validate');

// DEITY - CHARACTER ASSOCIATIONS
// Add a deity to a character
router.post('/', (req, res) => {
  const character_id = req.params.id;
  const { deity_id, short_description, long_explanation } = req.body;
  // Validate using generic entity validator
  const { valid, errors, validated } = validateFields('CharacterDeity', {
    character_id,
    deity_id,
    short_description,
    long_explanation
  });
  if (!valid) return res.status(400).json({ errors });
  characterDeities.addCharacterDeity(
    validated.character_id,
    validated.deity_id,
    validated.short_description || '',
    validated.long_explanation || ''
  )
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
  // Validate PATCH body for allowed fields only (partial allowed)
  const { valid, errors, validated } = validateFields('CharacterDeity', req.body, { allowPartial: true });
  if (!valid) return res.status(400).json({ errors });
  characterDeities.updateCharacterDeity(character_id, deity_id, validated)
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