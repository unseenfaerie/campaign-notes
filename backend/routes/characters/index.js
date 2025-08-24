const express = require('express');
const router = express.Router();
const characterService = require('../../services/character');

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
    characterService.createCharacter(c)
        .then(result => res.status(201).json(result))
        .catch(err => {
            if (err.message && err.message.includes('UNIQUE constraint failed')) {
                return res.status(409).json({ error: 'A character with this id already exists.' });
            }
            res.status(500).json({ error: err.message });
        });
});

// Read all characters
router.get('/', (req, res) => {
    characterService.getAllCharacters()
        .then(rows => res.json(rows))
        .catch(err => res.status(500).json({ error: err.message }));
});


// Read a particular character by ID (basic)
router.get('/:id', (req, res) => {
    characterService.getCharacterById(req.params.id)
        .then(row => {
            if (!row) {
                return res.status(404).json({ error: 'Character not found' });
            }
            res.json(row);
        })
        .catch(err => res.status(500).json({ error: err.message }));
});

// Read a full-detail character with all associations
router.get('/:id/full', async (req, res) => {
    try {
        const fullCharacter = await characterService.getFullCharacterById(req.params.id);
        if (!fullCharacter) {
            return res.status(404).json({ error: 'Character not found' });
        }
        res.json(fullCharacter);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update an existing character
router.patch('/:id', (req, res) => {
    const c = req.body;
    characterService.patchCharacter(req.params.id, c)
        .then(result => res.json(result))
        .catch(err => res.status(500).json({ error: err.message }));
});

// Delete a character
router.delete('/:id', (req, res) => {
    characterService.deleteCharacter(req.params.id)
        .then(result => res.json(result))
        .catch(err => res.status(500).json({ error: err.message }));
});

router.use('/:id/organizations', require('./organizations'));
router.use('/:id/events', require('./events'));
router.use('/:id/items', require('./items'));
router.use('/:id/deities', require('./deities'));
router.use('/:id/relationships', require('./relationships'));

module.exports = router;