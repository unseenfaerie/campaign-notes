const { domainManifest } = require('../../common/domainManifest');
const { coerceValueByType, getRelationMembers } = require('./manifestHelpers');

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

module.exports = {
    getRelatedMemberInfo,
    normalizeRelationPayload,
    buildRelationInsertData,
};