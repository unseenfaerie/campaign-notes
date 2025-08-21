const express = require('express');
const router = express.Router({ mergeParams: true });
const characterOrganizations = require('../../services/characterOrganizations');

// ORGANIZATION - CHARACTER ASSOCIATIONS

// Add a character to an organization
router.post('/', (req, res) => {
  const character_id = req.params.id;
  const { org_id, role } = req.body;
  if (!org_id) return res.status(400).json({ error: 'org_id is required' });
  characterOrganizations.addCharacterOrganization(character_id, org_id, role || '')
    .then(result => res.status(201).json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Get all organizations for a character
router.get('/', (req, res) => {
  const character_id = req.params.id;
  characterOrganizations.getOrganizationsForCharacter(character_id)
    .then(organizations => res.json(organizations))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Get a specific character-organization relationship
router.get('/:orgId', (req, res) => {
  const character_id = req.params.id;
  const org_id = req.params.orgId;
  characterOrganizations.getCharacterOrganization(character_id, org_id)
    .then(relationship => res.json(relationship))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Update a character's relationship with an organization
router.patch('/:orgId', (req, res) => {
  const character_id = req.params.id;
  const org_id = req.params.orgId;
  const { role, short_description, long_explanation } = req.body;
  characterOrganizations.updateCharacterOrganization(character_id, org_id, { role, short_description, long_explanation })
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Delete a character from an organization
router.delete('/:orgId', (req, res) => {
  const character_id = req.params.id;
  const org_id = req.params.orgId;
  characterOrganizations.removeCharacterOrganization(character_id, org_id)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

module.exports = router;