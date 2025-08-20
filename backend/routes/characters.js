const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper: Validate character data
function validateCharacter(c, isUpdate = false) {
    const requiredFields = ['id', 'type', 'name'];
    if (!isUpdate) {
        for (const field of requiredFields) {
            if (!c[field] || typeof c[field] !== 'string') {
                return `Missing or invalid required field: ${field}`;
            }
        }
    }
    // Optionally check stat fields are numbers or null
    const statFields = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'total_health'];
    for (const stat of statFields) {
        if (c[stat] !== undefined && c[stat] !== null && typeof c[stat] !== 'number') {
            return `Field ${stat} must be a number or null`;
        }
    }
    if (c.deceased !== undefined && c.deceased !== null && typeof c.deceased !== 'number') {
        return 'Field deceased must be a number (0 or 1) or null';
    }
    return null;
}

// Create a new character (with uniqueness check for id)
router.post('/', (req, res) => {
    const c = req.body;
    const validationError = validateCharacter(c);
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }
    // Check if id already exists
    db.get('SELECT id FROM characters WHERE id = ?', [c.id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (row) {
            return res.status(409).json({ error: 'A character with this id already exists.' });
        }
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
});

// Update an existing character
router.put('/:id', (req, res) => {
    const c = req.body;
    const validationError = validateCharacter(c, true);
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }
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
router.delete('/:id', (req, res) => {
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
router.get('/', (req, res) => {
    db.all('SELECT * FROM characters', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Sample API route: GET /api/characters/:id
router.get('/:id', (req, res) => {
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

// Render a character page (SSR)
router.get('/page/:id', (req, res) => {
    db.get('SELECT * FROM characters WHERE id = ?', [req.params.id], (err, character) => {
        if (err) {
            return res.status(500).send('Database error');
        }
        if (!character) {
            return res.status(404).send('Character not found');
        }
        res.render('character', { character });
    });
});

module.exports = router;