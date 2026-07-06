const { domainManifest } = require('../../common/domainManifest');
const { coerceValueByType, getRelationMembers } = require('./manifestHelpers');
const { isValidDateFormat, loreDateToSortable } = require('./dateUtils');

function getRelatedMemberInfo(relationDef, anchorMemberIndex) {
    const members = getRelationMembers(relationDef);
    const relatedMember = members[anchorMemberIndex === 0 ? 1 : 0];
    const relatedEntityDef = domainManifest.entities[relatedMember.entity];

    if (!relatedEntityDef) {
        throw new Error(`Unknown related entity: ${relatedMember.entity}`);
    }

    return {
        members,
        relatedMember,
        relatedEntityDef,
    };
}

function normalizeRelationPayload(rawPayload, relationDef) {
    if (rawPayload === undefined || rawPayload === null) {
        return {};
    }

    if (typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
        throw new Error('Data must be an object');
    }

    const normalized = {};
    const payloadDef = relationDef.payload || {};

    for (const [field, rawValue] of Object.entries(rawPayload)) {
        const meta = payloadDef[field];
        if (!meta) {
            throw new Error(`Unknown field for relation: ${field}`);
        }

        normalized[field] = coerceValueByType(meta.type, rawValue);
    }

    return normalized;
}

function normalizeRelationUpdatePayload(rawPayload, relationDef) {
    if (rawPayload === undefined || rawPayload === null) {
        return {};
    }

    if (typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
        throw new Error('Data must be an object');
    }

    const normalized = {};
    const payloadDef = relationDef.payload || {};
    const disallowedFields = new Set(
        relationDef.kind === 'history' && relationDef.historyKey ? [relationDef.historyKey] : []
    );

    for (const [field, rawValue] of Object.entries(rawPayload)) {
        if (disallowedFields.has(field)) {
            throw new Error(`Cannot update primary key field: ${field}`);
        }

        const meta = payloadDef[field];
        if (!meta) {
            throw new Error(`Unknown field for relation: ${field}`);
        }

        normalized[field] = coerceValueByType(meta.type, rawValue);
    }

    return normalized;
}

function getValidatedHistorySelector(query, relationDef, { required = false } = {}) {
    if (!relationDef || relationDef.kind !== 'history' || !relationDef.historyKey) {
        return undefined;
    }

    const historyKey = relationDef.historyKey;
    const queryKeys = Object.keys(query || {});

    for (const key of queryKeys) {
        if (key !== historyKey) {
            throw new Error(`Unknown query field for relation: ${key}`);
        }
    }

    const historyRaw = query ? query[historyKey] : undefined;
    if (historyRaw === undefined) {
        if (required) {
            throw new Error(`Missing required query field: ${historyKey}`);
        }

        return undefined;
    }

    const historyMeta = relationDef.payload && relationDef.payload[historyKey];
    const historyType = historyMeta && historyMeta.type ? historyMeta.type : 'string';
    return coerceValueByType(historyType, historyRaw);
}

function buildRelationInsertData({
    relationDef,
    members,
    anchorMemberIndex,
    sourceId,
    relatedId,
    payload,
}) {
    const anchorMember = members[anchorMemberIndex];
    const relatedMember = members[anchorMemberIndex === 0 ? 1 : 0];

    return {
        [anchorMember.key]: sourceId,
        [relatedMember.key]: relatedId,
        ...payload,
    };
}

function buildRelationWhere({ members, anchorMemberIndex, sourceId, relatedId, relationDef, historyValue }) {
    const anchorMember = members[anchorMemberIndex];
    const relatedMember = members[anchorMemberIndex === 0 ? 1 : 0];

    const where = {
        [anchorMember.key]: sourceId,
        [relatedMember.key]: relatedId,
    };

    if (relationDef.kind === 'history' && relationDef.historyKey && historyValue !== undefined) {
        where[relationDef.historyKey] = historyValue;
    }

    return where;
}

function validateHistoryChronology({ relationDef, startValue, endValue }) {
    if (!relationDef || relationDef.kind !== 'history' || !relationDef.historyKey || !relationDef.historyEndKey) {
        return;
    }

    if (endValue === undefined || endValue === null || endValue === '') {
        return;
    }

    if (startValue === undefined || startValue === null || startValue === '') {
        throw new Error('Missing history start date value for chronology validation');
    }

    if (!isValidDateFormat(startValue)) {
        throw new Error(`Invalid history date format for field: ${relationDef.historyKey}`);
    }

    if (!isValidDateFormat(endValue)) {
        throw new Error(`Invalid history date format for field: ${relationDef.historyEndKey}`);
    }

    const startSortable = loreDateToSortable(startValue);
    const endSortable = loreDateToSortable(endValue);

    if (!startSortable || !endSortable || endSortable <= startSortable) {
        throw new Error('History end date must be after history start date');
    }
}

module.exports = {
    getRelatedMemberInfo,
    normalizeRelationPayload,
    normalizeRelationUpdatePayload,
    getValidatedHistorySelector,
    buildRelationInsertData,
    buildRelationWhere,
    validateHistoryChronology,
};