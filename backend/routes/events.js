const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper: Validate event data
function validateEvent(e, isUpdate = false) {
  const requiredFields = ['id', 'name'];
  if (!isUpdate) {
    for (const field of requiredFields) {
      if (!e[field] || typeof e[field] !== 'string') {
        return `Missing or invalid required field: ${field}`;
      }
    }
  }
  // Optionally check date fields
  if (e.real_world_date && typeof e.real_world_date !== 'string') {
    return 'Field real_world_date must be a string or null';
  }
  if (e.in_game_time && typeof e.in_game_time !== 'string') {
    return 'Field in_game_time must be a string or null';
  }
  return null;
}

// Render index of all events
router.get('/index', (req, res) => {
  db.all('SELECT * FROM events ORDER BY name', [], (err, rows) => {
    if (err) return res.status(500).send('Database error');
    res.render('events-index', { events: rows });
  });
});

// Create a new event
router.post('/', (req, res) => {
  const e = req.body;
  const validationError = validateEvent(e);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  db.get('SELECT id FROM events WHERE id = ?', [e.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (row) {
      return res.status(409).json({ error: 'An event with this id already exists.' });
    }
    const sql = `INSERT INTO events (id, name, real_world_date, in_game_time, description, previous_event_id, next_event_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [
      e.id, e.name, e.real_world_date, e.in_game_time, e.description, e.previous_event_id, e.next_event_id
    ];
    db.run(sql, params, function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: e.id });
    });
  });
});

// Update an existing event
router.put('/:id', (req, res) => {
  const e = req.body;
  const validationError = validateEvent(e, true);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  const sql = `UPDATE events SET name=?, real_world_date=?, in_game_time=?, description=?, previous_event_id=?, next_event_id=? WHERE id=?`;
  const params = [
    e.name, e.real_world_date, e.in_game_time, e.description, e.previous_event_id, e.next_event_id, req.params.id
  ];
  db.run(sql, params, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json({ updated: req.params.id });
  });
});

// Delete an event
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM events WHERE id = ?', [req.params.id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json({ deleted: req.params.id });
  });
});

// Get all events (JSON)
router.get('/', (req, res) => {
  db.all('SELECT * FROM events', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get a single event by id (JSON)
router.get('/:id', (req, res) => {
  db.get('SELECT * FROM events WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(row);
  });
});

// Render a event page (SSR with associations)
router.get('/page/:id', (req, res) => {
  const eventId = req.params.id;
  db.get('SELECT * FROM events WHERE id = ?', [eventId], (err, event) => {
    if (err) return res.status(500).send('Database error');
    if (!event) return res.status(404).send('event not found');
    // Find characters in this event
    const charSql = `SELECT c.id, c.name FROM event_characters ec JOIN characters c ON ec.character_id = c.id WHERE ec.event_id = ?`;
    db.all(charSql, [eventId], (err2, characters) => {
      if (err2) return res.status(500).send('Database error');
      res.render('event', { event, characters: characters || [] });
    });
  });
});

// Render index of all events
router.get('/index', (req, res) => {
  db.all('SELECT * FROM events ORDER BY name', [], (err, rows) => {
    if (err) return res.status(500).send('Database error');
    res.render('events-index', { events: rows });
  });
});

module.exports = router;
