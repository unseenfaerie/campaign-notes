const express = require('express');
const router = express.Router({ mergeParams: true });
const characterItems = require('../../services/characterItems');

// ITEM - CHARACTER ASSOCIATIONS
// Add an item to a character
router.post('/', (req, res) => {
  const character_id = req.params.id;
  const { item_id, short_description, long_explanation } = req.body;
  if (!item_id) return res.status(400).json({ error: 'item_id is required' });
  characterItems.addCharacterItem(character_id, item_id, short_description || '', long_explanation || '')
    .then(result => res.status(201).json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Get all items for a character
router.get('/', (req, res) => {
  const character_id = req.params.id;
  characterItems.getItemsForCharacter(character_id)
    .then(items => res.json(items))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Get all items for a character
router.get('/:characterId/items', (req, res) => {
  const character_id = req.params.characterId;
  characterItems.getItemsForCharacter(character_id)
    .then(items => res.json(items))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Get a specific item-character relationship
router.get('/:itemId', (req, res) => {
  const character_id = req.params.id;
  const item_id = req.params.itemId;
  characterItems.getCharacterItem(character_id, item_id)
    .then(relationship => res.json(relationship))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Update item-character association
router.patch('/:itemId', (req, res) => {
  const character_id = req.params.id;
  const item_id = req.params.itemId;
  const updates = req.body;
  characterItems.updateCharacterItem(character_id, item_id, updates)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Remove an item from a character
router.delete('/:itemId', (req, res) => {
  const character_id = req.params.id;
  const item_id = req.params.itemId;
  characterItems.removeCharacterItem(character_id, item_id)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

module.exports = router;