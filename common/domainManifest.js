// relationship types:
// simple - no metadata, just association between two entities
// relationship - association between two entities with metadata
// history - association between two entities with metadata and a date key, 
// meaning that there may be many records for a given pair
const domainManifest = {
    entities: {
        Character: {
            table: 'characters',
            route: 'characters',
            idField: 'id',
            fields: {
                id: { type: 'string', primary: true, required: true, format: 'slug' },
                type: { type: 'string', required: true },
                name: { type: 'string', required: true },
                age: { type: 'number' },
                ancestry: { type: 'string' },
                class: { type: 'string' },
                level: { type: 'string' },
                alignment: { type: 'string' },
                strength: { type: 'number' },
                dexterity: { type: 'number' },
                constitution: { type: 'number' },
                intelligence: { type: 'number' },
                wisdom: { type: 'number' },
                charisma: { type: 'number' },
                total_health: { type: 'number' },
                deceased: { type: 'number', required: true },
                short_description: { type: 'string', required: true },
                long_explanation: { type: 'string' },
            },
        },
        Deity: {
            table: 'deities',
            route: 'deities',
            idField: 'id',
            fields: {
                id: { type: 'string', primary: true, required: true, format: 'slug' },
                name: { type: 'string', required: true },
                pantheon: { type: 'string' },
                alignment: { type: 'string' },
                short_description: { type: 'string', required: true },
                long_explanation: { type: 'string' },
            },
        },
        Event: {
            table: 'events',
            route: 'events',
            idField: 'id',
            fields: {
                id: { type: 'string', primary: true, required: true, format: 'slug' },
                name: { type: 'string', required: true },
                real_world_date: { type: 'string' },
                in_game_time: { type: 'string' },
                previous_event_id: { type: 'string' },
                next_event_id: { type: 'string' },
                short_description: { type: 'string', required: true },
                long_explanation: { type: 'string' },
            },
        },
        Item: {
            table: 'items',
            route: 'items',
            idField: 'id',
            fields: {
                id: { type: 'string', primary: true, required: true, format: 'slug' },
                name: { type: 'string', required: true },
                short_description: { type: 'string', required: true },
                long_explanation: { type: 'string' },
            },
        },
        Organization: {
            table: 'organizations',
            route: 'organizations',
            idField: 'id',
            fields: {
                id: { type: 'string', primary: true, required: true, format: 'slug' },
                name: { type: 'string', required: true },
                type: { type: 'string' },
                short_description: { type: 'string', required: true },
                long_explanation: { type: 'string' },
            },
        },
        Place: {
            table: 'places',
            route: 'places',
            idField: 'id',
            fields: {
                id: { type: 'string', primary: true, required: true, format: 'slug' },
                name: { type: 'string', required: true },
                type: { type: 'string', required: true },
                parent_id: { type: 'string' },
                short_description: { type: 'string', required: true },
                long_explanation: { type: 'string' },
            },
        },
        Spell: {
            table: 'spells',
            route: 'spells',
            idField: 'id',
            fields: {
                id: { type: 'string', primary: true, required: true, format: 'slug' },
                type: { type: 'string' },
                name: { type: 'string', required: true },
                level: { type: 'number' },
                school: { type: 'string' },
                casting_time: { type: 'string' },
                range: { type: 'string' },
                components: { type: 'string' },
                materials: { type: 'string' },
                duration: { type: 'string' },
                description: { type: 'string', required: true },
            },
        },
        Sphere: {
            table: 'spheres',
            route: 'spheres',
            idField: 'id',
            fields: {
                id: { type: 'string', primary: true, required: true, format: 'slug' },
                name: { type: 'string', required: true },
                short_description: { type: 'string', required: true },
            },
        },
        Alias: {
            table: 'aliases',
            route: 'aliases',
            idField: 'id',
            fields: {
                id: { type: 'number', primary: true, required: true, autoIncrement: true },
                entity_type: { type: 'string', required: true },
                entity_id: { type: 'string', required: true },
                alias: { type: 'string', required: true },
            },
            constraints: [
                { type: 'unique', fields: ['entity_type', 'entity_id', 'alias'] },
            ],
        },
    },

    relations: {
        CharacterDeity: {
            kind: 'history',
            table: 'character_deities',
            routeFromSource: 'deities',
            source: 'Character',
            target: 'Deity',
            sourceKey: 'character_id',
            targetKey: 'deity_id',
            historyKey: 'adopted_date',
            keys: ['character_id', 'deity_id', 'adopted_date'],
            payload: {
                adopted_date: { type: 'string', required: true },
                dissolution_date: { type: 'string' },
                relationship_type: { type: 'string' },
                short_description: { type: 'string', required: true },
                long_explanation: { type: 'string' },
            },
        },
        CharacterItem: {
            kind: 'history',
            table: 'character_items',
            routeFromSource: 'items',
            source: 'Character',
            target: 'Item',
            sourceKey: 'character_id',
            targetKey: 'item_id',
            historyKey: 'acquired_date',
            keys: ['character_id', 'item_id', 'acquired_date'],
            payload: {
                acquired_date: { type: 'string', required: true },
                relinquished_date: { type: 'string' },
                short_description: { type: 'string', required: true },
            },
        },
        CharacterOrganization: {
            kind: 'history',
            table: 'character_organizations',
            routeFromSource: 'organizations',
            source: 'Character',
            target: 'Organization',
            sourceKey: 'character_id',
            targetKey: 'organization_id',
            historyKey: 'joined_date',
            keys: ['character_id', 'organization_id', 'joined_date'],
            payload: {
                joined_date: { type: 'string', required: true },
                left_date: { type: 'string' },
                short_description: { type: 'string', required: true },
                long_explanation: { type: 'string' },
            },
        },
        CharacterPlace: {
            kind: 'history',
            table: 'character_places',
            routeFromSource: 'places',
            source: 'Character',
            target: 'Place',
            sourceKey: 'character_id',
            targetKey: 'place_id',
            historyKey: 'arrived_date',
            keys: ['character_id', 'place_id', 'arrived_date'],
            payload: {
                arrived_date: { type: 'string', required: true },
                left_date: { type: 'string' },
                short_description: { type: 'string', required: true },
                long_explanation: { type: 'string' },
            },
        },
        CharacterRelationship: {
            kind: 'history',
            table: 'character_relationships',
            routeFromSource: 'relationships',
            source: 'Character',
            target: 'Character',
            sourceKey: 'character_id',
            targetKey: 'related_id',
            historyKey: 'established_date',
            keys: ['character_id', 'related_id', 'established_date'],
            payload: {
                established_date: { type: 'string', required: true },
                dissolution_date: { type: 'string' },
                relationship_type: { type: 'string', required: true },
                short_description: { type: 'string', required: true },
                long_explanation: { type: 'string' },
            },
        },
        DeitySphere: {
            kind: 'simple',
            table: 'deity_spheres',
            routeFromSource: 'spheres',
            source: 'Deity',
            target: 'Sphere',
            sourceKey: 'deity_id',
            targetKey: 'sphere_id',
            keys: ['deity_id', 'sphere_id'],
            payload: {},
        },
        EventCharacter: {
            kind: 'relationship',
            table: 'event_characters',
            routeFromSource: 'characters',
            source: 'Event',
            target: 'Character',
            sourceKey: 'event_id',
            targetKey: 'character_id',
            keys: ['event_id', 'character_id'],
            payload: {
                short_description: { type: 'string', required: true },
                long_explanation: { type: 'string' },
            },
        },
        EventDeity: {
            kind: 'relationship',
            table: 'event_deities',
            routeFromSource: 'deities',
            source: 'Event',
            target: 'Deity',
            sourceKey: 'event_id',
            targetKey: 'deity_id',
            keys: ['event_id', 'deity_id'],
            payload: {
                short_description: { type: 'string', required: true },
                long_explanation: { type: 'string' },
            },
        },
        EventItem: {
            kind: 'relationship',
            table: 'event_items',
            routeFromSource: 'items',
            source: 'Event',
            target: 'Item',
            sourceKey: 'event_id',
            targetKey: 'item_id',
            keys: ['event_id', 'item_id'],
            payload: {
                short_description: { type: 'string', required: true },
                long_explanation: { type: 'string' },
            },
        },
        EventOrganization: {
            kind: 'relationship',
            table: 'event_organizations',
            routeFromSource: 'organizations',
            source: 'Event',
            target: 'Organization',
            sourceKey: 'event_id',
            targetKey: 'organization_id',
            keys: ['event_id', 'organization_id'],
            payload: {
                short_description: { type: 'string', required: true },
                long_explanation: { type: 'string' },
            },
        },
        EventPlace: {
            kind: 'relationship',
            table: 'event_places',
            routeFromSource: 'places',
            source: 'Event',
            target: 'Place',
            sourceKey: 'event_id',
            targetKey: 'place_id',
            keys: ['event_id', 'place_id'],
            payload: {
                short_description: { type: 'string', required: true },
                long_explanation: { type: 'string' },
            },
        },
        OrganizationPlace: {
            kind: 'relationship',
            table: 'organization_places',
            routeFromSource: 'places',
            source: 'Organization',
            target: 'Place',
            sourceKey: 'organization_id',
            targetKey: 'place_id',
            keys: ['organization_id', 'place_id'],
            payload: {
                short_description: { type: 'string', required: true },
                long_explanation: { type: 'string' },
            },
        },
        ItemSpell: {
            kind: 'simple',
            table: 'item_spells',
            routeFromSource: 'spells',
            source: 'Item',
            target: 'Spell',
            sourceKey: 'item_id',
            targetKey: 'spell_id',
            keys: ['item_id', 'spell_id'],
            payload: {},
        },
        SpellSphere: {
            kind: 'simple',
            table: 'spell_spheres',
            routeFromSource: 'spheres',
            source: 'Spell',
            target: 'Sphere',
            sourceKey: 'spell_id',
            targetKey: 'sphere_id',
            keys: ['spell_id', 'sphere_id'],
            payload: {},
        },
    },
};

