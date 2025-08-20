const express = require('express');
const router = express.Router();
const db = require('../db');

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
