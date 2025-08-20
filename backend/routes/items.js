const express = require('express');
const router = express.Router();
const db = require('../db');

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

module.exports = router;
