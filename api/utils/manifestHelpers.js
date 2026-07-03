const { domainManifest } = require('../../common/domainManifest');

function coerceValueByType(type, value) {
    if (value === undefined || value === null) return value;

    if (type === 'number') {
        const n = Number(value);
        if (Number.isNaN(n)) {
            throw new Error(`Invalid number value: ${value}`);
        }
        return n;
    }

    if (type === 'boolean') {
        if (value === true || value === false) return value;
        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            if (normalized === 'true') return true;
            if (normalized === 'false') return false;
        }
        throw new Error(`Invalid boolean value: ${value}`);
    }

    if (type === 'string') {
        return String(value);
    }

    return value;
}

function getEntityByRoute(entityRoute, manifest = domainManifest) {
    for (const [entityName, entityDef] of Object.entries(manifest.entities)) {
        if (entityDef.route === entityRoute) {
            return { entityName, entityDef };
        }
    }

    throw new Error(`Unknown entity route: ${entityRoute}`);
}

function getRelationMembers(relationDef) {
    if (Array.isArray(relationDef.members) && relationDef.members.length === 2) {
        return relationDef.members;
    }

    if (relationDef.source && relationDef.target && relationDef.sourceKey && relationDef.targetKey) {
        return [
            { entity: relationDef.source, key: relationDef.sourceKey, route: relationDef.routeFromSource },
            { entity: relationDef.target, key: relationDef.targetKey, route: relationDef.routeFromTarget },
        ];
    }

    throw new Error('Relation must define exactly two members');
}

function getRelationByRoutes(entityRoute, relatedRoute, manifest = domainManifest) {
    getEntityByRoute(entityRoute, manifest);

    for (const [relationName, relationDef] of Object.entries(manifest.relations)) {
        const members = getRelationMembers(relationDef);

        for (let anchorMemberIndex = 0; anchorMemberIndex < members.length; anchorMemberIndex += 1) {
            const anchorMember = members[anchorMemberIndex];
            const anchorEntityDef = manifest.entities[anchorMember.entity];
            if (!anchorEntityDef || anchorEntityDef.route !== entityRoute) {
                continue;
            }

            if (anchorMember.route === relatedRoute) {
                return {
                    relationName,
                    relationDef,
                    anchorMemberIndex,
                    relatedMemberIndex: anchorMemberIndex === 0 ? 1 : 0,
                };
            }
        }
    }

    throw new Error(`Unknown related route for ${entityRoute}: ${relatedRoute}`);
}

function conformObjectToEntity(obj, entityDef) {
    const normalized = {};

    for (const [field, rawValue] of Object.entries(obj || {})) {
        const fieldDef = entityDef.fields[field];
        if (!fieldDef) {
            throw new Error(`Unknown field for route ${entityDef.route}: ${field}`);
        }

        normalized[field] = coerceValueByType(fieldDef.type, rawValue);
    }

    return normalized;
}

module.exports = {
    coerceValueByType,
    getEntityByRoute,
    getRelationMembers,
    getRelationByRoutes,
    conformObjectToEntity,
};
