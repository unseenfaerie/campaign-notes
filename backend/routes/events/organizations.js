const express = require('express');
const router = express.Router({ mergeParams: true });
const eventOrganizations = require('../../services/eventOrganizations');

// Add an organization to an event
router.post('/', (req, res) => {
  const event_id = req.params.id;
  const { organization_id, short_description, long_explanation } = req.body;
  if (!organization_id) return res.status(400).json({ error: 'organization_id is required' });
  eventOrganizations.addEventOrganization(event_id, organization_id, short_description || '', long_explanation || '')
    .then(result => res.status(201).json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Read event-organization associations
router.get('/', (req, res) => {
  const event_id = req.params.id;
  eventOrganizations.getOrganizationsForEvent(event_id)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Read specific event-organization association
router.get('/:organizationId', (req, res) => {
  const event_id = req.params.id;
  const organization_id = req.params.organizationId;
  eventOrganizations.getEventOrganization(event_id, organization_id)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Update event-organization association
router.patch('/:organizationId', (req, res) => {
  const event_id = req.params.id;
  const organization_id = req.params.organizationId;
  eventOrganizations.updateEventOrganization(event_id, organization_id, req.body)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Remove event-organization association
router.delete('/:organizationId', (req, res) => {
  const event_id = req.params.id;
  const organization_id = req.params.organizationId;
  eventOrganizations.removeEventOrganization(event_id, organization_id)
    .then(result => res.json({ success: true, result }))
    .catch(err => res.status(500).json({ error: err.message }));
});

module.exports = router;
