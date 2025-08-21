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

// Render index of all items
router.get('/index', (req, res) => {
  db.all('SELECT * FROM items ORDER BY name', [], (err, rows) => {
    if (err) return res.status(500).send('Database error');
    res.render('items-index', { items: rows });
  });
});

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
    const sql = `INSERT INTO items (id, name, description) VALUES (?, ?, ?)`;
    const params = [i.id, i.name, i.description];
    db.run(sql, params, function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: i.id });
    });
  });
});

// Update an existing item
router.put('/:id', (req, res) => {
  const i = req.body;
  const validationError = validateItem(i, true);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  const sql = `UPDATE items SET name=?, description=? WHERE id=?`;
  const params = [i.name, i.description, req.params.id];
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

// Render an item page (SSR with associations)
router.get('/page/:id', (req, res) => {
  const itemId = req.params.id;
  db.get('SELECT * FROM items WHERE id = ?', [itemId], (err, item) => {
    if (err) return res.status(500).send('Database error');
    if (!item) return res.status(404).send('Item not found');
    // Find characters who have held this item
    const charSql = `SELECT c.id, c.name FROM character_items ci JOIN characters c ON ci.character_id = c.id WHERE ci.item_id = ?`;
    db.all(charSql, [itemId], (err2, characters) => {
      if (err2) return res.status(500).send('Database error');
      res.render('item', { item, characters: characters || [] });
    });
  });
});

// Render index of all items
router.get('/index', (req, res) => {
  db.all('SELECT * FROM items ORDER BY name', [], (err, rows) => {
    if (err) return res.status(500).send('Database error');
    res.render('items-index', { items: rows });
  });
});

module.exports = router;
