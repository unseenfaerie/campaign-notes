const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper: Validate place data
function validatePlace(p, isUpdate = false) {
  const requiredFields = ['id', 'name', 'type'];
  if (!isUpdate) {
    for (const field of requiredFields) {
      if (!p[field] || typeof p[field] !== 'string') {
        return `Missing or invalid required field: ${field}`;
      }
    }
  }
  // parent_id can be null or string
  if (p.parent_id && typeof p.parent_id !== 'string') {
    return 'Field parent_id must be a string or null';
  }
  return null;
}

// Render index of all places
router.get('/index', (req, res) => {
  db.all('SELECT * FROM places ORDER BY name', [], (err, rows) => {
    if (err) return res.status(500).send('Database error');
    res.render('places-index', { places: rows });
  });
});

// Render a place page (SSR)
// Helper: generic association query (copied from characters.js for reuse)
function getAssociations({
  db,
  joinTable,
  joinKey,
  targetTable,
  targetKey = 'id',
  targetFields = ['id', 'name'],
  joinFields = [],
  whereKey,
  whereValue
}) {
  return new Promise((resolve, reject) => {
    const targetSelect = targetFields.map(f => `${targetTable}.${f}`).join(', ');
    const joinSelect = joinFields.map(f => `${joinTable}.${f} as ${f}`).join(', ');
    const fields = [targetSelect, joinSelect].filter(Boolean).join(', ');
    const sql = `SELECT ${fields} FROM ${joinTable}
            JOIN ${targetTable} ON ${joinTable}.${joinKey} = ${targetTable}.${targetKey}
            WHERE ${joinTable}.${whereKey} = ?`;
    db.all(sql, [whereValue], (err, rows) => err ? reject(err) : resolve(rows || []));
  });
}

// Render a place page (SSR with all associations)
router.get('/page/:id', (req, res) => {
  db.get('SELECT * FROM places WHERE id = ?', [req.params.id], (err, place) => {
    if (err) return res.status(500).send('Database error');
    if (!place) return res.status(404).send('Place not found');

    const queries = {
      events: getAssociations({
        db,
        joinTable: 'event_places',
        joinKey: 'event_id',
        targetTable: 'events',
        whereKey: 'place_id',
        whereValue: place.id
      }),
      organizations: new Promise((resolve, reject) => {
        // organizations table does not have a direct join, but we can infer by locations string containing this place's id or name
        db.all('SELECT id, name FROM organizations WHERE locations LIKE ?', [`%${place.name}%`], (err, rows) => err ? reject(err) : resolve(rows || []));
      })
    };

    Promise.all([
      queries.events,
      queries.organizations
    ]).then(([events, organizations]) => {
      res.render('place', {
        place,
        events: events || [],
        organizations: organizations || []
      });
    }).catch(() => res.status(500).send('Database error'));
  });
});

// Create a new place
router.post('/', (req, res) => {
  const p = req.body;
  const validationError = validatePlace(p);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  db.get('SELECT id FROM places WHERE id = ?', [p.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (row) {
      return res.status(409).json({ error: 'A place with this id already exists.' });
    }
    const sql = `INSERT INTO places (id, name, type, parent_id, short_description) VALUES (?, ?, ?, ?, ?)`;
    const params = [p.id, p.name, p.type, p.parent_id, p.short_description];
    db.run(sql, params, function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: p.id });
    });
  });
});

// Update an existing place
router.patch('/:id', (req, res) => {
  const p = req.body;
  const allowed = ['name', 'type', 'parent_id', 'short_description', 'long_explanation'];
  const fields = Object.keys(p).filter(key => allowed.includes(key));
  if (fields.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update.' });
  }
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const params = fields.map(f => p[f]);
  params.push(req.params.id);
  const sql = `UPDATE places SET ${setClause} WHERE id = ?`;
  db.run(sql, params, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Place not found' });
    }
    res.json({ updated: req.params.id });
  });
});

// Delete a place
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM places WHERE id = ?', [req.params.id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Place not found' });
    }
    res.json({ deleted: req.params.id });
  });
});

// Get all places (JSON)
router.get('/', (req, res) => {
  db.all('SELECT * FROM places', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get a single place by id (JSON)
router.get('/:id', (req, res) => {
  db.get('SELECT * FROM places WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Place not found' });
    }
    res.json(row);
  });
});

module.exports = router;
