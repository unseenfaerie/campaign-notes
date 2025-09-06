// common/entityRegistry.js
// Central registry of entity join table relationships for full GET endpoints and UI logic

const entityRegistry = {
  Character: [
    {
      joinTable: 'character_deities',
      relatedEntity: 'Deity',
      type: 'history',
      mainIdField: 'character_id',
      relatedIdField: 'deity_id',
      joinFields: [
        'adopted_date', 'dissolution_date', 'relationship_type', 'short_description', 'long_explanation'
      ]
    },
    {
      joinTable: 'character_items',
      relatedEntity: 'Item',
      type: 'history',
      mainIdField: 'character_id',
      relatedIdField: 'item_id',
      joinFields: [
        'acquired_date', 'relinquished_date', 'short_description'
      ]
    },
    {
      joinTable: 'character_organizations',
      relatedEntity: 'Organization',
      type: 'history',
      mainIdField: 'character_id',
      relatedIdField: 'organization_id',
      joinFields: [
        'joined_date', 'left_date', 'short_description', 'long_explanation'
      ]
    },
    {
      joinTable: 'character_places',
      relatedEntity: 'Place',
      type: 'history',
      mainIdField: 'character_id',
      relatedIdField: 'place_id',
      joinFields: [
        'arrived_date', 'left_date', 'short_description', 'long_explanation'
      ]
    },
    {
      joinTable: 'character_relationships',
      relatedEntity: 'Character',
      type: 'history',
      mainIdField: 'character_id',
      relatedIdField: 'related_id',
      joinFields: [
        'established_date', 'dissolution_date', 'relationship_type', 'short_description', 'long_explanation'
      ]
    }
  ],
  Deity: [
    {
      joinTable: 'character_deities',
      relatedEntity: 'Character',
      type: 'history',
      mainIdField: 'deity_id',
      relatedIdField: 'character_id',
      joinFields: [
        'adopted_date', 'dissolution_date', 'relationship_type', 'short_description', 'long_explanation'
      ]
    },
    {
      joinTable: 'deity_spheres',
      relatedEntity: 'Sphere',
      type: 'simple',
      mainIdField: 'deity_id',
      relatedIdField: 'sphere_id',
      joinFields: []
    },
    {
      joinTable: 'event_deities',
      relatedEntity: 'Event',
      type: 'relationship',
      mainIdField: 'deity_id',
      relatedIdField: 'event_id',
      joinFields: [
        'short_description', 'long_explanation'
      ]
    }
  ],
  Item: [
    {
      joinTable: 'character_items',
      relatedEntity: 'Character',
      type: 'history',
      mainIdField: 'item_id',
      relatedIdField: 'character_id',
      joinFields: [
        'acquired_date', 'relinquished_date', 'short_description'
      ]
    },
    {
      joinTable: 'event_items',
      relatedEntity: 'Event',
      type: 'relationship',
      mainIdField: 'item_id',
      relatedIdField: 'event_id',
      joinFields: [
        'short_description', 'long_explanation'
      ]
    },
    {
      joinTable: 'item_spells',
      relatedEntity: 'Spell',
      type: 'simple',
      mainIdField: 'item_id',
      relatedIdField: 'spell_id',
      joinFields: []
    }
  ],
  Organization: [
    {
      joinTable: 'character_organizations',
      relatedEntity: 'Character',
      type: 'history',
      mainIdField: 'organization_id',
      relatedIdField: 'character_id',
      joinFields: [
        'joined_date', 'left_date', 'short_description', 'long_explanation'
      ]
    },
    {
      joinTable: 'event_organizations',
      relatedEntity: 'Event',
      type: 'relationship',
      mainIdField: 'organization_id',
      relatedIdField: 'event_id',
      joinFields: [
        'short_description', 'long_explanation'
      ]
    },
    {
      joinTable: 'organization_places',
      relatedEntity: 'Place',
      type: 'relationship',
      mainIdField: 'organization_id',
      relatedIdField: 'place_id',
      joinFields: [
        'short_description', 'long_explanation'
      ]
    }
  ],
  Place: [
    {
      joinTable: 'character_places',
      relatedEntity: 'Character',
      type: 'history',
      mainIdField: 'place_id',
      relatedIdField: 'character_id',
      joinFields: [
        'arrived_date', 'left_date', 'short_description', 'long_explanation'
      ]
    },
    {
      joinTable: 'event_places',
      relatedEntity: 'Event',
      type: 'relationship',
      mainIdField: 'place_id',
      relatedIdField: 'event_id',
      joinFields: [
        'short_description', 'long_explanation'
      ]
    },
    {
      joinTable: 'organization_places',
      relatedEntity: 'Organization',
      type: 'relationship',
      mainIdField: 'place_id',
      relatedIdField: 'organization_id',
      joinFields: [
        'short_description', 'long_explanation'
      ]
    }
  ],
  Event: [
    {
      joinTable: 'event_characters',
      relatedEntity: 'Character',
      type: 'relationship',
      mainIdField: 'event_id',
      relatedIdField: 'character_id',
      joinFields: [
        'short_description', 'long_explanation'
      ]
    },
    {
      joinTable: 'event_deities',
      relatedEntity: 'Deity',
      type: 'relationship',
      mainIdField: 'event_id',
      relatedIdField: 'deity_id',
      joinFields: [
        'short_description', 'long_explanation'
      ]
    },
    {
      joinTable: 'event_items',
      relatedEntity: 'Item',
      type: 'relationship',
      mainIdField: 'event_id',
      relatedIdField: 'item_id',
      joinFields: [
        'short_description', 'long_explanation'
      ]
    },
    {
      joinTable: 'event_organizations',
      relatedEntity: 'Organization',
      type: 'relationship',
      mainIdField: 'event_id',
      relatedIdField: 'organization_id',
      joinFields: [
        'short_description', 'long_explanation'
      ]
    },
    {
      joinTable: 'event_places',
      relatedEntity: 'Place',
      type: 'relationship',
      mainIdField: 'event_id',
      relatedIdField: 'place_id',
      joinFields: [
        'short_description', 'long_explanation'
      ]
    }
  ],
  Spell: [
    {
      joinTable: 'item_spells',
      relatedEntity: 'Item',
      type: 'simple',
      mainIdField: 'spell_id',
      relatedIdField: 'item_id',
      joinFields: []
    },
    {
      joinTable: 'spell_spheres',
      relatedEntity: 'Sphere',
      type: 'simple',
      mainIdField: 'spell_id',
      relatedIdField: 'sphere_id',
      joinFields: []
    }
  ],
  Sphere: [
    {
      joinTable: 'deity_spheres',
      relatedEntity: 'Deity',
      type: 'simple',
      mainIdField: 'sphere_id',
      relatedIdField: 'deity_id',
      joinFields: []
    },
    {
      joinTable: 'spell_spheres',
      relatedEntity: 'Spell',
      type: 'simple',
      mainIdField: 'sphere_id',
      relatedIdField: 'spell_id',
      joinFields: []
    }
  ]
};

// Maps for main entity and join table names
const entityTableMap = {
  Character: 'characters',
  Deity: 'deities',
  Event: 'events',
  Item: 'items',
  Organization: 'organizations',
  Place: 'places',
  Spell: 'spells',
  Sphere: 'spheres'
};

const joinTableMap = {
  CharacterDeity: 'character_deities',
  CharacterItem: 'character_items',
  CharacterOrganization: 'character_organizations',
  CharacterPlace: 'character_places',
  CharacterRelationship: 'character_relationships',
  DeitySphere: 'deity_spheres',
  EventCharacter: 'event_characters',
  EventDeity: 'event_deities',
  EventItem: 'event_items',
  EventOrganization: 'event_organizations',
  EventPlace: 'event_places',
  OrganizationPlace: 'organization_places',
  ItemSpell: 'item_spells',
  SpellSphere: 'spell_spheres',
  Alias: 'aliases'
};

module.exports = {
  entityRegistry,
  entityTableMap,
  joinTableMap
};
