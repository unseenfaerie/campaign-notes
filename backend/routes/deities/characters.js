const express = require('express');
const router = express.Router({ mergeParams: true });
const characterDeities = require('../../services/joinTables/characterDeities');
const validate = require('../../../common/validate');

// CHARACTER - DEITY ASSOCIATIONS
// Add a character to a deity
router.post('/', (req, res) => {
  const deity_id = req.params.id;
  const { character_id, short_description, long_explanation } = req.body;
  // Validate using generic entity validator
  const { valid, errors, validated } = validate.validateFields('CharacterDeity', {
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

// Get all characters for a deity
router.get('/', (req, res) => {
  const deity_id = req.params.id;
  characterDeities.getCharactersForDeity(deity_id)
    .then(characters => res.json(characters))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Get a specific character-deity relationship
router.get('/:characterId', (req, res) => {
  const character_id = req.params.characterId;
  const deity_id = req.params.id;
  characterDeities.getCharacterDeity(character_id, deity_id)
    .then(relationship => res.json(relationship))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Update character-deity association
router.patch('/:characterId', (req, res) => {
  const character_id = req.params.characterId;
  const deity_id = req.params.id;
  // Validate PATCH body for allowed fields only (partial allowed)
  const { valid, errors, validated } = validateFields('CharacterDeity', req.body, { allowPartial: true });
  if (!valid) return res.status(400).json({ errors });
  characterDeities.updateCharacterDeity(character_id, deity_id, validated)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Remove a character from a deity
router.delete('/:characterId', (req, res) => {
  const character_id = req.params.characterId;
  const deity_id = req.params.id;
  characterDeities.removeCharacterDeity(character_id, deity_id)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

module.exports = router;