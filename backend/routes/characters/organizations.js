const express = require('express');
const router = express.Router({ mergeParams: true });
const characterOrganizations = require('../../services/joinTables/characterOrganizations');

// ORGANIZATION - CHARACTER ASSOCIATIONS

// Add a character to an organization
router.post('/', (req, res) => {
  const character_id = req.params.id;
  const { org_id, joined_date, left_date, short_description, long_explanation } = req.body;
  if (!org_id) return res.status(400).json({ error: 'org_id is required' });
  if (!character_id) return res.status(400).json({ error: 'character_id is required' });
  if (!joined_date) return res.status(400).json({ error: 'joined_date is required' });
  characterOrganizations.addCharacterOrganization(character_id, org_id, joined_date, left_date || '', short_description || '', long_explanation || '')
    .then(result => res.status(201).json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Get all organizations for a character, with full relationship history for each organization
const { sortObjectsByLoreDate } = require('../../utils/dateUtils');
router.get('/', async (req, res) => {
  const character_id = req.params.id;
  try {
    // Get all organization_ids for this character using the service layer
    const orgIds = await characterOrganizations.getOrganizationIdsForCharacter(character_id);
    if (!orgIds.length) return res.json([]);

    // For each organization, get all relationship records
    const results = await Promise.all(orgIds.map(async (organization_id) => {
      // Get all relationship records
      const relationships = await characterOrganizations.getAllCharacterOrganizationRecords(character_id, organization_id);
      // Sort relationships chronologically by joined_date
      const sortedRelationships = sortObjectsByLoreDate(relationships, 'joined_date', true);
      return { organization_id, history: sortedRelationships };
    }));
    // Filter out any nulls (in case an org was deleted)
    res.json(results.filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get the history of a specific character-organization relationship
router.get('/:orgId', async (req, res) => {
  const character_id = req.params.id;
  const organization_id = req.params.orgId;
  try {
    const history = await characterOrganizations.getAllCharacterOrganizationRecords(character_id, organization_id);
    if (!history || history.length === 0) {
      return res.status(404).json({ error: 'No history found for this character-organization pair' });
    }
    // Sort by joined_date ascending (chronological)
    const sorted = sortObjectsByLoreDate(history, 'joined_date', true);
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a specific character-organization relationship by joined_date
router.get('/:orgId/:joinedDate', async (req, res) => {
  const character_id = req.params.id;
  const organization_id = req.params.orgId;
  const joined_date = req.params.joinedDate;
  try {
    const record = await characterOrganizations.getCharacterOrganizationByDate(character_id, organization_id, joined_date);
    if (!record) return res.status(404).json({ error: 'Record not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a character-organization association by joined_date
router.patch('/:orgId/:joinedDate', (req, res) => {
  const character_id = req.params.id;
  const organization_id = req.params.orgId;
  const joined_date = req.params.joinedDate;
  const updates = req.body;
  characterOrganizations.updateCharacterOrganization(character_id, organization_id, joined_date, updates)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Remove a single instance of organization membership from a character
router.delete('/:orgId/:joinedDate', (req, res) => {
  const character_id = req.params.id;
  const organization_id = req.params.orgId;
  const joined_date = req.params.joinedDate;
  characterOrganizations.removeInstanceCharacterOrganization(character_id, organization_id, joined_date)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Remove all associations between a character and an organization
router.delete('/:orgId', (req, res) => {
  const character_id = req.params.id;
  const organization_id = req.params.orgId;
  characterOrganizations.removeCharacterOrganizationRecords(character_id, organization_id)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Remove ALL organization relationships from a character
router.delete('/', (req, res) => {
  const character_id = req.params.id;
  characterOrganizations.removeAllCharacterOrganizationRecords(character_id)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

module.exports = router;