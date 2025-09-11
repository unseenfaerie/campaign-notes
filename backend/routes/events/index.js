const express = require('express');
const router = express.Router();
const eventsService = require('../../services/entities/events');
const { mapErrorToStatus } = require('../../utils/errorUtils');

// Create a new event
router.post('/', async (req, res) => {
  try {
    const result = await eventsService.createEvent(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

// Get all events
router.get('/', async (req, res) => {
  try {
    const events = await eventsService.getAllEvents();
    res.json(events);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

// Get a single event by id
router.get('/:id', async (req, res) => {
  try {
    const event = await eventsService.getEventById(req.params.id);
    res.json(event);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

// Get a full-detail event with all associations
router.get('/:id/full', async (req, res) => {
  try {
    const fullEvent = await eventsService.getFullEventById(req.params.id);
    res.json(fullEvent);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

// Partially update an existing event
router.patch('/:id', async (req, res) => {
  try {
    const result = await eventsService.patchEvent(req.params.id, req.body);
    res.json(result);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

// Delete an event
router.delete('/:id', async (req, res) => {
  try {
    const result = await eventsService.deleteEvent(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

router.use('/:id/organizations', require('./organizations'));
router.use('/:id/places', require('./places'));
router.use('/:id/items', require('./items'));
router.use('/:id/deities', require('./deities'));
router.use('/:id/characters', require('./characters'));

module.exports = router;