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

// Render index of all characters
router.get('/index', (req, res) => {
    db.all('SELECT * FROM characters ORDER BY name', [], (err, rows) => {
        if (err) return res.status(500).send('Database error');
        res.render('characters-index', { characters: rows });
    });
});

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

// Render a character page (SSR with all associations)
router.get('/page/:id', (req, res) => {
    const charId = req.params.id;
    db.get('SELECT * FROM characters WHERE id = ?', [charId], (err, character) => {
        if (err) return res.status(500).send('Database error');
        if (!character) return res.status(404).send('Character not found');

        // Prepare queries for all associations
        const queries = {
            relationships: new Promise((resolve, reject) => {
                const sql = `SELECT cr.relationship_type, cr.related_id, c.name as related_name
                            FROM character_relationships cr
                            JOIN characters c ON cr.related_id = c.id
                            WHERE cr.character_id = ?`;
                db.all(sql, [charId], (err, rows) => err ? reject(err) : resolve(rows || []));
            }),
            events: new Promise((resolve, reject) => {
                const sql = `SELECT e.id, e.name
                            FROM event_characters ec
                            JOIN events e ON ec.event_id = e.id
                            WHERE ec.character_id = ?`;
                db.all(sql, [charId], (err, rows) => err ? reject(err) : resolve(rows || []));
            }),
            items: new Promise((resolve, reject) => {
                const sql = `SELECT i.id, i.name
                            FROM character_items ci
                            JOIN items i ON ci.item_id = i.id
                            WHERE ci.character_id = ?`;
                db.all(sql, [charId], (err, rows) => err ? reject(err) : resolve(rows || []));
            }),
            organizations: new Promise((resolve, reject) => {
                const sql = `SELECT o.id, o.name
                            FROM character_organizations co
                            JOIN organizations o ON co.organization_id = o.id
                            WHERE co.character_id = ?`;
                db.all(sql, [charId], (err, rows) => err ? reject(err) : resolve(rows || []));
            }),
            patron_deities: new Promise((resolve, reject) => {
                const sql = `SELECT d.id, d.name
                            FROM character_deities cd
                            JOIN deities d ON cd.deity_id = d.id
                            WHERE cd.character_id = ?`;
                db.all(sql, [charId], (err, rows) => err ? reject(err) : resolve(rows || []));
            })
        };

        Promise.all([
            queries.relationships,
            queries.events,
            queries.items,
            queries.organizations,
            queries.patron_deities
        ]).then(([relationships, events, items, organizations, patron_deities]) => {
            // Capitalize the relationship type
            relationships = relationships.map(rel => ({
                ...rel,
                relationship_type: rel.relationship_type.charAt(0).toUpperCase() + rel.relationship_type.slice(1)
            }));
            // Prettify the character type
            switch (character.type) {
                case 'player-character':
                    character.type = 'Player Character';
                    break;
                case 'non-player-character':
                    character.type = 'Non-Player Character';
                    break;
                default:
                    character.type = 'Unknown';
            }

            res.render('character', {
                character,
                relationships: relationships || [],
                events: events || [],
                items: items || [],
                organizations: organizations || [],
                patron_deities: patron_deities || []
            });
        }).catch(() => res.status(500).send('Database error'));
    });
});

module.exports = router;