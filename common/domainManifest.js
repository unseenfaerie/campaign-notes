// relationship types:
// simple - no metadata, just association between two entities
// relationship - association between two entities with metadata
// history - association between two entities with metadata and a date key, 
// meaning that there may be many records for a given pair
const { getEnumValues } = require('./enums');

const domainManifest = {
    entities: {
        Character: {
            table: 'characters',
            route: 'characters',
            ui: { label: 'Characters', singularLabel: 'Character', navigation: true, default: true },
            idField: 'id',
            fields: {
                id: { type: 'string', primary: true, required: true, format: 'slug' },
                player_character: { type: 'boolean', required: true },
                is_public: { type: 'boolean', required: true, hidden: true },
                name: { type: 'string', required: true },
                birthdate: { type: 'loreDate' },
                ancestry: { type: 'string', enum: 'ancestry' },
                class: { type: 'string' },
                level: { type: 'string' },
                alignment: { type: 'string', enum: 'alignment' },
                strength: { type: 'number' },
                dexterity: { type: 'number' },
                constitution: { type: 'number' },
                intelligence: { type: 'number' },
                wisdom: { type: 'number' },
                charisma: { type: 'number' },
                max_health: { type: 'number' },
                retired: { type: 'boolean' },
                deceased: { type: 'boolean', required: true },
                short_description: { type: 'string', required: true, expository: true },
                long_explanation: {
                    type: 'string',
                    expository: true,
                },
            },
        },
        Deity: {
            table: 'deities',
            route: 'deities',
            ui: { label: 'Deities', singularLabel: 'Deity', navigation: true },
            idField: 'id',
            fields: {
                id: { type: 'string', primary: true, required: true, format: 'slug' },
                is_public: { type: 'boolean', required: true, hidden: true },
                name: { type: 'string', required: true },
                alignment: { type: 'string', enum: 'alignment' },
                short_description: { type: 'string', required: true, expository: true },
                long_explanation: { type: 'string', expository: true },
            },
        },
        Event: {
            table: 'events',
            route: 'events',
            ui: { label: 'Events', singularLabel: 'Event', navigation: true },
            idField: 'id',
            fields: {
                id: { type: 'string', primary: true, required: true, format: 'slug' },
                is_public: { type: 'boolean', required: true, hidden: true },
                name: { type: 'string', required: true },
                real_world_date: { type: 'realDate' },
                in_game_time_start: { type: 'loreDate' },
                in_game_time_end: { type: 'loreDate' },
                previous_event_id: { type: 'string', ref: 'Event' },
                next_event_id: { type: 'string', ref: 'Event' },
                short_description: { type: 'string', required: true, expository: true },
                long_explanation: { type: 'string', expository: true },
            },
        },
        Item: {
            table: 'items',
            route: 'items',
            ui: { label: 'Items', singularLabel: 'Item', navigation: true },
            idField: 'id',
            fields: {
                id: { type: 'string', primary: true, required: true, format: 'slug' },
                is_public: { type: 'boolean', required: true, hidden: true },
                name: { type: 'string', required: true },
                short_description: { type: 'string', required: true, expository: true },
                long_explanation: { type: 'string', expository: true },
            },
        },
        Organization: {
            table: 'organizations',
            route: 'organizations',
            ui: { label: 'Organizations', singularLabel: 'Organization', navigation: true },
            idField: 'id',
            fields: {
                id: { type: 'string', primary: true, required: true, format: 'slug' },
                is_public: { type: 'boolean', required: true, hidden: true },
                name: { type: 'string', required: true },
                type: { type: 'string', required: true, enum: 'organizationType' },
                short_description: { type: 'string', required: true, expository: true },
                long_explanation: { type: 'string', expository: true },
            },
        },
        Place: {
            table: 'places',
            route: 'places',
            ui: { label: 'Places', singularLabel: 'Place', navigation: true },
            idField: 'id',
            fields: {
                id: { type: 'string', primary: true, required: true, format: 'slug' },
                is_public: { type: 'boolean', required: true, hidden: true },
                name: { type: 'string', required: true },
                type: { type: 'string', required: true, enum: 'placeType' },
                parent_id: { type: 'string', ref: 'Place' },
                short_description: { type: 'string', required: true, expository: true },
                establishments: { type: 'string', expository: true },
                long_explanation: { type: 'string', expository: true },
            },
        },
        Spell: {
            table: 'spells',
            route: 'spells',
            ui: { label: 'Spells', singularLabel: 'Spell', navigation: true },
            idField: 'id',
            fields: {
                id: { type: 'string', primary: true, required: true, format: 'slug' },
                is_public: { type: 'boolean', required: true, hidden: true },
                type: { type: 'string' },
                name: { type: 'string', required: true },
                level: { type: 'number' },
                school: { type: 'string' },
                casting_time: { type: 'string' },
                range: { type: 'string' },
                components: { type: 'string' },
                materials: { type: 'string' },
                duration: { type: 'string' },
                description: { type: 'string', required: true, expository: true },
            },
        },
        Sphere: {
            table: 'spheres',
            route: 'spheres',
            ui: { label: 'Spheres', singularLabel: 'Sphere', navigation: true },
            idField: 'id',
            fields: {
                id: { type: 'string', primary: true, required: true, format: 'slug' },
                is_public: { type: 'boolean', required: true, hidden: true },
                name: { type: 'string', required: true },
                short_description: { type: 'string', required: true, expository: true },
            },
        },
        Alias: {
            table: 'aliases',
            route: 'aliases',
            ui: { label: 'Aliases', singularLabel: 'Alias', navigation: false },
            idField: 'id',
            fields: {
                id: { type: 'number', primary: true, required: true, autoIncrement: true },
                is_public: { type: 'boolean', required: true, hidden: true },
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
            members: [
                { entity: 'Character', key: 'character_id', route: 'deities' },
                { entity: 'Deity', key: 'deity_id', route: 'characters' },
            ],
            historyKey: 'adopted_date',
            historyEndKey: 'dissolution_date',
            keys: ['character_id', 'deity_id', 'adopted_date'],
            payload: {
                adopted_date: { type: 'loreDate', required: true },
                dissolution_date: { type: 'loreDate' },
                relationship_type: { type: 'string' },
                short_description: { type: 'string', required: true, expository: true },
                long_explanation: {
                    type: 'string',
                    expository: true,
                },
            },
        },
        CharacterItem: {
            kind: 'history',
            table: 'character_items',
            members: [
                { entity: 'Character', key: 'character_id', route: 'items' },
                { entity: 'Item', key: 'item_id', route: 'characters' },
            ],
            historyKey: 'acquired_date',
            historyEndKey: 'relinquished_date',
            keys: ['character_id', 'item_id', 'acquired_date'],
            payload: {
                acquired_date: { type: 'loreDate', required: true },
                relinquished_date: { type: 'loreDate' },
                short_description: { type: 'string', required: true, expository: true },
                long_explanation: {
                    type: 'string',
                    expository: true,
                },
            },
        },
        CharacterOrganization: {
            kind: 'history',
            table: 'character_organizations',
            members: [
                { entity: 'Character', key: 'character_id', route: 'organizations' },
                { entity: 'Organization', key: 'organization_id', route: 'characters' },
            ],
            historyKey: 'joined_date',
            historyEndKey: 'left_date',
            keys: ['character_id', 'organization_id', 'joined_date'],
            payload: {
                joined_date: { type: 'loreDate', required: true },
                left_date: { type: 'loreDate' },
                short_description: { type: 'string', required: true, expository: true },
                long_explanation: {
                    type: 'string',
                    expository: true,
                },
            },
        },
        CharacterPlace: {
            kind: 'history',
            table: 'character_places',
            members: [
                { entity: 'Character', key: 'character_id', route: 'places' },
                { entity: 'Place', key: 'place_id', route: 'characters' },
            ],
            historyKey: 'arrived_date',
            historyEndKey: 'left_date',
            keys: ['character_id', 'place_id', 'arrived_date'],
            payload: {
                arrived_date: { type: 'loreDate', required: true },
                left_date: { type: 'loreDate' },
                short_description: { type: 'string', required: true, expository: true },
                long_explanation: {
                    type: 'string',
                    expository: true,
                },
            },
        },
        CharacterRelationship: {
            kind: 'history',
            table: 'character_relationships',
            directional: true,  // This is a one-way directional relation: character_id is the perspective holder, related_id is the subject. Each character's player independently creates records from their perspective.
            members: [
                { entity: 'Character', key: 'character_id', route: 'characters' },
                { entity: 'Character', key: 'related_id', route: 'characters' },
            ],
            historyKey: 'established_date',
            historyEndKey: 'dissolution_date',
            keys: ['character_id', 'related_id', 'established_date'],
            payload: {
                established_date: { type: 'loreDate', required: true },
                dissolution_date: { type: 'loreDate' },
                relationship_type: { type: 'string', required: true, enum: 'characterRelationship' },
                short_description: { type: 'string', required: true, expository: true },
                long_explanation: {
                    type: 'string',
                    expository: true,
                },
            },
        },
        DeitySphere: {
            kind: 'simple',
            table: 'deity_spheres',
            members: [
                { entity: 'Deity', key: 'deity_id', route: 'spheres' },
                { entity: 'Sphere', key: 'sphere_id', route: 'deities' },
            ],
            keys: ['deity_id', 'sphere_id'],
            payload: {},
        },
        DeityOrganization: {
            kind: 'simple',
            table: 'deity_organizations',
            members: [
                { entity: 'Deity', key: 'deity_id', route: 'organizations' },
                { entity: 'Organization', key: 'organization_id', route: 'deities' },
            ],
            keys: ['deity_id', 'organization_id'],
            payload: {},
        },
        EventCharacter: {
            kind: 'relationship',
            table: 'event_characters',
            members: [
                { entity: 'Event', key: 'event_id', route: 'characters' },
                { entity: 'Character', key: 'character_id', route: 'events' },
            ],
            keys: ['event_id', 'character_id'],
            payload: {
                short_description: { type: 'string', required: true, expository: true },
                long_explanation: {
                    type: 'string',
                    expository: true,
                },
            },
        },
        EventOrganization: {
            kind: 'relationship',
            table: 'event_organizations',
            members: [
                { entity: 'Event', key: 'event_id', route: 'organizations' },
                { entity: 'Organization', key: 'organization_id', route: 'events' },
            ],
            keys: ['event_id', 'organization_id'],
            payload: {
                short_description: { type: 'string', required: true, expository: true },
                long_explanation: { type: 'string', expository: true },
            },
        },
        EventPlace: {
            kind: 'simple',
            table: 'event_places',
            members: [
                { entity: 'Event', key: 'event_id', route: 'places' },
                { entity: 'Place', key: 'place_id', route: 'events' },
            ],
            keys: ['event_id', 'place_id'],
            payload: {},
        },
        OrganizationPlace: {
            kind: 'relationship',
            table: 'organization_places',
            members: [
                { entity: 'Organization', key: 'organization_id', route: 'places' },
                { entity: 'Place', key: 'place_id', route: 'organizations' },
            ],
            keys: ['organization_id', 'place_id'],
            payload: {
                short_description: { type: 'string', required: true, expository: true },
                long_explanation: { type: 'string', expository: true },
            },
        },
        ItemSpell: {
            kind: 'simple',
            table: 'item_spells',
            members: [
                { entity: 'Item', key: 'item_id', route: 'spells' },
                { entity: 'Spell', key: 'spell_id', route: 'items' },
            ],
            keys: ['item_id', 'spell_id'],
            payload: {},
        },
        SpellSphere: {
            kind: 'simple',
            table: 'spell_spheres',
            members: [
                { entity: 'Spell', key: 'spell_id', route: 'spheres' },
                { entity: 'Sphere', key: 'sphere_id', route: 'spells' },
            ],
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
        if (fieldDef.enum) normalized[fieldName].enum = [...getEnumValues(fieldDef.enum)];
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
