// db.js - SQLite database initialization for campaign-notes
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file in project root
const dbPath = path.join(__dirname, '../campaign.db');
const db = new sqlite3.Database(dbPath);

// Base entity tables (characters, deities, organizations, places, items, events, spheres, spells)

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY,
    type TEXT,
    name TEXT,
    age INTEGER,
    class TEXT,
    level TEXT,
    alignment TEXT,
    strength INTEGER,
    dexterity INTEGER,
    constitution INTEGER,
    intelligence INTEGER,
    wisdom INTEGER,
    charisma INTEGER,
    total_health INTEGER,
    deceased INTEGER,
    short_description TEXT,
    long_explanation TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS deities (
    id TEXT PRIMARY KEY,
    name TEXT,
    pantheon TEXT,
    alignment TEXT,
    short_description TEXT,
    long_explanation TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT,
    locations TEXT,
    type TEXT,
    short_description TEXT,
    long_explanation TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS places (
    id TEXT PRIMARY KEY,
    name TEXT,
    type TEXT,
    parent_id TEXT,
    short_description TEXT,
    long_explanation TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    name TEXT,
    short_description TEXT,
    long_explanation TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    name TEXT,
    real_world_date TEXT,
    in_game_time TEXT,
    previous_event_id TEXT,
    next_event_id TEXT,
    short_description TEXT,
    long_explanation TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS spheres (
    id TEXT PRIMARY KEY,
    name TEXT,
    short_description TEXT,
    long_explanation TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS spells (
    id TEXT PRIMARY KEY,
    type TEXT,
    name TEXT,
    level INTEGER,
    school TEXT,
    sphere TEXT,
    casting_time TEXT,
    range TEXT,
    components TEXT,
    duration TEXT,
    description TEXT
  )`);

  // Join tables

  // foreign keys are to enforce that the character_id referenced 
  // ~actually~ 
  // exists in the characters table.

  db.run(`CREATE TABLE IF NOT EXISTS character_relationships (
    character_id TEXT,
    related_id TEXT,
    relationship_type TEXT,
    short_description TEXT,
    long_explanation TEXT,
    PRIMARY KEY (character_id, related_id),
    FOREIGN KEY (character_id) REFERENCES characters(id),
    FOREIGN KEY (related_id) REFERENCES characters(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS character_deities (
    character_id TEXT,
    deity_id TEXT,
    short_description TEXT,
    long_explanation TEXT,
    PRIMARY KEY (character_id, deity_id),
    FOREIGN KEY (character_id) REFERENCES characters(id),
    FOREIGN KEY (deity_id) REFERENCES deities(id)
  )`);

  /* not unique (no foreign keys)
    tracks history (joined_date as primary key) */
  db.run(`CREATE TABLE IF NOT EXISTS character_organizations (
    character_id TEXT,
    organization_id TEXT,
    joined_date TEXT,
    left_date TEXT,
    short_description TEXT,
    long_explanation TEXT,
    PRIMARY KEY (character_id, organization_id, joined_date)
  )`);

  /* not unique (no foreign keys)
    tracks history (acquired_date as primary key) */
  db.run(`CREATE TABLE IF NOT EXISTS character_places (
    character_id TEXT,
    place_id TEXT,
    arrived_date TEXT,
    left_date TEXT,
    short_description TEXT,
    long_explanation TEXT,
    PRIMARY KEY (character_id, place_id, arrived_date)
  )`);

  /* not unique (no foreign keys)
    tracks history (acquired_date as primary key) */
  db.run(`CREATE TABLE IF NOT EXISTS character_items (
    character_id TEXT,
    item_id TEXT,
    acquired_date TEXT,
    relinquished_date TEXT,
    short_description TEXT,
    PRIMARY KEY (character_id, item_id, acquired_date)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS event_characters (
    event_id TEXT,
    character_id TEXT,
    short_description TEXT,
    long_explanation TEXT,
    PRIMARY KEY (event_id, character_id),
    FOREIGN KEY (event_id) REFERENCES events(id),
    FOREIGN KEY (character_id) REFERENCES characters(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS event_deities (
    event_id TEXT,
    deity_id TEXT,
    short_description TEXT,
    long_explanation TEXT,
    PRIMARY KEY (event_id, deity_id),
    FOREIGN KEY (event_id) REFERENCES events(id),
    FOREIGN KEY (deity_id) REFERENCES deities(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS event_organizations (
    event_id TEXT,
    organization_id TEXT,
    short_description TEXT,
    long_explanation TEXT,
    PRIMARY KEY (event_id, organization_id),
    FOREIGN KEY (event_id) REFERENCES events(id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS event_places (
    event_id TEXT,
    place_id TEXT,
    short_description TEXT,
    long_explanation TEXT,
    PRIMARY KEY (event_id, place_id),
    FOREIGN KEY (event_id) REFERENCES events(id),
    FOREIGN KEY (place_id) REFERENCES places(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS event_items (
    event_id TEXT,
    item_id TEXT,
    short_description TEXT,
    long_explanation TEXT,
    PRIMARY KEY (event_id, item_id),
    FOREIGN KEY (event_id) REFERENCES events(id),
    FOREIGN KEY (item_id) REFERENCES items(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS spell_spheres (
    spell_id TEXT,
    sphere_id TEXT,
    PRIMARY KEY (spell_id, sphere_id),
    FOREIGN KEY (spell_id) REFERENCES spells(id),
    FOREIGN KEY (sphere_id) REFERENCES spheres(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS deity_spheres (
    deity_id TEXT,
    sphere_id TEXT,
    PRIMARY KEY (deity_id, sphere_id),
    FOREIGN KEY (deity_id) REFERENCES deities(id),
    FOREIGN KEY (sphere_id) REFERENCES spheres(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS item_spells (
    item_id TEXT,
    spell_id TEXT,
    PRIMARY KEY (item_id, spell_id),
    FOREIGN KEY (item_id) REFERENCES items(id),
    FOREIGN KEY (spell_id) REFERENCES spells(id)
  )`);

  // Monolithic aliases table for all entity types
  db.run(`CREATE TABLE IF NOT EXISTS aliases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT,
    entity_id TEXT,
    alias TEXT,
    UNIQUE(entity_type, entity_id, alias)
  )`);

  console.log('Database tables created or verified.');
});

// Close DB connection if run directly
if (require.main === module) {
  db.close();
}

module.exports = db;
