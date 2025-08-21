const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper: Validate deity data
function validateDeity(d, isUpdate = false) {
  const requiredFields = ['id', 'name'];
  if (!isUpdate) {
    for (const field of requiredFields) {
      if (!d[field] || typeof d[field] !== 'string') {
        return `Missing or invalid required field: ${field}`;
      }
    }
  }
  // pantheon, alignment, short_description can be null or string
  if (d.pantheon && typeof d.pantheon !== 'string') {
    return 'Field pantheon must be a string or null';
  }
  if (d.alignment && typeof d.alignment !== 'string') {
    return 'Field alignment must be a string or null';
  }
  if (d.short_description && typeof d.short_description !== 'string') {
    return 'Field short_description must be a string or null';
  }
  return null;
}

// Render index of all deities
router.get('/index', (req, res) => {
  db.all('SELECT * FROM deities ORDER BY name', [], (err, rows) => {
    if (err) return res.status(500).send('Database error');
    res.render('deities-index', { deities: rows });
  });
});

// Create a new deity
router.post('/', (req, res) => {
  const d = req.body;
  const validationError = validateDeity(d);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  db.get('SELECT id FROM deities WHERE id = ?', [d.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (row) {
      return res.status(409).json({ error: 'A deity with this id already exists.' });
    }
    const sql = `INSERT INTO deities (id, name, pantheon, alignment, short_description) VALUES (?, ?, ?, ?, ?)`;
    const params = [d.id, d.name, d.pantheon, d.alignment, d.short_description];
    db.run(sql, params, function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: d.id });
    });
  });
});

// Update an existing deity
router.put('/:id', (req, res) => {
  const d = req.body;
  const validationError = validateDeity(d, true);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  const sql = `UPDATE deities SET name=?, pantheon=?, alignment=?, short_description=? WHERE id=?`;
  const params = [d.name, d.pantheon, d.alignment, d.short_description, req.params.id];
  db.run(sql, params, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Deity not found' });
    }
    res.json({ updated: req.params.id });
  });
});

// Delete a deity
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM deities WHERE id = ?', [req.params.id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Deity not found' });
    }
    res.json({ deleted: req.params.id });
  });
});

// Get all deities (JSON)
router.get('/', (req, res) => {
  db.all('SELECT * FROM deities', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get a single deity by id (JSON)
router.get('/:id', (req, res) => {
  db.get('SELECT * FROM deities WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Deity not found' });
    }
    res.json(row);
  });
});

// Render a deity page (SSR with associations)
router.get('/page/:id', (req, res) => {
  const deityId = req.params.id;
  db.get('SELECT * FROM deities WHERE id = ?', [deityId], (err, deity) => {
    if (err) return res.status(500).send('Database error');
    if (!deity) return res.status(404).send('Deity not found');
    // Find spheres associated with this deity
    const sphereSql = `SELECT s.id, s.name FROM deity_spheres ds JOIN spheres s ON ds.sphere_id = s.id WHERE ds.deity_id = ?`;
    db.all(sphereSql, [deityId], (err2, spheres) => {
      if (err2) return res.status(500).send('Database error');
      res.render('deity', { deity, spheres: spheres || [] });
    });
  });
});

// Render index of all deities
router.get('/index', (req, res) => {
  db.all('SELECT * FROM deities ORDER BY name', [], (err, rows) => {
    if (err) return res.status(500).send('Database error');
    res.render('deities-index', { deities: rows });
  });
});

module.exports = router;
