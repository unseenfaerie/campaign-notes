const { getEnumValues } = require('../../common/enums');
const { coerceValueByType } = require('./manifestHelpers');

// Serializes an object with keys sorted alphabetically so the same logical target key
// (e.g. a relation row looked at from either member's perspective) always produces
// identical JSON, regardless of the order fields were inserted in.
function stableStringify(obj) {
    const sortedEntries = Object.entries(obj || {}).sort(([left], [right]) => left.localeCompare(right));
    return JSON.stringify(Object.fromEntries(sortedEntries));
}

function buildEntityTargetKey(idField, idValue) {
    return { [idField]: idValue };
}

// Validates and coerces a player-proposed set of field changes against a field-def map
// (entityDef.fields or relationDef.payload), rejecting primary keys and any field the
// manifest has opted out of player proposals via `access.playerProposable: false`.
function filterProposableChanges(rawChanges, fieldDefsMap) {
    if (rawChanges === undefined || rawChanges === null) {
        return {};
    }

    if (typeof rawChanges !== 'object' || Array.isArray(rawChanges)) {
        throw new Error('Data must be an object');
    }

    const normalized = {};

    for (const [field, rawValue] of Object.entries(rawChanges)) {
        const meta = fieldDefsMap[field];
        if (!meta) {
            throw new Error(`Unknown field for proposal: ${field}`);
        }

        if (meta.primary) {
            throw new Error(`Cannot propose changes to primary key field: ${field}`);
        }

        if (meta.access?.playerProposable === false) {
            throw new Error(`Field is not player-proposable: ${field}`);
        }

        normalized[field] = meta.enum
            ? coerceValueByType(meta.type, rawValue, getEnumValues(meta.enum))
            : coerceValueByType(meta.type, rawValue);
    }

    return normalized;
}

// Only the fields that actually differ from the current record are worth proposing/storing.
function diffAgainstCurrent(candidateChanges, currentRecord) {
    const diff = {};
    for (const [field, value] of Object.entries(candidateChanges)) {
        if (currentRecord[field] !== value) {
            diff[field] = value;
        }
    }
    return diff;
}

function mergeProposedView(baseRecord, proposedChanges) {
    return { ...baseRecord, ...proposedChanges };
}

module.exports = {
    stableStringify,
    buildEntityTargetKey,
    filterProposableChanges,
    diffAgainstCurrent,
    mergeProposedView,
};
