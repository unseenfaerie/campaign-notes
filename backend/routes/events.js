const express = require('express');
const router = express.Router();
const db = require('../db');

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
