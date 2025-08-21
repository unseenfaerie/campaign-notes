const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper: Validate organization data
function validateOrganization(o, isUpdate = false) {
  const requiredFields = ['id', 'name', 'type'];
  if (!isUpdate) {
    for (const field of requiredFields) {
      if (!o[field] || typeof o[field] !== 'string') {
        return `Missing or invalid required field: ${field}`;
      }
    }
  }
  // locations can be null or string (CSV or JSON, up to you)
  if (o.locations && typeof o.locations !== 'string') {
    return 'Field locations must be a string or null';
  }
  return null;
}

// Render index of all organizations
router.get('/index', (req, res) => {
  db.all('SELECT * FROM organizations ORDER BY name', [], (err, rows) => {
    if (err) return res.status(500).send('Database error');
    res.render('organizations-index', { organizations: rows });
  });
});

// Create a new organization
router.post('/', (req, res) => {
  const o = req.body;
  const validationError = validateOrganization(o);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  db.get('SELECT id FROM organizations WHERE id = ?', [o.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (row) {
      return res.status(409).json({ error: 'An organization with this id already exists.' });
    }
    const sql = `INSERT INTO organizations (id, name, locations, type, description) VALUES (?, ?, ?, ?, ?)`;
    const params = [o.id, o.name, o.locations, o.type, o.description];
    db.run(sql, params, function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: o.id });
    });
  });
});

// Partially update an existing organization
router.patch('/:id', (req, res) => {
  const o = req.body;
  const allowed = ['name', 'type', 'locations', 'description'];
  const fields = Object.keys(o).filter(key => allowed.includes(key));
  if (fields.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update.' });
  }
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const params = fields.map(f => o[f]);
  params.push(req.params.id);
  const sql = `UPDATE organizations SET ${setClause} WHERE id = ?`;
  db.run(sql, params, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    res.json({ updated: req.params.id });
  });
});

// Delete an organization
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM organizations WHERE id = ?', [req.params.id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    res.json({ deleted: req.params.id });
  });
});

// Get all organizations (JSON)
router.get('/', (req, res) => {
  db.all('SELECT * FROM organizations', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get a single organization by id (JSON)
router.get('/:id', (req, res) => {
  db.get('SELECT * FROM organizations WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    res.json(row);
  });
});

// Render an organization page (SSR with associations)
router.get('/page/:id', (req, res) => {
  const orgId = req.params.id;
  db.get('SELECT * FROM organizations WHERE id = ?', [orgId], (err, organization) => {
    if (err) return res.status(500).send('Database error');
    if (!organization) return res.status(404).send('Organization not found');
    // Find characters in this organization
    const charSql = `SELECT c.id, c.name FROM character_organizations co JOIN characters c ON co.character_id = c.id WHERE co.organization_id = ?`;
    db.all(charSql, [orgId], (err2, characters) => {
      if (err2) return res.status(500).send('Database error');
      res.render('organization', { organization, characters: characters || [] });
    });
  });
});

// Render index of all organizations
router.get('/index', (req, res) => {
  db.all('SELECT * FROM organizations ORDER BY name', [], (err, rows) => {
    if (err) return res.status(500).send('Database error');
    res.render('organizations-index', { organizations: rows });
  });
});

module.exports = router;
