// seed.js - Populate campaign.db with example data
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../campaign.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  console.log('Inserting characters...');
  db.run(`INSERT OR IGNORE INTO characters (id, type, name, class, level, alignment, strength, dexterity, constitution, intelligence, wisdom, charisma, total_health, deceased, short_description, long_explanation) VALUES
    ('alann-barnett', 'pc', 'Alann Barnett', 'Cleric', '4', 'Neutral Good', 13, 8, 11, 10, 14, 11, 20, 0, 'A thoughtful and strong-willed adventurer.', 'Long Explanation.'),
    ('releas-neb', 'pc', 'Releas Neb', 'Magic User', '7', 'Chaotic Good', 5, 14, 10, 18, 13, 9, 16, 0, 'A clever and resourceful wizard.', 'Long Explanation.'),
    ('appolonia-palleday', 'pc', 'Appolonia Palleday', 'Magic User', '5', 'Neutral Good', 13, 8, 11, 18, 14, 11, 18, 0, 'A bright and curious spellcaster.', 'Long Explanation.'),
    ('durchir', 'pc', 'Durchir', 'Fighter/Enchanter', '2/Enchanter', 'Lawful Evil', 18, 10, 12, 15, 10, 11, 22, 1, 'Durchir of the Angry Orchard, fallen hero.', 'Long Explanation.'),
    ('cormac', 'pc', 'Cormac', 'Thief/Illusionist', '5/4', 'Chaotic Good', 9, 16, 7, 15, 14, 7, 15, 0, 'A clever and nimble adventurer.', 'Long Explanation.'),
    ('bert-verinwort', 'npc', 'Bert Verinwort', NULL, NULL, 'Lawful Neutral', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'A local notable in Wavethorn.', 'Long Explanation.'),
    ('sieg-ordoss', 'npc', 'Sieg Ordoss', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'A mysterious figure.', 'Long Explanation.'),
    ('gereg', 'npc', 'Gereg', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'A resident of Wavethorn.', 'Long Explanation.'),
    ('leo', 'npc', 'Leo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'A resident of Wavethorn.', 'Long Explanation.');
  `);

  console.log('Inserting deities...');
  db.run(`INSERT OR IGNORE INTO deities (id, name, pantheon, alignment, short_description, long_explanation) VALUES
    ('achiel', 'Achiel', 'Main Human', 'Lawful Good', 'God of Light.', 'Long Explanation.'),
    ('idona', 'Idona', 'Main Human', 'Chaotic Good', 'Goddess of Humanity, the Moon, and devotion.', 'Long Explanation.'),
    ('ponat', 'Ponat', 'Main Human', 'Lawful Good', 'God of Fortress and protection.', 'Long Explanation.'),
    ('wyaris', 'Wyaris', 'Three Sister Goddesses', 'Chaotic Good', 'Lady of Swords.', 'Long Explanation.'),
    ('danaris', 'Danaris', 'Three Sister Goddesses', 'Chaotic Neutral', 'Lady of Death.', 'Long Explanation.'),
    ('vaharis', 'Vaharis', 'Three Sister Goddesses', 'Lawful Neutral', 'Lady of Judgement.', 'Long Explanation.'),
    ('doh', 'Doh', 'Main Human', 'Lawful Neutral', 'God of Law.', 'Long Explanation.');
  `);

  console.log('Inserting organizations...');
  db.run(`INSERT OR IGNORE INTO organizations (id, name, type, short_description, long_explanation) VALUES
    ('church-of-achiels-light', 'Church of Achiel''s Light', 'religion', 'The main church of Achiel.', 'Long Explanation.'),
    ('order-of-the-iron-duch', 'The Order of the Iron Düch', 'adventuring party', 'A party of heroes.', 'Long Explanation.'),
    ('wyvernfang', 'Wyvernfang', 'adventuring party', 'A group based in Wavethorn.', 'Long Explanation.'),
    ('three-sisters', 'The Three Sisters', 'pantheon', 'The Three Sister Goddesses.', 'Long Explanation.'),
    ('adventurers-guild', 'The Adventurer''s Guild', 'guild', 'A guild for adventurers in Novafell and Wavethorn.', 'Long Explanation.')
  `);

  console.log('Inserting places...');
  db.run(`INSERT OR IGNORE INTO places (id, name, type, parent_id, short_description, long_explanation) VALUES
    ('the-world', 'The World', 'planet', NULL, 'The world of mists.', 'Long Explanation.'),
    ('otlorin', 'Othlorin', 'continent', 'the-world', 'The old land of the elves, now a rapidly burgeoning human territory.', 'Long Explanation.'),
    ('wavethorn', 'Wavethorn', 'city-state', 'othlorin', 'A city-state on the coast.', 'Long Explanation.'),
    ('itholis', 'Itholis', 'country', 'othlorin', 'The largest country in Othlorin, composed of 6 Counties.', 'Long Explanation.'),
    ('weinmere', 'Weinmere', 'region', 'itholis', 'A county in Itholis. Ruled over by Count Jirakby', 'Long Explanation.'),
    ('anash', 'Anash', 'city', 'weinmere', 'A city in the Weinmere.', 'Long Explanation.')
  `);

  console.log('Inserting items...');
  db.run(`INSERT OR IGNORE INTO items (id, name, short_description, long_explanation) VALUES
    ('cormac-s-spellbook', 'Cormac''s Spellbook', 'The first spellbook belonging to Cormac.', 'Long Explanation.'),
    ('rel-s-spellbook', 'Rel''s Spellbook', 'The first spellbook belonging to Releas.', 'Gained through training under his mentor. He gave Rel the best spells he could afford to show him, as Rel was his most promising (and most morally evolved) of his students.'),
    ('polly-s-spellbook', 'Polly''s Spellbook', 'The first spellbook belonging to Polly.', 'This spellbook is a relic of a mysterious order of mages.');
  `);

  console.log('Inserting events...');
  db.run(`INSERT OR IGNORE INTO events (id, name, real_world_date, in_game_time, previous_event_id, next_event_id, short_description, long_explanation) VALUES
    ('coup-of-wavethorn', 'The Coup of Wavethorn', '2025-08-01', 'OMAR 1', NULL, 'night-of-spiders', 'Rel, Cormac, Alann, and Durchir arrive in Othlorin at the port city of Wavethorn and upend the local government.', 'Approximately 200 years after the fall of Vokdjinn... A new adventuring party takes shape. Rel, Durchir, Alann, and Cormac come to Othlorin from Gatûn. Some seek the riches that lie in the ruins of the old elven homeland. They settle into Wavethorn, a merchant''s city on the edge of the sea. Before long, they are suspected of murder. Their confidant Bert Verinwort is later framed for a demonic ritual murder of several prominent figures in town, including his uncle Phil Verinwort. After being kidnapped by Wyvernfang bandits, the party understands the conspiracy to remove political threats to those that the Wyvernfang have installed on the council. Brae Novan and Daniel Hillstop are connected to the gang. After gathering evidence against these parties, the party clears a nearby dungeon of Wyvernfang and uses a massive amount of money they found to bankroll a coup of the government. The coup succeeds and a new, more balanced, three-council-oligarchy is implemented by Bert. This endeavor was made possible by an underground crime lord named Gereg. Due to his involvement, the party was obliged to put him into power on the Mercantile council. Brae and Daniel escaped execution by fleeing the town before the new regime was enacted.'),
    ('night-of-spiders', 'The Night of Spiders', '2025-08-02', 'OMAR 2', 'coup-of-wavethorn', NULL, 'Rel, Cormac, Alann, and Durchir track down a bounty for the Adventurer''s Guild and uncover sinsiter evil.', 'Rel, Cormac, Alann, and Durchir join the Adventurer''s Guild! Their first quest is to bring three purported outlaws to justice. These women have been seen impersonating Winged Blades of Wyaris and harassing Ponat worshippers. The party tracks down the individuals and brings them to jail in Wavethorn. After doing this, they hear word that other adventurers from the guild is in trouble in the ruins of Aranil. Naturally they investigate. Upon entering, the party is subjected to a horrifying spider illusion dungeon. Walls of spiders with a horrifying human form flowing through them chase the party down endless halls. After finding and slaying a witch in a crimson robe, they save the weakened other party. They return to Wavethorn to find out that the trial of the three that they had captured was an absolute bloodbath. Every single person in the courtroom was killed. Seeking these three once again the party heads to some coastal caves. They find a strange and magical experimentation lab set up. The place is abandoned, save for a man composed of spiders. As Durchir strikes this man with his sword, he disintegrates part by part into tiny spiders and crawls apart.');
  `);

  console.log('Inserting spheres...');
  db.run(`INSERT OR IGNORE INTO spheres (id, name, description) VALUES
    ('all', 'All', 'Sphere of All.'),
    ('animal', 'Animal', 'Sphere of Animal.'),
    ('astral', 'Astral', 'Sphere of Astral.'),
    ('charm', 'Charm', 'Sphere of Charm.'),
    ('combat', 'Combat', 'Sphere of Combat.'),
    ('creation', 'Creation', 'Sphere of Creation.'),
    ('divination', 'Divination', 'Sphere of Divination.'),
    ('elemental', 'Elemental', 'Sphere of Elemental.'),
    ('guardian', 'Guardian', 'Sphere of Guardian.'),
    ('healing', 'Healing', 'Sphere of Healing.'),
    ('necromantic', 'Necromantic', 'Sphere of Necromantic.'),
    ('plant', 'Plant', 'Sphere of Plant.'),
    ('protection', 'Protection', 'Sphere of Protection.'),
    ('summoning', 'Summoning', 'Sphere of Summoning.'),
    ('sun', 'Sun', 'Sphere of Sun.'),
    ('weather', 'Weather', 'Sphere of Weather.');
  `);

  console.log('Inserting spells...');
  db.run(`INSERT OR IGNORE INTO spells (id, type, name, level, school, sphere, casting_time, range, components, duration, description) VALUES
    ('fireball', 'arcane', 'Fireball', 3, 'Evocation', 'elemental', '1 action', '150 feet', 'V,S,M', 'Instantaneous', 'A bright streak flashes to a point you choose.'),
    ('raise-dead', 'divine', 'Raise Dead', 5, NULL, 'necromantic', '1 hour', 'Touch', NULL, 'Instantaneous', 'Return a dead creature to life.'),
    ('lightning-bolt', 'arcane', 'Lightning Bolt', 3, 'Evocation', 'elemental', '1 action', '100 feet', 'V,S,M', 'Instantaneous', 'A stroke of lightning forming a line 100 feet long and 5 feet wide blasts out from you.'),
    ('healing-word', 'divine', 'Healing Word', 1, NULL, 'healing', '1 bonus action', '60 feet', NULL, 'Instantaneous', 'A creature of your choice that you can see within range regains hit points.'),
    ('mage-hand', 'arcane', 'Mage Hand', 0, 'Conjuration', '', '1 action', '30 feet', 'V,S', '1 minute', 'A spectral hand appears and can manipulate objects.'),
    ('audible-glamer', 'arcane', 'Audible Glamer', 1, 'Illusion', '', '1 action', '30 feet', 'V,S', '1 minute', 'Creates a sound that can be heard up to 100 feet away.'),
    ('change-self', 'arcane', 'Change Self', 1, 'Illusion', '', '1 action', 'Self', 'V,S', '1 hour', 'You assume a different form.'),
    ('magic-missile', 'arcane', 'Magic Missile', 1, 'Evocation', '', '1 action', '120 feet', 'V,S', 'Instantaneous', 'Creates three glowing darts of magical force. 1d4+1 damage per bolt.');
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
  db.run(`INSERT OR IGNORE INTO event_characters (event_id, character_id, short_description, long_explanation) VALUES
    ('coup-of-wavethorn', 'alann-barnett', 'Short description.', 'Long Explanation.'),
    ('coup-of-wavethorn', 'releas-neb', 'Short description.', 'Long Explanation.');
  `);

  console.log('Inserting event_places...');
  db.run(`INSERT OR IGNORE INTO event_places (event_id, place_id, short_description, long_explanation) VALUES
    ('coup-of-wavethorn', 'wavethorn', 'Short description.', 'Long Explanation.');
  `);

  console.log('Inserting character_items...');
  db.run(`INSERT OR IGNORE INTO character_items (character_id, item_id, acquired_date, relinquished_date, short_description) VALUES
    ('releas-neb', 'rel-s-spellbook', 'feb-6-195', '', 'Gained from his reclusive master in GatUn.'),
    ('cormac', 'cormac-s-spellbook', 'jun-12-195', '', 'Recieved from his master.');
  `);

  console.log('Inserting character_relationships...');
  db.run(`INSERT OR IGNORE INTO character_relationships (character_id, related_id, relationship_type, short_description, long_explanation) VALUES
    ('alann-barnett', 'releas-neb', 'ally', 'Short description.', 'Long Explanation.'),
    ('alann-barnett', 'durchir', 'ally', 'Short description.', 'Long Explanation.'),
    ('alann-barnett', 'cormac', 'ally', 'Short description.', 'Long Explanation.'),
    ('releas-neb', 'durchir', 'ally', 'Short description.', 'Long Explanation.'),
    ('releas-neb', 'cormac', 'ally', 'Short description.', 'Long Explanation.'),
    ('durchir', 'cormac', 'ally', 'Short description.', 'Long Explanation.');
  `);

  console.log('Inserting spell_spheres...');
  db.run(`INSERT OR IGNORE INTO spell_spheres (spell_id, sphere_id) VALUES
    ('fireball', 'war'),
    ('raise-dead', 'death');
  `);

  console.log('Inserting item_spells...');
  db.run(`INSERT OR IGNORE INTO item_spells (item_id, spell_id) VALUES
    ('rel-s-spellbook', 'fireball'),
    ('rel-s-spellbook', 'magic-missile'),
    ('cormac-s-spellbook', 'change-self'),
    ('cormac-s-spellbook', 'audible-glamer');
  `);

  console.log('Inserting deity_spheres...');
  db.run(`INSERT OR IGNORE INTO deity_spheres (deity_id, sphere_id) VALUES
    ('achiel', 'healing'),
    ('achiel', 'creation'),
    ('wyaris', 'combat'),
    ('danaris', 'death');
  `);

  console.log('Inserting character_deities...');
  db.run(`INSERT OR IGNORE INTO character_deities (character_id, deity_id, short_description, long_explanation) VALUES
    ('alann-barnett', 'achiel', 'Short description.', 'Long Explanation.'),
    ('alann-barnett', 'doh', 'Short description.', 'Long Explanation.'),
    ('releas-neb', 'wyaris', 'Short description.', 'Long Explanation.'),
    ('appolonia-palleday', 'idona', 'Short description.', 'Long Explanation.'),
    ('durchir', 'ponat', 'Short description.', 'Long Explanation.'),
    ('cormac', 'idona', 'Short description.', 'Long Explanation.');
  `);

  console.log('Example data inserted.');
});

db.close();
