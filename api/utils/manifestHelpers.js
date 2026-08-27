const { domainManifest } = require('../../common/domainManifest');
const { validateIdFormat } = require('./idUtils');

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

function omitKeys(record, keys) {
    const normalized = { ...record };
    for (const key of keys) {
        delete normalized[key];
    }
    return normalized;
}

function dedupeRows(rows) {
    const seen = new Set();
    const deduped = [];

    for (const row of rows) {
        const key = JSON.stringify(row);
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(row);
    }

    return deduped;
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

function getRelationContext(members, anchorMemberIndex) {
    return {
        anchorMember: members[anchorMemberIndex],
        relatedMember: members[anchorMemberIndex === 0 ? 1 : 0],
    };
}

function getRelatedIdForRow(row, members, sourceId, anchorMemberIndex) {
    const anchorMember = members[anchorMemberIndex];
    const relatedMember = members[anchorMemberIndex === 0 ? 1 : 0];

    if (anchorMember.entity === relatedMember.entity) {
        const anchorMatches = row[anchorMember.key] === sourceId;
        const relatedMatches = row[relatedMember.key] === sourceId;

        if (anchorMatches && relatedMatches) {
            return sourceId;
        }

        if (anchorMatches) {
            return row[relatedMember.key];
        }

        if (relatedMatches) {
            return row[anchorMember.key];
        }

        return null;
    }

    return row[relatedMember.key];
}

function buildEntityFormSchemas(manifest = domainManifest) {
    const entities = [];

    for (const [entityName, entityDef] of Object.entries(manifest.entities)) {
        const fields = [];

        for (const [fieldName, fieldDef] of Object.entries(entityDef.fields || {})) {
            const field = {
                name: fieldName,
                type: fieldDef.type,
                required: Boolean(fieldDef.required),
                primary: Boolean(fieldDef.primary),
            };

            if (fieldDef.format) field.format = fieldDef.format;
            if (fieldDef.autoIncrement) field.autoIncrement = true;
            if (fieldDef.widget) field.widget = fieldDef.widget;

            fields.push(field);
        }

        entities.push({
            name: entityName,
            route: entityDef.route,
            idField: entityDef.idField,
            fields,
        });
    }

    return { entities };
}

function conformObjectToEntity(obj, entityDef, options = {}) {
    const { enforcePrimaryIdFormat = false } = options;
    const normalized = {};

    for (const [field, rawValue] of Object.entries(obj || {})) {
        const fieldDef = entityDef.fields[field];
        if (!fieldDef) {
            throw new Error(`Unknown field for route ${entityDef.route}: ${field}`);
        }

        normalized[field] = coerceValueByType(fieldDef.type, rawValue);

        if (
            enforcePrimaryIdFormat &&
            fieldDef.primary &&
            fieldDef.format === 'slug' &&
            normalized[field] !== undefined &&
            normalized[field] !== null &&
            !validateIdFormat(normalized[field])
        ) {
            throw new Error(`Invalid slug id format for field ${field}: ${normalized[field]}`);
        }
    }

    return normalized;
}

module.exports = {
    coerceValueByType,
    omitKeys,
    dedupeRows,
    getEntityByRoute,
    getRelationMembers,
    getRelationByRoutes,
    getRelationContext,
    getRelatedIdForRow,
    conformObjectToEntity,
    buildEntityFormSchemas,
};
