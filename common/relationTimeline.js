const { isValidLoreDate } = require('./dateSystem');

function validateTimeline(value) {
    if (!Array.isArray(value)) throw new Error('Invalid timeline: expected an array');
    const ids = new Set();
    return value.map((entry) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry) ||
            Object.keys(entry).some((key) => !['id', 'description', 'date'].includes(key)) ||
            typeof entry.id !== 'string' || !entry.id.trim() ||
            typeof entry.description !== 'string' || !entry.description.trim() ||
            (entry.date !== null && entry.date !== undefined && !isValidLoreDate(entry.date))) {
            throw new Error('Invalid timeline entry');
        }
        if (ids.has(entry.id)) throw new Error('Invalid timeline: duplicate entry ID');
        ids.add(entry.id);
        return { id: entry.id, description: entry.description, date: entry.date || null };
    });
}

module.exports = { validateTimeline };