function buildEntityTableMap(manifest = domainManifest) {
    const map = {};
    for (const [entityName, entityDef] of Object.entries(manifest.entities)) {
        map[entityName] = entityDef.table;
    }
    return map;
}

function buildJoinTableMap(manifest = domainManifest) {
    const map = {};
    for (const [relationName, relationDef] of Object.entries(manifest.relations)) {
        map[relationName] = relationDef.table;
    }
    return map;
}

function buildLegacyEntitySchemas(manifest = domainManifest) {
    const schemas = {};

    for (const [entityName, entityDef] of Object.entries(manifest.entities)) {
        schemas[entityName] = normalizeFieldSchema(entityDef.fields);
    }

    for (const [relationName, relationDef] of Object.entries(manifest.relations)) {
        const relationSchema = {
            ...normalizeFieldSchema(relationDef.payload),
            [relationDef.sourceKey]: {
                type: 'string',
                primary: true,
                ref: relationDef.source,
            },
            [relationDef.targetKey]: {
                type: 'string',
                primary: true,
                ref: relationDef.target,
            },
        };

        if (relationDef.kind === 'history' && relationDef.historyKey) {
            relationSchema[relationDef.historyKey] = {
                ...(relationSchema[relationDef.historyKey] || { type: 'string' }),
                primary: true,
            };
        }

        schemas[relationName] = relationSchema;
    }

    return schemas;
}

