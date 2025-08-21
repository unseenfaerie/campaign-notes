const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper: Validate item data
function validateItem(i, isUpdate = false) {
  const requiredFields = ['id', 'name'];
  if (!isUpdate) {
    for (const field of requiredFields) {
      if (!i[field] || typeof i[field] !== 'string') {
        return `Missing or invalid required field: ${field}`;
      }
    }
  }
  return null;
}

// Create a new item
router.post('/', (req, res) => {
  const i = req.body;
  const validationError = validateItem(i);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  db.get('SELECT id FROM items WHERE id = ?', [i.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (row) {
      return res.status(409).json({ error: 'An item with this id already exists.' });
    }
    const sql = `INSERT INTO items (id, name, short_description) VALUES (?, ?, ?)`;
    const params = [i.id, i.name, i.short_description];
    db.run(sql, params, function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: i.id });
    });
  });
});

// Update an existing item
router.patch('/:id', (req, res) => {
  const i = req.body;
  const allowed = ['name', 'short_description', 'long_explanation'];
  const fields = Object.keys(i).filter(key => allowed.includes(key));
  if (fields.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update.' });
  }
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const params = fields.map(f => i[f]);
  params.push(req.params.id);
  const sql = `UPDATE items SET ${setClause} WHERE id = ?`;
  db.run(sql, params, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ updated: req.params.id });
  });
});

// Delete an item
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM items WHERE id = ?', [req.params.id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ deleted: req.params.id });
  });
});

// Get all items (JSON)
router.get('/', (req, res) => {
  db.all('SELECT * FROM items', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get a single item by id (JSON)
router.get('/:id', (req, res) => {
  db.get('SELECT * FROM items WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(row);
  });
});

module.exports = router;
