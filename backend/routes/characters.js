// --- Event-Character Association Endpoints ---
const eventCharacters = require('../../services/eventCharacters');
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

// Helper: generic association query (now supports joinFields for join table columns)
function getAssociations({
    db, // Database instance
    joinTable, // The table to join on 'event_characters'
    joinKey, // The key in the join table 'event_id'
    targetTable, // The target table to select from 'events'
    targetKey = 'id', // The key in the target table 
    targetFields = ['id', 'name'], // The fields to select from the target table
    joinFields = [], // The fields to select from the join table (e.g. ['notes'])
    whereKey, // The key to filter the join table 'character_id'
    whereValue // The value to filter the join table (actual charId)
}) {
    return new Promise((resolve, reject) => {
        const targetSelect = targetFields.map(f => `${targetTable}.${f}`).join(', ');
        const joinSelect = joinFields.map(f => `${joinTable}.${f} as ${f}`).join(', ');
        const fields = [targetSelect, joinSelect].filter(Boolean).join(', ');
        const sql = `SELECT ${fields} FROM ${joinTable}
            JOIN ${targetTable} ON ${joinTable}.${joinKey} = ${targetTable}.${targetKey}
            WHERE ${joinTable}.${whereKey} = ?`;
        db.all(sql, [whereValue], (err, rows) => err ? reject(err) : resolve(rows || []));
    });
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
router.patch('/:id', (req, res) => {
    const c = req.body;
    // Only allow fields that exist in the schema
    const allowed = ['type', 'name', 'class', 'level', 'alignment', 'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'total_health', 'deceased', 'short_description', 'long_explanation'];
    const fields = Object.keys(c).filter(key => allowed.includes(key));
    if (fields.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update.' });
    }
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const params = fields.map(f => c[f]);
    params.push(req.params.id);
    const sql = `UPDATE characters SET ${setClause} WHERE id = ?`;
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
        // Also fetch relationships with descriptions
        db.all(`SELECT cr.relationship_type, cr.related_id, c.name as related_name, cr.short_description, cr.long_explanation
                FROM character_relationships cr
                JOIN characters c ON cr.related_id = c.id
                WHERE cr.character_id = ?`, [req.params.id], (err2, rels) => {
            if (err2) {
                return res.status(500).json({ error: err2.message });
            }
            row.relationships = rels || [];
            res.json(row);
        });
    });
});

// Add a character to an event
router.post('/:id/events', (req, res) => {
    const character_id = req.params.id;
    const { event_id, short_description, long_explanation } = req.body;
    if (!event_id) return res.status(400).json({ error: 'event_id is required' });
    eventCharacters.addEventCharacter(event_id, character_id, short_description || '', long_explanation || '')
        .then(result => res.status(201).json(result))
        .catch(err => res.status(500).json({ error: err.message }));
});

// Update event-character association
router.patch('/:id/events/:eventId', (req, res) => {
    const character_id = req.params.id;
    const event_id = req.params.eventId;
    eventCharacters.updateEventCharacter(event_id, character_id, req.body)
        .then(result => res.json(result))
        .catch(err => res.status(500).json({ error: err.message }));
});

// Remove a character from an event
router.delete('/:id/events/:eventId', (req, res) => {
    const character_id = req.params.id;
    const event_id = req.params.eventId;
    eventCharacters.removeEventCharacter(event_id, character_id)
        .then(result => res.json(result))
        .catch(err => res.status(500).json({ error: err.message }));
});

// Render a character page (SSR with all associations)
router.get('/page/:id', (req, res) => {
    const charId = req.params.id;
    db.get('SELECT * FROM characters WHERE id = ?', [charId], (err, character) => {
        if (err) return res.status(500).send('Database error');
        if (!character) return res.status(404).send('Character not found');

        // Prepare queries for all associations
        console.log('Fetching associations for character:', charId);
        const queries = {
            relationships: getAssociations({
                db,
                joinTable: 'character_relationships',
                joinKey: 'related_id',
                targetTable: 'characters',
                targetFields: ['id', 'name as related_name'],
                joinFields: ['relationship_type', 'short_description', 'long_explanation'],
                whereKey: 'character_id',
                whereValue: charId
            }),
            events: getAssociations({
                db,
                joinTable: 'event_characters',
                joinKey: 'event_id',
                targetTable: 'events',
                targetFields: ['id', 'name'],
                joinFields: ['notes'],
                whereKey: 'character_id',
                whereValue: charId
            }),
            items: getAssociations({
                db,
                joinTable: 'character_items',
                joinKey: 'item_id',
                targetTable: 'items',
                whereKey: 'character_id',
                whereValue: charId
            }),
            organizations: getAssociations({
                db,
                joinTable: 'character_organizations',
                joinKey: 'organization_id',
                targetTable: 'organizations',
                whereKey: 'character_id',
                whereValue: charId
            }),
            patron_deities: getAssociations({
                db,
                joinTable: 'character_deities',
                joinKey: 'deity_id',
                targetTable: 'deities',
                targetFields: ['id', 'name', 'notes'],
                joinFields: ['short_description', 'long_explanation'],
                whereKey: 'character_id',
                whereValue: charId
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

            console.log(relationships);

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