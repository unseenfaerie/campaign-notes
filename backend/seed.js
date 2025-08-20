// seed.js - Populate campaign.db with example data
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../campaign.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  console.log('Inserting characters...');
  db.run(`INSERT OR IGNORE INTO characters (id, type, name, class, level, alignment, strength, dexterity, constitution, intelligence, wisdom, charisma, total_health, deceased, description) VALUES
    ('alann-barnett', 'player-character', 'Alann Barnett', 'Cleric', '4', 'Neutral Good', 13, 8, 11, 10, 14, 11, 20, 0, 'A thoughtful and strong-willed adventurer.'),
    ('releas-neb', 'player-character', 'Releas Neb', 'Magic User', '7', 'Chaotic Good', 5, 14, 10, 18, 13, 9, 16, 0, 'A clever and resourceful wizard.'),
    ('appolonia-palleday', 'player-character', 'Appolonia Palleday', 'Magic User', '5', 'Neutral Good', 13, 8, 11, 18, 14, 11, 18, 0, 'A bright and curious spellcaster.'),
    ('durchir', 'player-character', 'Durchir', 'Fighter/Enchanter', '2/Enchanter', 'Lawful Evil', 18, 10, 12, 15, 10, 11, 22, 1, 'Durchir of the Angry Orchard, fallen hero.'),
    ('cormac', 'player-character', 'Cormac', 'Thief/Illusionist', '5/4', 'Chaotic Good', 9, 16, 7, 15, 14, 7, 15, 0, 'A clever and nimble adventurer.'),
    ('bert-verinwort', 'non-player-character', 'Bert Verinwort', NULL, NULL, 'Lawful Neutral', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'A local notable in Wavethorn.'),
    ('sieg-ordoss', 'non-player-character', 'Sieg Ordoss', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'A mysterious figure.'),
    ('gereg', 'non-player-character', 'Gereg', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'A resident of Wavethorn.'),
    ('leo', 'non-player-character', 'Leo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'A resident of Wavethorn.')
  `);

  console.log('Inserting deities...');
  db.run(`INSERT OR IGNORE INTO deities (id, name, pantheon, alignment, description) VALUES
    ('achiel', 'Achiel', 'Main Human', 'Lawful Good', 'God of Light.'),
    ('idona', 'Idona', 'Main Human', 'Chaotic Good', 'Goddess of Humanity, the Moon, and devotion.'),
    ('ponat', 'Ponat', 'Main Human', 'Lawful Good', 'God of Fortress and protection.'),
    ('wyaris', 'Wyaris', 'Three Sister Goddesses', 'Chaotic Good', 'Lady of Swords.'),
    ('danaris', 'Danaris', 'Three Sister Goddesses', 'Chaotic Neutral', 'Lady of Death.'),
    ('vaharis', 'Vaharis', 'Three Sister Goddesses', 'Lawful Neutral', 'Lady of Judgement.')
  `);

  console.log('Inserting organizations...');
  db.run(`INSERT OR IGNORE INTO organizations (id, name, type, description) VALUES
    ('church-of-achiels-light', 'Church of Achiel''s Light', 'religion', 'The main church of Achiel.'),
    ('order-of-the-iron-duch', 'The Order of the Iron Düch', 'adventuring party', 'A party of heroes.'),
    ('wyvernfang', 'Wyvernfang', 'adventuring party', 'A group based in Wavethorn.'),
    ('three-sisters', 'The Three Sisters', 'pantheon', 'The Three Sister Goddesses.'),
    ('adventurers-guild', 'The Adventurer''s Guild', 'guild', 'A guild for adventurers in Novafell and Wavethorn.')
  `);

  console.log('Inserting places...');
  db.run(`INSERT OR IGNORE INTO places (id, name, type, description) VALUES
    ('anash', 'Anash', 'city', 'A city in Weinmere.'),
    ('wavethorn', 'Wavethorn', 'city', 'A city on the coast.');
  `);

  console.log('Inserting items...');
  db.run(`INSERT OR IGNORE INTO items (id, name, description) VALUES
    ('cormac-spellbook', 'Cormac''s Spellbook', 'A spellbook belonging to Cormac.');
  `);

  console.log('Inserting events...');
  db.run(`INSERT OR IGNORE INTO events (id, name, real_world_date, in_game_time, description) VALUES
    ('coup-of-wavethorn', 'The Coup of Wavethorn', '2025-08-01', 'OMAR 1', 'A pivotal event in Wavethorn.');
  `);

  console.log('Inserting spheres...');
  db.run(`INSERT OR IGNORE INTO spheres (id, name, description) VALUES
    ('war', 'War', 'Sphere of War.'),
    ('death', 'Death', 'Sphere of Death.');
  `);

  console.log('Inserting spells...');
  db.run(`INSERT OR IGNORE INTO spells (id, type, name, level, school, sphere, casting_time, range, components, duration, description) VALUES
    ('fireball', 'arcane', 'Fireball', 3, 'Evocation', 'war', '1 action', '150 feet', 'V,S,M', 'Instantaneous', 'A bright streak flashes to a point you choose.'),
    ('raise-dead', 'divine', 'Raise Dead', 5, NULL, 'death', '1 hour', 'Touch', NULL, 'Instantaneous', 'Return a dead creature to life.');
  `);

  console.log('Inserting aliases...');
  db.run(`INSERT OR IGNORE INTO aliases (entity_type, entity_id, alias) VALUES
    ('character', 'alann-barnett', 'Alann'),
    ('character', 'releas-neb', 'Rel'),
    ('deity', 'achiel', 'Achiel, God of Light'),
    ('place', 'wavethorn', 'City of Wavethorn'),
    ('event', 'coup-of-wavethorn', 'OOTID Session 1');
  `);

  console.log('Inserting event_characters...');
  db.run(`INSERT OR IGNORE INTO event_characters (event_id, character_id, notes) VALUES
    ('coup-of-wavethorn', 'alann-barnett', 'Led the defense.'),
    ('coup-of-wavethorn', 'releas-neb', 'Provided magical support.');
  `);

  console.log('Inserting event_places...');
  db.run(`INSERT OR IGNORE INTO event_places (event_id, place_id) VALUES
    ('coup-of-wavethorn', 'wavethorn');
  `);

  console.log('Inserting character_relationships...');
  db.run(`INSERT OR IGNORE INTO character_relationships (character_id, related_id, relationship_type) VALUES
    ('alann-barnett', 'releas-neb', 'ally'),
    ('alann-barnett', 'durchir', 'ally'),
    ('alann-barnett', 'cormac', 'ally'),
    ('releas-neb', 'durchir', 'ally'),
    ('releas-neb', 'cormac', 'ally'),
    ('durchir', 'cormac', 'ally');
  `);

  console.log('Inserting spell_spheres...');
  db.run(`INSERT OR IGNORE INTO spell_spheres (spell_id, sphere_id) VALUES
    ('fireball', 'war'),
    ('raise-dead', 'death');
  `);

  console.log('Inserting deity_spheres...');
  db.run(`INSERT OR IGNORE INTO deity_spheres (deity_id, sphere_id) VALUES
    ('achiel', 'war'),
    ('wyaris', 'war'),
    ('achiel', 'death');
  `);

  console.log('Inserting character_deities (patron relationships)...');
  db.run(`INSERT OR IGNORE INTO character_deities (character_id, deity_id) VALUES
    ('alann-barnett', 'achiel'),
    ('releas-neb', 'wyaris'),
    ('appolonia-palleday', 'idona'),
    ('durchir', 'ponat'),
    ('cormac', 'idona') -- Cormac is a trickster/illusionist, fits with moon/devotion themes
  `);

  console.log('Example data inserted.');
});

db.close();
