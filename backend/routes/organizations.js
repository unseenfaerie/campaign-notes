const express = require('express');
const router = express.Router();
const db = require('../db');

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
