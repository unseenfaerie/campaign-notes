const eventCharacters = require('../services/eventCharacters');
const characterOrganizations = require('../services/characterOrganizations');
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

// Get all characters
router.get('/', (req, res) => {
    db.all('SELECT * FROM characters', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Get a particular character by ID
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
    const charId = req.params.id;
    // First, remove all event-character relationships for this character
    db.run('DELETE FROM event_characters WHERE character_id = ?', [charId], function (err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to remove event-character relationships: ' + err.message });
        }
        // Now delete the character itself
        db.run('DELETE FROM characters WHERE id = ?', [charId], function (err2) {
            if (err2) {
                return res.status(500).json({ error: err2.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Character not found' });
            }
            res.json({ deleted: charId });
        });
    });
});

// CHARACTER - CHARACTER ASSOCIATIONS
// Add a relationship to another character
router.post('/:id/relationships', (req, res) => {
    const character_id = req.params.id;
    const { target_character_id, short_description, long_explanation } = req.body;
    if (!target_character_id) return res.status(400).json({ error: 'target_character_id is required' });
    characterRelationships.addCharacterRelationship(character_id, target_character_id, short_description || '', long_explanation || '')
        .then(result => res.status(201).json(result))
        .catch(err => res.status(500).json({ error: err.message }));
});

// Remove a relationship to another character
router.delete('/:id/relationships/:targetId', (req, res) => {
    const character_id = req.params.id;
    const target_character_id = req.params.targetId;
    characterRelationships.removeCharacterRelationship(character_id, target_character_id)
        .then(result => res.json(result))
        .catch(err => res.status(500).json({ error: err.message }));
});

// Update a relationship to another character
router.patch('/:id/relationships/:targetId', (req, res) => {
    const character_id = req.params.id;
    const target_character_id = req.params.targetId;
    const updates = req.body;
    characterRelationships.updateCharacterRelationship(character_id, target_character_id, updates)
        .then(result => res.json(result))
        .catch(err => res.status(500).json({ error: err.message }));
});

// Get a relationship with another character
router.get('/:id/relationships/:targetId', (req, res) => {
    const character_id = req.params.id;
    const target_character_id = req.params.targetId;
    characterRelationships.getCharacterRelationship(character_id, target_character_id)
        .then(relationship => res.json(relationship))
        .catch(err => res.status(500).json({ error: err.message }));
});

// Get all relationships that involve the character
router.get('/:id/relationships', (req, res) => {
    const character_id = req.params.id;
    characterRelationships.getRelationshipsForCharacter(character_id)
        .then(relationships => res.json(relationships))
        .catch(err => res.status(500).json({ error: err.message }));
});

// DEITY - CHARACTER ASSOCIATIONS

// EVENT - CHARACTER ASSOCIATIONS
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
    const updates = req.body;
    eventCharacters.updateEventCharacter(event_id, character_id, updates)
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

// Get all events for a character
router.get('/:id/events', (req, res) => {
    const character_id = req.params.id;
    eventCharacters.getEventsForCharacter(character_id)
        .then(events => res.json(events))
        .catch(err => res.status(500).json({ error: err.message }));
});

// Get all characters for an event
router.get('/:id/events/:eventId/characters', (req, res) => {
    const event_id = req.params.eventId;
    eventCharacters.getCharactersForEvent(event_id)
        .then(characters => res.json(characters))
        .catch(err => res.status(500).json({ error: err.message }));
});

// Get a specific event-character relationship
router.get('/:id/events/:eventId', (req, res) => {
    const character_id = req.params.id;
    const event_id = req.params.eventId;
    eventCharacters.getEventCharacter(event_id, character_id)
        .then(relationship => res.json(relationship))
        .catch(err => res.status(500).json({ error: err.message }));
});

// ITEM - CHARACTER ASSOCIATIONS

// ORGANIZATION - CHARACTER ASSOCIATIONS
// Get all organizations for a character
router.get('/:id/organizations', (req, res) => {
    const character_id = req.params.id;
    characterOrganizations.getOrganizationsForCharacter(character_id)
        .then(organizations => res.json(organizations))
        .catch(err => res.status(500).json({ error: err.message }));
});

// Get all characters for an organization
router.get('/:id/organizations/:orgId/characters', (req, res) => {
    const org_id = req.params.orgId;
    characterOrganizations.getCharactersForOrganization(org_id)
        .then(characters => res.json(characters))
        .catch(err => res.status(500).json({ error: err.message }));
});

// Get a specific character-organization relationship
router.get('/:id/organizations/:orgId', (req, res) => {
    const character_id = req.params.id;
    const org_id = req.params.orgId;
    characterOrganizations.getCharacterOrganization(character_id, org_id)
        .then(relationship => res.json(relationship))
        .catch(err => res.status(500).json({ error: err.message }));
});

// Add a character to an organization
router.post('/:id/organizations', (req, res) => {
    const character_id = req.params.id;
    const { org_id, role } = req.body;
    if (!org_id) return res.status(400).json({ error: 'org_id is required' });
    characterOrganizations.addCharacterOrganization(character_id, org_id, role || '')
        .then(result => res.status(201).json(result))
        .catch(err => res.status(500).json({ error: err.message }));
});

// Update a character's relationship with an organization
router.patch('/:id/organizations/:orgId', (req, res) => {
    const character_id = req.params.id;
    const org_id = req.params.orgId;
    const { role, short_description, long_explanation } = req.body;
    characterOrganizations.updateCharacterOrganization(character_id, org_id, { role, short_description, long_explanation })
        .then(result => res.json(result))
        .catch(err => res.status(500).json({ error: err.message }));
});

// Delete a character from an organization
router.delete('/:id/organizations/:orgId', (req, res) => {
    const character_id = req.params.id;
    const org_id = req.params.orgId;
    characterOrganizations.removeCharacterOrganization(character_id, org_id)
        .then(result => res.json(result))
        .catch(err => res.status(500).json({ error: err.message }));
});

// PLACE - CHARACTER ASSOCIATIONS

module.exports = router;