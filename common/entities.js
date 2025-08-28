// common/entities.js
// Central entity and join table definitions
// Any major changes here need to be considered for the database and schema as well

// Entity registry and export
const entities = {};

// Main entity types
defineEntity('Character', {
  id: { type: 'string', primary: true },
  type: { type: 'string' },
  name: { type: 'string' },
  age: { type: 'number', optional: true },
  class: { type: 'string', optional: true },
  level: { type: 'string', optional: true },
  alignment: { type: 'string', optional: true },
  strength: { type: 'number', optional: true },
  dexterity: { type: 'number', optional: true },
  constitution: { type: 'number', optional: true },
  intelligence: { type: 'number', optional: true },
  wisdom: { type: 'number', optional: true },
  charisma: { type: 'number', optional: true },
  total_health: { type: 'number', optional: true },
  deceased: { type: 'number' },
  short_description: { type: 'string' },
  long_explanation: { type: 'string', optional: true },
});

defineEntity('Deity', {
  id: { type: 'string', primary: true },
  name: { type: 'string' },
  pantheon: { type: 'string', optional: true },
  alignment: { type: 'string', optional: true },
  short_description: { type: 'string' },
  long_explanation: { type: 'string', optional: true },
});

defineEntity('Organization', {
  id: { type: 'string', primary: true },
  name: { type: 'string' },
  locations: { type: 'string', optional: true },
  type: { type: 'string', optional: true },
  short_description: { type: 'string' },
  long_explanation: { type: 'string', optional: true },
});

defineEntity('Place', {
  id: { type: 'string', primary: true },
  name: { type: 'string' },
  type: { type: 'string' },
  parent_id: { type: 'string', optional: true },
  short_description: { type: 'string' },
  long_explanation: { type: 'string', optional: true },
});

defineEntity('Item', {
  id: { type: 'string', primary: true },
  name: { type: 'string' },
  short_description: { type: 'string' },
  long_explanation: { type: 'string', optional: true },
});

defineEntity('Event', {
  id: { type: 'string', primary: true },
  name: { type: 'string' },
  real_world_date: { type: 'string', optional: true },
  in_game_time: { type: 'string', optional: true },
  previous_event_id: { type: 'string', optional: true },
  next_event_id: { type: 'string', optional: true },
  short_description: { type: 'string' },
  long_explanation: { type: 'string', optional: true },
});

defineEntity('Sphere', {
  id: { type: 'string', primary: true },
  name: { type: 'string' },
  short_description: { type: 'string' },
  long_explanation: { type: 'string', optional: true },
});

defineEntity('Spell', {
  id: { type: 'string', primary: true },
  type: { type: 'string' },
  name: { type: 'string' },
  level: { type: 'number' },
  school: { type: 'string' },
  sphere: { type: 'string', optional: true },
  casting_time: { type: 'string' },
  range: { type: 'string' },
  components: { type: 'string', optional: true },
  duration: { type: 'string', optional: true },
  short_description: { type: 'string' },
});

// Join table types (examples)
defineEntity('CharacterRelationship', {
  character_id: { type: 'string', primary: true, ref: 'Character' },
  related_id: { type: 'string', primary: true, ref: 'Character' },
  relationship_type: { type: 'string' },
  short_description: { type: 'string' },
  long_explanation: { type: 'string', optional: true },
});

defineEntity('CharacterDeity', {
  character_id: { type: 'string', primary: true, ref: 'Character' },
  deity_id: { type: 'string', primary: true, ref: 'Deity' },
  short_description: { type: 'string' },
  long_explanation: { type: 'string', optional: true },
});

defineEntity('CharacterOrganization', {
  character_id: { type: 'string', primary: true, ref: 'Character' },
  organization_id: { type: 'string', primary: true, ref: 'Organization' },
  short_description: { type: 'string' },
  long_explanation: { type: 'string', optional: true },
});


defineEntity('CharacterPlace', {
  character_id: { type: 'string', primary: true, ref: 'Character' },
  place_id: { type: 'string', primary: true, ref: 'Place' },
  arrived_date: { type: 'string' },
  left_date: { type: 'string', optional: true },
  short_description: { type: 'string' },
  long_explanation: { type: 'string', optional: true },
});

defineEntity('CharacterItem', {
  character_id: { type: 'string', primary: true, ref: 'Character' },
  item_id: { type: 'string', primary: true, ref: 'Item' },
  acquired_date: { type: 'string', primary: true },
  relinquished_date: { type: 'string', optional: true },
  short_description: { type: 'string' }
});

defineEntity('EventCharacter', {
  event_id: { type: 'string', primary: true, ref: 'Event' },
  character_id: { type: 'string', primary: true, ref: 'Character' },
  short_description: { type: 'string' },
  long_explanation: { type: 'string', optional: true },
});

defineEntity('EventDeity', {
  event_id: { type: 'string', primary: true, ref: 'Event' },
  deity_id: { type: 'string', primary: true, ref: 'Deity' },
  short_description: { type: 'string' },
  long_explanation: { type: 'string', optional: true },
});

defineEntity('EventOrganization', {
  event_id: { type: 'string', primary: true, ref: 'Event' },
  organization_id: { type: 'string', primary: true, ref: 'Organization' },
  short_description: { type: 'string' },
  long_explanation: { type: 'string', optional: true },
});

defineEntity('EventPlace', {
  event_id: { type: 'string', primary: true, ref: 'Event' },
  place_id: { type: 'string', primary: true, ref: 'Place' },
  short_description: { type: 'string' },
  long_explanation: { type: 'string', optional: true },
});

defineEntity('EventItem', {
  event_id: { type: 'string', primary: true, ref: 'Event' },
  item_id: { type: 'string', primary: true, ref: 'Item' },
  short_description: { type: 'string' },
  long_explanation: { type: 'string', optional: true },
});

defineEntity('SpellSphere', {
  spell_id: { type: 'string', primary: true, ref: 'Spell' },
  sphere_id: { type: 'string', primary: true, ref: 'Sphere' },
});

defineEntity('DeitySphere', {
  deity_id: { type: 'string', primary: true, ref: 'Deity' },
  sphere_id: { type: 'string', primary: true, ref: 'Sphere' },
});

defineEntity('ItemSpell', {
  item_id: { type: 'string', primary: true, ref: 'Item' },
  spell_id: { type: 'string', primary: true, ref: 'Spell' },
});

defineEntity('Alias', {
  id: { type: 'number', primary: true },
  entity_type: { type: 'string' },
  entity_id: { type: 'number' },
  alias: { type: 'string' },
});

function defineEntity(name, schema) {
  entities[name] = schema;
}

module.exports = entities;
