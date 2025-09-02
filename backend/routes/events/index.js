const express = require('express');
const router = express.Router();
const eventsService = require('../../services/entities/events');
const idUtils = require('../../utils/idUtils');
const { validateFields } = require('../../../common/validate');

// Helper: Validate event data using generic validator
function validateEventEntity(e, isUpdate = false) {
  const { valid, errors } = validateFields('Event', e, { allowPartial: isUpdate });
  if (!valid) return errors.join('; ');
  if (!isUpdate && idUtils.validateIdFormat(e.id) === false) {
    return 'Field id must use only lowercase and dashes';
  }
  return null;
}

// Get all events
router.get('/', async (req, res) => {
  try {
    const events = await eventsService.getAllEvents();
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single event by id
router.get('/:id', async (req, res) => {
  try {
    const event = await eventsService.getEventById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new event
router.post('/', async (req, res) => {
  const e = req.body;
  const validationError = validateEventEntity(e, false);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  try {
    const existing = await eventsService.getEventById(e.id);
    if (existing) {
      return res.status(409).json({ error: 'An event with this id already exists.' });
    }
    await eventsService.createEvent(e);
    res.status(201).json({ id: e.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Partially update an existing event
router.patch('/:id', async (req, res) => {
  const updates = req.body;
  const validationError = validateEventEntity(updates, true);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  try {
    const result = await eventsService.patchEvent(req.params.id, updates);
    if (result && result.message === 'record not found') {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete an event
router.delete('/:id', async (req, res) => {
  try {
    const existing = await eventsService.getEventById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Event not found' });
    }
    await eventsService.deleteEvent(req.params.id);
    res.json({ deleted: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.use('/:id/organizations', require('./organizations'));
router.use('/:id/places', require('./places'));
router.use('/:id/items', require('./items'));
router.use('/:id/deities', require('./deities'));
router.use('/:id/characters', require('./characters'));

module.exports = router;