const express = require('express');
const router = express.Router();
const { validateFields } = require('../../../common/validate');
const characterService = require('../../services/entities/characters');
const { validateIdFormat } = require('../../utils/idUtils');

function validateCharacter(c, isUpdate = false) {
    const requiredFields = ['id', 'type', 'name'];
    if (!isUpdate) {
        for (const field of requiredFields) {
            if (!c[field] || typeof c[field] !== 'string') {
                return `Missing or invalid required field: ${field}`;
            }
        }
    }
    // check to make sure stat fields are numbers or null
    const statFields = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'total_health'];
    for (const stat of statFields) {
        if (c[stat] !== undefined && c[stat] !== null && typeof c[stat] !== 'number') {
            return `Field ${stat} must be a number or null`;
        }
    }
    if (!validateIdFormat(c.id)) {
        return 'Field id must be a valid string (lowercase-and-dashes-only)';
    }
    if (c.deceased !== undefined && c.deceased !== null && typeof c.deceased !== 'number') {
        return 'Field deceased must be a number (0 or 1) or null';
    }
    return null;
}

// Create a new character (with uniqueness check for id)
router.post('/', (req, res) => {
    const c = req.body;
    // schema validation
    const { valid, errors, validated } = validateFields('Character', c);
    if (!valid) {
        return res.status(400).json({ error: errors.join('; ') });
    }
    // business logic validation
    const validationError = validateCharacter(validated);
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }
    characterService.createCharacter(validated)
        .then(result => res.status(201).json(result))
        .catch(err => {
            if (err.message && err.message.includes('UNIQUE constraint failed')) {
                return res.status(409).json({ error: 'A character with this id already exists.' });
            }
            res.status(500).json({ error: err.message });
        });
});

// Read all characters (only info from the characters table.)
router.get('/', (req, res) => {
    characterService.getAllCharacters()
        .then(rows => res.json(rows))
        .catch(err => res.status(500).json({ error: err.message }));
});


// Read a particular character by ID (only info from the characters table.)
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

router.patch('/:id', async (req, res) => {
    const c = req.body;
    // schema validation (partial)
    const { valid, errors, validated } = validateFields('Character', c, { allowPartial: true });
    if (!valid) {
        return res.status(400).json({ error: errors.join('; ') });
    }
    // business logic validation (partial)
    const validationError = validateCharacter(validated, true);
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }
    try {
        const result = await characterService.patchCharacter(req.params.id, validated);
        if (result.message === 'record not found') {
            return res.status(404).json({ error: 'Character not found' });
        }
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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