function buildLegacyRegistry(manifest = domainManifest) {
    const grouped = {};

    for (const relationDef of Object.values(manifest.relations)) {
        const source = relationDef.source;
        grouped[source] = grouped[source] || [];

        const joinFields = Object.keys(relationDef.payload || {}).filter(
            (field) => field !== relationDef.historyKey
        );

        grouped[source].push({
            joinTable: relationDef.table,
            relatedEntity: relationDef.target,
            type: relationDef.kind,
            mainIdField: relationDef.sourceKey,
            relatedIdField: relationDef.targetKey,
            dateKey: relationDef.historyKey,
            joinFields,
        });
    }

    return grouped;
}

function normalizeFieldSchema(fields) {
    const normalized = {};

    for (const [fieldName, fieldDef] of Object.entries(fields || {})) {
        normalized[fieldName] = {
            type: fieldDef.type,
            optional: !fieldDef.required,
            primary: Boolean(fieldDef.primary),
            ref: fieldDef.ref,
        };

        if (fieldDef.format) normalized[fieldName].format = fieldDef.format;
        if (fieldDef.autoIncrement) normalized[fieldName].autoIncrement = true;
    }

    return normalized;
}

module.exports = {
    domainManifest,
    buildEntityTableMap,
    buildJoinTableMap,
    buildLegacyEntitySchemas,
    buildLegacyRegistry,
};
