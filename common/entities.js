// common/entities.js
// Central entity and join table definitions

// Entity registry and export
const entities = {};

// Main entity types
defineEntity('Character', {
  id: { type: 'string', primary: true },
  type: { type: 'string' },
  name: { type: 'string' },
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
  deceased: { type: 'number' },
  short_description: { type: 'string' },
  long_explanation: { type: 'string', optional: true },
});

defineEntity('Deity', {
  id: { type: 'string', primary: true },
  name: { type: 'string' },
  pantheon: { type: 'string' },
  alignment: { type: 'string' },
  short_description: { type: 'string' },
  long_explanation: { type: 'string' },
});

defineEntity('Organization', {
  id: { type: 'string', primary: true },
  name: { type: 'string' },
  locations: { type: 'string' },
  type: { type: 'string' },
  short_description: { type: 'string' },
  long_explanation: { type: 'string' },
});

defineEntity('Place', {
  id: { type: 'string', primary: true },
  name: { type: 'string' },
  type: { type: 'string' },
  parent_id: { type: 'string' },
  short_description: { type: 'string' },
  long_explanation: { type: 'string' },
});

defineEntity('Item', {
  id: { type: 'string', primary: true },
  name: { type: 'string' },
  short_description: { type: 'string' },
  long_explanation: { type: 'string' },
});

defineEntity('Event', {
  id: { type: 'string', primary: true },
  name: { type: 'string' },
  real_world_date: { type: 'string' },
  in_game_time: { type: 'string' },
  previous_event_id: { type: 'string' },
  next_event_id: { type: 'string' },
  short_description: { type: 'string' },
  long_explanation: { type: 'string' },
});

defineEntity('Sphere', {
  id: { type: 'string', primary: true },
  name: { type: 'string' },
  short_description: { type: 'string' },
  long_explanation: { type: 'string' },
});

defineEntity('Spell', {
  id: { type: 'string', primary: true },
  type: { type: 'string' },
  name: { type: 'string' },
  level: { type: 'number' },
  school: { type: 'string' },
  sphere: { type: 'string' },
  casting_time: { type: 'string' },
  range: { type: 'string' },
  components: { type: 'string' },
  duration: { type: 'string' },
  description: { type: 'string' },
});

// Join table types (examples)
defineEntity('EventCharacter', {
  event_id: { type: 'string', primary: true, ref: 'Event' },
  character_id: { type: 'string', primary: true, ref: 'Character' },
  short_description: { type: 'string' },
  long_explanation: { type: 'string' },
});

defineEntity('CharacterDeity', {
  character_id: { type: 'string', primary: true, ref: 'Character' },
  deity_id: { type: 'string', primary: true, ref: 'Deity' },
  short_description: { type: 'string' },
  long_explanation: { type: 'string' },
});

function defineEntity(name, schema) {
  entities[name] = schema;
}

module.exports = entities;
