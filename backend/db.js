// db.js - SQLite database initialization for campaign-notes
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file in project root
const dbPath = path.join(__dirname, '../campaign.db');
const db = new sqlite3.Database(dbPath);

// Create tables for campaign data
// You can expand these schemas as needed

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY,
    type TEXT,
    name TEXT,
    aliases TEXT,
    alignment TEXT,
    strength INTEGER,
    dexterity INTEGER,
    constitution INTEGER,
    intelligence INTEGER,
    wisdom INTEGER,
    charisma INTEGER,
    href TEXT,
    total_health INTEGER,
    deceased BOOLEAN,
    description TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS deities (
    id TEXT PRIMARY KEY,
    name TEXT,
    aliases TEXT,
    href TEXT,
    pantheon TEXT,
    alignment TEXT,
    description TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT,
    aliases TEXT,
    href TEXT,
    locations TEXT,
    type TEXT,
    description TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS places (
    id TEXT PRIMARY KEY,
    name TEXT,
    type TEXT,
    aliases TEXT,
    href TEXT,
    description TEXT,
    parent_id TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    name TEXT,
    aliases TEXT,
    href TEXT,
    description TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    name TEXT,
    real_world_date TEXT,
    in_game_time TEXT,
    description TEXT,
    href TEXT,
    previous_event_id TEXT,
    next_event_id TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS spheres (
      id TEXT PRIMARY KEY,
      name TEXT,
      description TEXT
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

  // Join tables for events to other entities
  db.run(`CREATE TABLE IF NOT EXISTS event_characters (
      event_id TEXT,
      character_id TEXT,
      notes TEXT,
      PRIMARY KEY (event_id, character_id),
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (character_id) REFERENCES characters(id)
    )`);

  db.run(`CREATE TABLE IF NOT EXISTS event_organizations (
      event_id TEXT,
      organization_id TEXT,
      PRIMARY KEY (event_id, organization_id),
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (organization_id) REFERENCES organizations(id)
    )`);

  db.run(`CREATE TABLE IF NOT EXISTS event_places (
      event_id TEXT,
      place_id TEXT,
      PRIMARY KEY (event_id, place_id),
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (place_id) REFERENCES places(id)
    )`);

  db.run(`CREATE TABLE IF NOT EXISTS event_deities (
      event_id TEXT,
      deity_id TEXT,
      PRIMARY KEY (event_id, deity_id),
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (deity_id) REFERENCES deities(id)
    )`);

  db.run(`CREATE TABLE IF NOT EXISTS event_items (
      event_id TEXT,
      item_id TEXT,
      PRIMARY KEY (event_id, item_id),
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (item_id) REFERENCES items(id)
    )`);

  // Join table: character_relationships (many-to-many between characters)
  db.run(`CREATE TABLE IF NOT EXISTS character_relationships (
      character_id TEXT,
      related_id TEXT,
      relationship_type TEXT,
      PRIMARY KEY (character_id, related_id),
      FOREIGN KEY (character_id) REFERENCES characters(id),
      FOREIGN KEY (related_id) REFERENCES characters(id)
    )`);

  // Join table: spell_spheres (many-to-many between spells and spheres)
  db.run(`CREATE TABLE IF NOT EXISTS spell_spheres (
      spell_id TEXT,
      sphere_id TEXT,
      PRIMARY KEY (spell_id, sphere_id),
      FOREIGN KEY (spell_id) REFERENCES spells(id),
      FOREIGN KEY (sphere_id) REFERENCES spheres(id)
    )`);

  // Join table: deity_spheres (many-to-many between deities and spheres)
  db.run(`CREATE TABLE IF NOT EXISTS deity_spheres (
      deity_id TEXT,
      sphere_id TEXT,
      PRIMARY KEY (deity_id, sphere_id),
      FOREIGN KEY (deity_id) REFERENCES deities(id),
      FOREIGN KEY (sphere_id) REFERENCES spheres(id)
    )`);

  //Join table: character_items (many-to-many between characters and items)
  db.run(`CREATE TABLE IF NOT EXISTS character_items (
      character_id TEXT,
      item_id TEXT,
      acquired_date TEXT,
      relinquished_date TEXT,
      PRIMARY KEY (character_id, item_id, acquired_date)
    )`);

  // Join table: character_organizations (many-to-many between characters and organizations)
  db.run(`CREATE TABLE IF NOT EXISTS character_organizations (
      character_id TEXT,
      organization_id TEXT,
      role TEXT,
      joined_date TEXT,
      left_date TEXT,
      PRIMARY KEY (character_id, organization_id)
    )`);

  console.log('Database tables created or verified.');
});

// Close DB connection if run directly
if (require.main === module) {
  db.close();
}

module.exports = db;
