// common/entities.js
// Central entity and join table definitions

// Entity registry and export
const entities = {};

// Main entity types
defineEntity('Character', {
  id: { type: 'string', primary: true },
  type: { type: 'string' },
  name: { type: 'string' },
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
defineEntity('EventCharacter', {
  event_id: { type: 'string', primary: true, ref: 'Event' },
  character_id: { type: 'string', primary: true, ref: 'Character' },
  short_description: { type: 'string' },
  long_explanation: { type: 'string', optional: true },
});

defineEntity('CharacterDeity', {
  character_id: { type: 'string', primary: true, ref: 'Character' },
  deity_id: { type: 'string', primary: true, ref: 'Deity' },
  short_description: { type: 'string' },
  long_explanation: { type: 'string', optional: true },
});

function defineEntity(name, schema) {
  entities[name] = schema;
}

module.exports = entities;
