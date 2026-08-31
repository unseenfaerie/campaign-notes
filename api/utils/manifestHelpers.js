const { domainManifest } = require('../../common/domainManifest');
const { validateIdFormat } = require('./idUtils');
const { isValidLoreDate } = require('../../common/dateSystem');
const { isValidRealDate } = require('../../common/realDate');
const { getEnumValues } = require('../../common/enums');

function coerceValueByType(type, value, enumValues) {
    if (value === undefined || value === null) return value;

    if (type === 'loreDate') {
        if (!isValidLoreDate(value)) {
            throw new Error(`Invalid lore date value: ${value}`);
        }
        return String(value);
    }

    if (type === 'realDate') {
        if (!isValidRealDate(value)) {
            throw new Error(`Invalid real date value: ${value}`);
        }
        return String(value);
    }

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
        const normalized = String(value);
        if (enumValues && !enumValues.includes(normalized)) {
            throw new Error(`Invalid value: expected one of ${enumValues.join(', ')}`);
        }
        return normalized;
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

function mapFieldDefs(fieldsObj) {
    const fields = [];

    for (const [fieldName, fieldDef] of Object.entries(fieldsObj || {})) {
        const field = {
            name: fieldName,
            type: fieldDef.type,
            required: Boolean(fieldDef.required),
            primary: Boolean(fieldDef.primary),
        };

        if (fieldDef.format) field.format = fieldDef.format;
        if (fieldDef.enum) field.enum = [...getEnumValues(fieldDef.enum)];
        if (fieldDef.autoIncrement) field.autoIncrement = true;
        if (fieldDef.hidden) field.hidden = true;
        if (fieldDef.expository) field.expository = true;
        if (fieldDef.access && fieldDef.access.playerPatch) field.playerEditable = true;
        if (fieldDef.ref) {
            const referencedEntity = Object.entries(domainManifest.entities).find(
                ([entityName, entityDef]) => entityName === fieldDef.ref || entityDef.route === fieldDef.ref
            );
            field.ref = referencedEntity?.[1].route || fieldDef.ref;
        }

        fields.push(field);
    }

    return fields;
}

function orderEntityFields(fields, idField) {
    const nameField = fields.find((field) => field.name === 'name');
    const entityIdField = fields.find((field) => field.name === idField);
    const remainingFields = fields.filter((field) => field !== nameField && field !== entityIdField);

    return [nameField, entityIdField, ...remainingFields].filter(Boolean);
}

function buildEntityFormSchemas(manifest = domainManifest) {
    const entities = [];

    for (const [entityName, entityDef] of Object.entries(manifest.entities)) {
        entities.push({
            name: entityName,
            route: entityDef.route,
            idField: entityDef.idField,
            fields: orderEntityFields(mapFieldDefs(entityDef.fields), entityDef.idField),
        });
    }

    return { entities };
}

// for each entity route, describes the relations reachable from it (used both by domainRouter's
// /full aggregation and by the frontend's relation-creation forms)
function getRelationsForEntityRoute(entityRoute, manifest = domainManifest) {
    const relations = [];

    for (const [relationName, relationDef] of Object.entries(manifest.relations || {})) {
        const members = getRelationMembers(relationDef);

        for (let anchorMemberIndex = 0; anchorMemberIndex < members.length; anchorMemberIndex += 1) {
            const anchorMember = members[anchorMemberIndex];
            const anchorEntityDef = manifest.entities[anchorMember.entity];

            if (!anchorEntityDef || anchorEntityDef.route !== entityRoute) {
                continue;
            }

            const relatedMember = members[anchorMemberIndex === 0 ? 1 : 0];
            const relatedEntityDef = manifest.entities[relatedMember.entity];

            relations.push({
                relationName,
                relationDef,
                anchorMemberIndex,
                relatedRoute: anchorMember.route,
                relatedEntityName: relatedMember.entity,
                relatedEntityRoute: relatedEntityDef.route,
                relatedIdField: relatedEntityDef.idField,
            });

            break;
        }
    }

    return relations;
}

function buildRelationFormSchemas(manifest = domainManifest) {
    const relationsByEntityRoute = {};

    for (const entityDef of Object.values(manifest.entities)) {
        relationsByEntityRoute[entityDef.route] = getRelationsForEntityRoute(entityDef.route, manifest).map(
            (relation) => ({
                relatedRoute: relation.relatedRoute,
                relationName: relation.relationName,
                kind: relation.relationDef.kind,
                relatedEntityRoute: relation.relatedEntityRoute,
                historyKey: relation.relationDef.historyKey || null,
                fields: mapFieldDefs(relation.relationDef.payload).map((field) =>
                    relation.relationDef.historyKey && field.name === relation.relationDef.historyKey
                        ? { ...field, primary: true }
                        : field
                ),
            })
        );
    }

    return relationsByEntityRoute;
}

function conformObjectToEntity(obj, entityDef, options = {}) {
    const { enforcePrimaryIdFormat = false } = options;
    const normalized = {};

    for (const [field, rawValue] of Object.entries(obj || {})) {
        const fieldDef = entityDef.fields[field];
        if (!fieldDef) {
            throw new Error(`Unknown field for route ${entityDef.route}: ${field}`);
        }

        normalized[field] = coerceValueByType(fieldDef.type, rawValue, getEnumValues(fieldDef.enum));

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
    getRelationsForEntityRoute,
    buildRelationFormSchemas,
};
