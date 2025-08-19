// server.js - Express API server for campaign-notes
const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
app.use(express.json());

// Serve static files from the public directory (for legacy/static site)
app.use(express.static(path.join(__dirname, '../public')));

// Create a new character
app.post('/api/characters', (req, res) => {
    const c = req.body;
    const sql = `INSERT INTO characters (id, type, name, class, level, alignment, strength, dexterity, constitution, intelligence, wisdom, charisma, total_health, deceased, description)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [
        c.id, c.type, c.name, c.class, c.level, c.alignment, c.strength, c.dexterity, c.constitution, c.intelligence, c.wisdom, c.charisma, c.total_health, c.deceased, c.description
    ];
    db.run(sql, params, function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ id: c.id });
    });
});

// Update an existing character
app.put('/api/characters/:id', (req, res) => {
    const c = req.body;
    const sql = `UPDATE characters SET type=?, name=?, alignment=?, strength=?, dexterity=?, constitution=?, intelligence=?, wisdom=?, charisma=?, total_health=?, deceased=?, description=? WHERE id=?`;
    const params = [
        c.type, c.name, c.alignment, c.strength, c.dexterity, c.constitution, c.intelligence, c.wisdom, c.charisma, c.total_health, c.deceased, c.description, req.params.id
    ];
    db.run(sql, params, function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Character not found' });
        }
        res.json({ updated: req.params.id });
    });
});

// Delete a character
app.delete('/api/characters/:id', (req, res) => {
    db.run('DELETE FROM characters WHERE id = ?', [req.params.id], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Character not found' });
        }
        res.json({ deleted: req.params.id });
    });
});

// Sample API route: GET /api/characters
app.get('/api/characters', (req, res) => {
    db.all('SELECT * FROM characters', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Sample API route: GET /api/characters/:id
app.get('/api/characters/:id', (req, res) => {
    db.get('SELECT * FROM characters WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Character not found' });
        }
        res.json(row);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API server running at http://localhost:${PORT}`);
});
