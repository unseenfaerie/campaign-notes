const { domainManifest } = require('../../common/domainManifest');
const { validateIdFormat } = require('./idUtils');
const { isValidLoreDate } = require('../../common/dateSystem');
const { isValidRealDate } = require('../../common/realDate');
const { getEnumValues } = require('../../common/enums');
const { validateTimeline } = require('../../common/relationTimeline');

function coerceValueByType(type, value, enumValues) {
    if (type === 'timeline') return validateTimeline(value);
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
    if (Array.isArray(relationDef.members)) {
        if (relationDef.members.length !== 2) {
            throw new Error('Relation must define exactly two members');
        }
        return relationDef.members;
    }

    throw new Error('Relation must define exactly two members');
}

function validateDomainManifest(manifest = domainManifest) {
    for (const [relationName, relationDef] of Object.entries(manifest.relations || {})) {
        const members = getRelationMembers(relationDef);
        const [firstMember, secondMember] = members;

        for (const [index, member] of members.entries()) {
            if (!manifest.entities[member.entity]) {
                throw new Error(`Relation ${relationName} member ${index} references unknown entity: ${member.entity}`);
            }
            if (!member.key || !member.route) {
                throw new Error(`Relation ${relationName} member ${index} must define key and route`);
            }
            if (!Object.values(manifest.entities).some((entity) => entity.route === member.route)) {
                throw new Error(`Relation ${relationName} member ${index} has unknown route: ${member.route}`);
            }
        }

        if (!Array.isArray(relationDef.keys) || !relationDef.keys.includes(firstMember.key) || !relationDef.keys.includes(secondMember.key)) {
            throw new Error(`Relation ${relationName} keys must include both member keys`);
        }
    }

    return manifest;
}

function getRelationByRoutes(entityRoute, relatedRoute, manifest = domainManifest) {
    getEntityByRoute(entityRoute, manifest);

    for (const [relationName, relationDef] of Object.entries(manifest.relations)) {
        const members = getRelationMembers(relationDef);
        for (const anchorMemberIndex of [0, 1]) {
            const anchor = members[anchorMemberIndex];
            if (manifest.entities[anchor.entity].route === entityRoute && anchor.route === relatedRoute) {
                return {
                    relationName,
                    relationDef,
                    anchorMemberIndex,
                    relatedMemberIndex: 1 - anchorMemberIndex,
                };
            }
        }
    }

    throw new Error(`Unknown related route for ${entityRoute}: ${relatedRoute}`);
}

function getRelationContext(members, anchorMemberIndex) {
    return {
        anchorMember: members[anchorMemberIndex],
        relatedMember: members[1 - anchorMemberIndex],
    };
}

function getRelatedIdForRow(row, members, sourceId, anchorMemberIndex) {
    return row[members[1 - anchorMemberIndex].key];
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
        if (fieldDef.label) field.label = fieldDef.label;
        if (fieldDef.access?.dmOnly) field.dmOnly = true;
        if (!field.primary && !field.hidden && fieldDef.access?.playerProposable !== false) {
            field.proposable = true;
        }
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

function stripDmOnlyFields(value, manifest = domainManifest) {
    const dmOnlyFieldNames = new Set();
    for (const entity of Object.values(manifest.entities || {})) {
        for (const [fieldName, field] of Object.entries(entity.fields || {})) {
            if (field.access?.dmOnly) dmOnlyFieldNames.add(fieldName);
        }
    }
    for (const relation of Object.values(manifest.relations || {})) {
        for (const [fieldName, field] of Object.entries(relation.payload || {})) {
            if (field.access?.dmOnly) dmOnlyFieldNames.add(fieldName);
        }
    }

    function strip(valueToStrip) {
        if (Array.isArray(valueToStrip)) {
            return valueToStrip.map(strip);
        }
        if (!valueToStrip || typeof valueToStrip !== 'object') {
            return valueToStrip;
        }

        return Object.fromEntries(
            Object.entries(valueToStrip)
                .filter(([fieldName]) => !dmOnlyFieldNames.has(fieldName))
                .map(([fieldName, fieldValue]) => [fieldName, strip(fieldValue)])
        );
    }

    return strip(value);
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
            label: entityDef.ui?.label || entityName,
            singularLabel: entityDef.ui?.singularLabel || entityName,
            navigation: entityDef.ui?.navigation !== false,
            default: entityDef.ui?.default === true,
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
        for (const anchorMemberIndex of [0, 1]) {
            const anchorMember = members[anchorMemberIndex];
            const targetMember = members[1 - anchorMemberIndex];
            const relatedEntityDef = manifest.entities[targetMember.entity];
            if (manifest.entities[anchorMember.entity].route !== entityRoute) continue;
            // Self-relations have one route but query both member columns at read time.
            if (anchorMemberIndex === 1 && members[0].entity === members[1].entity) continue;
            relations.push({
                relationName,
                relationDef,
                anchorMemberIndex,
                relatedRoute: anchorMember.route,
                relatedEntityName: targetMember.entity,
                relatedEntityRoute: relatedEntityDef.route,
                relatedIdField: relatedEntityDef.idField,
            });
        }
    }

    return relations;
}

function buildRelationFormSchemas(manifest = domainManifest) {
    const relationsByEntityRoute = {};

    for (const entityDef of Object.values(manifest.entities)) {
        relationsByEntityRoute[entityDef.route] = getRelationsForEntityRoute(entityDef.route, manifest).map(
            (relation) => {
                const relatedEntityDef = manifest.entities[relation.relatedEntityName];

                return {
                    relatedRoute: relation.relatedRoute,
                    relationName: relation.relationName,
                    anchorMemberIndex: relation.anchorMemberIndex,
                    kind: relation.relationDef.kind,
                    timeline: Boolean(relation.relationDef.timeline),
                    relatedEntityRoute: relation.relatedEntityRoute,
                    relatedEntityLabel: relatedEntityDef.ui?.label || relation.relatedEntityName,
                    historyKey: relation.relationDef.historyKey || null,
                    fields: mapFieldDefs(relation.relationDef.payload).map((field) =>
                        relation.relationDef.historyKey && field.name === relation.relationDef.historyKey
                            ? { ...field, primary: true }
                            : field
                    ),
                };
            }
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
    validateDomainManifest,
    getRelationByRoutes,
    getRelationContext,
    getRelatedIdForRow,
    stripDmOnlyFields,
    conformObjectToEntity,
    buildEntityFormSchemas,
    getRelationsForEntityRoute,
    buildRelationFormSchemas,
};
