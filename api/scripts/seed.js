// seed.js - Populate campaign.db with example data
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const { initializeDatabase } = require('../data/db');

const { seedUsers } = loadSeedUsersModule();

function loadSeedUsersModule() {
  try {
    return require('./seedUsers.local');
  } catch (error) {
    const isMissingLocalModule =
      error &&
      error.code === 'MODULE_NOT_FOUND' &&
      typeof error.message === 'string' &&
      error.message.includes('seedUsers.local');

    if (!isMissingLocalModule) {
      throw error;
    }

    return require('./seedUsers.defaults');
  }
}

const dbPath = path.join(__dirname, '../campaign.db');
const db = new sqlite3.Database(dbPath);

function runSql(label, sql, params = []) {
  return new Promise((resolve, reject) => {
    console.log(label);
    db.run(sql, params, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function closeDatabase() {
  return new Promise((resolve, reject) => {
    db.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function main() {
  await initializeDatabase(db);

  const nowIso = new Date().toISOString();
  await seedUsers({ bcrypt, nowIso, runSql });

  await runSql(`Inserting characters...`, `INSERT OR IGNORE INTO characters (id, player_character, name, age, ancestry, class, level, alignment, strength, dexterity, constitution, intelligence, wisdom, charisma, total_health, deceased, short_description, long_explanation) VALUES
    ('alann-barnett', true, 'Alann Barnett', 32, 'human', 'Cleric', '4', 'Neutral Good', 13, 8, 11, 10, 14, 11, 20, false, 'A thoughtful and strong-willed adventurer.', 'Long Explanation.'),
    ('releas-neb', true, 'Releas Neb', 28, 'human', 'Magic User', '7', 'Chaotic Good', 5, 14, 10, 18, 13, 9, 16, false, 'A clever and resourceful wizard.', 'Long Explanation.'),
    ('appolonia-palleday', true, 'Appolonia Palleday', 16, 'human', 'Magic User', '5', 'Neutral Good', 13, 8, 11, 18, 14, 11, 18, false, 'A bright and curious spellcaster.', 'Long Explanation.'),
    ('durchir', true, 'Durchir', 35, 'half-elf', 'Fighter/Enchanter', '2/Enchanter', 'Lawful Evil', 18, 10, 12, 15, 10, 11, 22, true, 'Durchir of the Angry Orchard, fallen hero.', 'Long Explanation.'),
    ('cormac', true, 'Cormac', 27, 'half-elf', 'Thief/Illusionist', '5/4', 'Chaotic Good', 9, 16, 7, 15, 14, 7, 15, false, 'A clever and nimble adventurer.', 'Long Explanation.'),
    ('bert-verinwort', false, 'Bert Verinwort', 54, 'human', NULL, NULL, 'Lawful Neutral', NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, 'A local notable in Wavethorn.', 'Long Explanation.'),
    ('sieg-ordoss', false, 'Sieg Ordoss', 57, 'human', NULL, NULL, 'Lawful Neutral', NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, 'A mysterious figure.', 'Long Explanation.'),
    ('gereg', false, 'Gereg', 41, 'human', 'Thief', '5', 'Neutral Evil', NULL, NULL, NULL, NULL, NULL, NULL, 20, false, 'A resident of Wavethorn.', 'Long Explanation.');
  `);

  await runSql(`Inserting user_character_anchors...`, `INSERT OR IGNORE INTO user_character_anchors (character_id, user_id, created_at) VALUES
    ('alann-barnett', 'alice', ?),
    ('releas-neb', 'keith', ?);
  `, [nowIso, nowIso]);

  await runSql(`Inserting deities...`, `INSERT OR IGNORE INTO deities (id, name, pantheon, alignment, short_description, long_explanation) VALUES
    ('achiel', 'Achiel', 'Main Human', 'Lawful Good', 'God of Light.', 'Long Explanation.'),
    ('idona', 'Idona', 'Main Human', 'Chaotic Good', 'Goddess of Humanity.', 'The patron goddess of and mother to Humankind. Her nurturing guidance shows us what we need to know to thrive. Those that worship Idona are numerous within the Othlorin. She is primarily worshipped as Achiels Wife, deserving of respect and credence. There are some women who have dedicated their lives to interpreting the messages of the moon as those are what Idona intends.'),
    ('ponat', 'Ponat', 'Main Human', 'Lawful Good', 'God of Fortress and protection.', 'Long Explanation.'),
    ('wyaris', 'Wyaris', 'Three Sister Goddesses', 'Chaotic Good', 'Lady of Swords.', 'Long Explanation.'),
    ('danaris', 'Danaris', 'Three Sister Goddesses', 'Chaotic Neutral', 'Lady of Death.', 'Long Explanation.'),
    ('vaharis', 'Vaharis', 'Three Sister Goddesses', 'Lawful Neutral', 'Lady of Judgement.', 'Long Explanation.'),
    ('sylrineth', 'Sylrineth', 'Ancient Elven', 'Chaotic Evil', 'Keeper of Forbidden Knowledge.', 'Syrineth is queen of the 666 layers of the abyss. There she hoards esoteric knowledge and hedonistic souls. Her many demons do her bidding.'),
    ('doh', 'Doh', 'Main Human', 'Lawful Neutral', 'God of Law.', 'Long Explanation.');
  `);

  await runSql(`Inserting events...`, `INSERT OR IGNORE INTO events (id, name, real_world_date, in_game_time, previous_event_id, next_event_id, short_description, long_explanation) VALUES
    ('coup-of-wavethorn', 'The Coup of Wavethorn', '2025-08-01', '0200200255_age-of-descent-default', NULL, 'night-of-spiders', 'Rel, Cormac, Alann, and Durchir arrive in Othlorin at the port city of Wavethorn and upend the local government.', 'Approximately 200 years after the fall of Vokdjinn... A new adventuring party takes shape. Rel, Durchir, Alann, and Cormac come to Othlorin from Gatûn. Some seek the riches that lie in the ruins of the old elven homeland. They settle into Wavethorn, a merchant''s city on the edge of the sea. Before long, they are suspected of murder. Their confidant Bert Verinwort is later framed for a demonic ritual murder of several prominent figures in town, including his uncle Phil Verinwort. After being kidnapped by Wyvernfang bandits, the party understands the conspiracy to remove political threats to those that the Wyvernfang have installed on the council. Brae Novan and Daniel Hillstop are connected to the gang. After gathering evidence against these parties, the party clears a nearby dungeon of Wyvernfang and uses a massive amount of money they found to bankroll a coup of the government. The coup succeeds and a new, more balanced, three-council-oligarchy is implemented by Bert. This endeavor was made possible by an underground crime lord named Gereg. Due to his involvement, the party was obliged to put him into power on the Mercantile council. Brae and Daniel escaped execution by fleeing the town before the new regime was enacted.'),
    ('night-of-spiders', 'The Night of Spiders', '2025-08-02', '0200200279_age-of-descent-default', 'coup-of-wavethorn', NULL, 'Rel, Cormac, Alann, and Durchir track down a bounty for the Adventurer''s Guild and uncover sinsiter evil.', 'Rel, Cormac, Alann, and Durchir join the Adventurer''s Guild! Their first quest is to bring three purported outlaws to justice. These women have been seen impersonating Winged Blades of Wyaris and harassing Ponat worshippers. The party tracks down the individuals and brings them to jail in Wavethorn. After doing this, they hear word that other adventurers from the guild is in trouble in the ruins of Aranil. Naturally they investigate. Upon entering, the party is subjected to a horrifying spider illusion dungeon. Walls of spiders with a horrifying human form flowing through them chase the party down endless halls. After finding and slaying a witch in a crimson robe, they save the weakened other party. They return to Wavethorn to find out that the trial of the three that they had captured was an absolute bloodbath. Every single person in the courtroom was killed. Seeking these three once again the party heads to some coastal caves. They find a strange and magical experimentation lab set up. The place is abandoned, save for a man composed of spiders. As Durchir strikes this man with his sword, he disintegrates part by part into tiny spiders and crawls apart.');
  `);

  await runSql(`Inserting items...`, `INSERT OR IGNORE INTO items (id, name, short_description, long_explanation) VALUES
    ('cormacs-spellbook', 'Cormac''s Spellbook', 'The first spellbook belonging to Cormac.', 'Long Explanation.'),
    ('rels-spellbook', 'Rel''s Spellbook', 'The first spellbook belonging to Releas.', 'Rel was afforded the best spells his mentor could afford to show him, as Rel was his most promising (and most morally evolved) of his students.'),
    ('narisse-amulet', 'Nar''isse Amulet', 'A green glass chunk fastened to a leather neck strap by thin copper wire.', 'Expending a charge allows the user to completely blend in to natural settings if they remain completely still. 3 charges remain.'),
    ('pollys-spellbook', 'Polly''s Spellbook', 'The first spellbook belonging to Polly.', 'This spellbook is a relic of a mysterious order of mages.');
  `);

  await runSql(`Inserting organizations...`, `INSERT OR IGNORE INTO organizations (id, name, type, short_description, long_explanation) VALUES
    ('church-of-achiels-light', 'Church of Achiel''s Light', 'religion', 'The main church of Achiel.', 'Long Explanation.'),
    ('order-of-the-iron-duch', 'The Order of the Iron Düch', 'adventuring party', 'A party of heroes.', 'Long Explanation.'),
    ('wyvernfang', 'Wyvernfang', 'adventuring party', 'A group based in Wavethorn.', 'Long Explanation.'),
    ('three-sisters', 'The Three Sisters', 'pantheon', 'The Three Sister Goddesses.', 'Long Explanation.'),
    ('main-human-pantheon', 'The Main Human Pantheon', 'pantheon', 'The primary deities worshipped by humans.', 'Long Explanation.'),
    ('ancient-elven-pantheon', 'The Ancient Elven Pantheon', 'pantheon', 'The primary deities worshipped by the ancient elves.', 'Long Explanation.'),
    ('adventurers-guild', 'The Adventurer''s Guild', 'guild', 'A guild for adventurers in Novafell and Wavethorn.', 'Long Explanation.');
  `);

  await runSql(`Inserting places...`, `INSERT OR IGNORE INTO places (id, name, type, parent_id, short_description, long_explanation) VALUES
    ('the-world', 'The World', 'planet', NULL, 'The world of mists.', 'Long Explanation.'),
    ('otlorin', 'Othlorin', 'continent', 'the-world', 'The old land of the elves, now a rapidly burgeoning human territory.', 'Long Explanation.'),
    ('wavethorn', 'Wavethorn', 'city-state', 'othlorin', 'A city-state on the coast.', 'Long Explanation.'),
    ('itholis', 'Itholis', 'country', 'othlorin', 'The largest country in Othlorin, composed of 6 Counties.', 'Long Explanation.'),
    ('weinmere', 'Weinmere', 'region', 'itholis', 'A county in Itholis. Ruled over by Count Jirakby', 'Long Explanation.'),
    ('anash', 'Anash', 'city', 'weinmere', 'A city in the Weinmere.', 'Long Explanation.');
  `);

  await runSql(`Inserting spells...`, `INSERT OR IGNORE INTO spells (id, type, name, level, school, casting_time, range, components, materials, duration, description) VALUES
    ('fireball', 'arcane', 'Fireball', 3, 'Evocation', '1 action', '150 feet', 'V,S,M', 'Bat guano.','Instantaneous', 'A bright streak flashes to a point you choose.'),
    ('raise-dead', 'divine', 'Raise Dead', 5, NULL, '1 hour', 'Touch', 'V, S, M', 'Mummy wrappings, some kind of salve.', 'Instantaneous', 'Return a dead creature to life.'),
    ('lightning-bolt', 'arcane', 'Lightning Bolt', 3, 'Evocation', '1 action', '100 feet', 'V,S,M', 'A small bit of fulgurite.', 'Instantaneous', 'A stroke of lightning forming a line 100 feet long and 5 feet wide blasts out from you.'),
    ('healing-word', 'divine', 'Healing Word', 1, NULL, '1 bonus action', '60 feet', NULL, NULL, 'Instantaneous', 'A creature of your choice that you can see within range regains hit points.'),
    ('mage-hand', 'arcane', 'Mage Hand', 0, 'Conjuration', '1 action', '30 feet', 'V,S', NULL, '1 minute', 'A spectral hand appears and can manipulate objects.'),
    ('audible-glamer', 'arcane', 'Audible Glamer', 1, 'Illusion', '1 action', '30 feet', 'V,S', NULL, '1 minute', 'Creates a sound that can be heard up to 100 feet away.'),
    ('change-self', 'arcane', 'Change Self', 1, 'Illusion', '1 action', 'Self', 'V,S', NULL, '1 hour', 'You assume a different form.'),
    ('magic-missile', 'arcane', 'Magic Missile', 1, 'Evocation', '1 action', '120 feet', 'V,S', NULL, 'Instantaneous', 'Creates three glowing darts of magical force. 1d4+1 damage per bolt.');
  `);

  await runSql(`Inserting spheres...`, `INSERT OR IGNORE INTO spheres (id, name, short_description) VALUES
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

  // // Join Tables

  await runSql(`Inserting character_deities...`, `INSERT OR IGNORE INTO character_deities (character_id, deity_id, adopted_date, dissolution_date, relationship_type, short_description, long_explanation) VALUES
    ('alann-barnett', 'achiel', '0200200001_age-of-descent-default', '', 'patron', 'Short description.', 'Long Explanation.'),
    ('alann-barnett', 'doh', '0200200001_age-of-descent-default', '', 'patron', 'Short description.', 'Long Explanation.'),
    ('releas-neb', 'wyaris', '0200200001_age-of-descent-default', '0200200336_age-of-descent-default', 'patron', 'Short description.', 'Long Explanation.'),
    ('releas-neb', 'achiel', '0200200336_age-of-descent-default', '', 'patron', 'Converted to worshipping Achiel.', 'Long Explanation.'),
    ('appolonia-palleday', 'idona', '0200200001_age-of-descent-default', '', 'patron', 'Short description.', 'Long Explanation.'),
    ('durchir', 'ponat', '0200200001_age-of-descent-default', '', 'patron', 'Short description.', 'Long Explanation.'),
    ('cormac', 'idona', '0200200001_age-of-descent-default', '', 'patron', 'Short description.', 'Long Explanation.');
  `);

  await runSql(`Inserting character_items...`, `INSERT OR IGNORE INTO character_items (character_id, item_id, acquired_date, relinquished_date, short_description) VALUES
    ('releas-neb', 'rel-s-spellbook', '0200195034_age-of-descent-default', '0200200062_age-of-descent-default', 'Gained from his reclusive master in GatUn, then stolen by ruffians in Wavethorn.'),
    ('releas-neb', 'rel-s-spellbook', '0200200122_age-of-descent-default', '', 'Recovered from street ruffians.'),
    ('apollonia-palleday', 'polly-s-spellbook', '0200200189_age-of-descent-default', '', 'Received from her betrothed, Alaric Evermoon.'),
    ('cormac', 'cormac-s-spellbook', '0200195152_age-of-descent-default', '', 'Received from his master.');
  `);

  await runSql(`Inserting character_organizations...`, `INSERT OR IGNORE INTO character_organizations (character_id, organization_id, joined_date, left_date, short_description, long_explanation) VALUES
    ('alann-barnett', 'adventurers-guild', '0200200001_age-of-descent-default', '0200200336_age-of-descent-default', 'Joined the Adventurers Guild to protect Wavethorn, left after the Night of Spiders.', 'Long Explanation.'),
    ('alann-barnett', 'adventurers-guild', '0200201001_age-of-descent-default', '', 'Rejoined due to pressure from the party.', 'Long Explanation.'),
    ('releas-neb', 'adventurers-guild', '0200200029_age-of-descent-default', '', 'Became a member of the Adventurers Guild.', 'Long Explanation.'),
    ('durchir', 'adventurers-guild', '0200200057_age-of-descent-default', '', 'Allied with the Adventurers Guild for information.', 'Long Explanation.'),
    ('cormac', 'adventurers-guild', '0200200085_age-of-descent-default', '', 'Sworn to protect the realm as a knight.', 'Long Explanation.');
  `);

  await runSql(`Inserting character_places...`, `INSERT OR IGNORE INTO character_places (character_id, place_id, arrived_date, left_date, short_description, long_explanation) VALUES
    ('alann-barnett', 'wavethorn', '0200200001_age-of-descent-default', '0200200336_age-of-descent-default', 'Hometown and primary setting for early adventures.', 'Long Explanation.'),
    ('releas-neb', 'gatun', '0200200029_age-of-descent-default', '0200200057_age-of-descent-default', 'Met his mentor here.', 'Long Explanation.'),
    ('durchir', 'wavethorn', '0200200057_age-of-descent-default', '0200200085_age-of-descent-default', 'Frequent visitor due to guild activities.', 'Long Explanation.'),
    ('cormac', 'wavethorn', '0200200085_age-of-descent-default', '0200200113_age-of-descent-default', 'Sworn to protect the town.', 'Long Explanation.');
  `);

  await runSql(`Inserting character_relationships...`, `INSERT OR IGNORE INTO character_relationships (character_id, related_id, established_date, dissolution_date, relationship_type, short_description, long_explanation) VALUES
    ('alann-barnett', 'releas-neb', '0200200001_age-of-descent-default', '0200200336_age-of-descent-default', 'ally', 'Short description.', 'Long Explanation.'),
    ('alann-barnett', 'durchir', '0200200001_age-of-descent-default', '0200200336_age-of-descent-default', 'ally', 'Short description.', 'Long Explanation.'),
    ('alann-barnett', 'cormac', '0200200001_age-of-descent-default', '0200200336_age-of-descent-default', 'ally', 'Short description.', 'Long Explanation.'),
    ('releas-neb', 'durchir', '0200200001_age-of-descent-default', '0200200336_age-of-descent-default', 'ally', 'Short description.', 'Long Explanation.'),
    ('releas-neb', 'cormac', '0200200001_age-of-descent-default', '0200200336_age-of-descent-default', 'ally', 'Short description.', 'Long Explanation.'),
    ('releas-neb', 'alann-barnett', '0200200001_age-of-descent-default', '0200200336_age-of-descent-default', 'ally', 'Short description.', 'Long Explanation.'),
    ('durchir', 'cormac', '0200200001_age-of-descent-default', '0200200336_age-of-descent-default', 'ally', 'Short description.', 'Long Explanation.'),
    ('durchir', 'releas-neb', '0200200001_age-of-descent-default', '0200200336_age-of-descent-default', 'ally', 'Short description.', 'Long Explanation.'),
    ('durchir', 'alann-barnett', '0200200001_age-of-descent-default', '0200200336_age-of-descent-default', 'ally', 'Short description.', 'Long Explanation.'),
    ('cormac', 'durchir', '0200200001_age-of-descent-default', '0200200336_age-of-descent-default', 'ally', 'Short description.', 'Long Explanation.'),
    ('cormac', 'releas-neb', '0200200001_age-of-descent-default', '0200200336_age-of-descent-default', 'ally', 'Short description.', 'Long Explanation.'),
    ('cormac', 'alann-barnett', '0200200001_age-of-descent-default', '0200200336_age-of-descent-default', 'ally', 'Short description.', 'Long Explanation.');
  `);

  await runSql(`Inserting deity_spheres...`, `INSERT OR IGNORE INTO deity_spheres (deity_id, sphere_id) VALUES
    ('achiel', 'healing'),
    ('achiel', 'creation'),
    ('wyaris', 'combat'),
    ('danaris', 'death');
  `);

  await runSql(`Inserting event_characters...`, `INSERT OR IGNORE INTO event_characters (event_id, character_id, short_description, long_explanation) VALUES
    ('coup-of-wavethorn', 'alann-barnett', 'Short description.', 'Long Explanation.'),
    ('coup-of-wavethorn', 'releas-neb', 'Short description.', 'Long Explanation.');
  `);

  await runSql(`Inserting event_deities...`, `INSERT OR IGNORE INTO event_deities (event_id, deity_id, short_description, long_explanation) VALUES
    ('coup-of-wavethorn', 'achiel', 'Short description.', 'Long Explanation.'),
    ('coup-of-wavethorn', 'wyaris', 'Short description.', 'Long Explanation.');
  `);

  await runSql(`Inserting event_items...`, `INSERT OR IGNORE INTO event_items (event_id, item_id, short_description, long_explanation) VALUES
    ('coup-of-wavethorn', 'rel-s-spellbook', 'Short description.', 'Long Explanation.'),
    ('coup-of-wavethorn', 'cormac-s-spellbook', 'Short description.', 'Long Explanation.');
  `);

  await runSql(`Inserting event_organizations...`, `INSERT OR IGNORE INTO event_organizations (event_id, organization_id, short_description, long_explanation) VALUES
    ('coup-of-wavethorn', 'wavethorn-guard', 'Short description.', 'Long Explanation.'),
    ('coup-of-wavethorn', 'mages-guild', 'Short description.', 'Long Explanation.');
  `);

  await runSql(`Inserting event_places...`, `INSERT OR IGNORE INTO event_places (event_id, place_id, short_description, long_explanation) VALUES
    ('coup-of-wavethorn', 'wavethorn', 'Short description.', 'Long Explanation.');
  `);

  await runSql(`Inserting organization_places...`, `INSERT OR IGNORE INTO organization_places (organization_id, place_id, short_description, long_explanation) VALUES
    ('adventurers-guild', 'wavethorn', 'Short description.', 'Long Explanation.'),
    ('wyvernfang', 'wavethorn', 'Short description.', 'Long Explanation.');
  `);

  await runSql(`Inserting item_spells...`, `INSERT OR IGNORE INTO item_spells (item_id, spell_id) VALUES
    ('rel-s-spellbook', 'fireball'),
    ('rel-s-spellbook', 'magic-missile'),
    ('cormac-s-spellbook', 'change-self'),
    ('cormac-s-spellbook', 'audible-glamer');
  `);

  await runSql(`Inserting spell_spheres...`, `INSERT OR IGNORE INTO spell_spheres (spell_id, sphere_id) VALUES
    ('raise-dead', 'necromantic'),
    ('healing-word', 'healing');
  `);

  await runSql(`Inserting aliases...`, `INSERT OR IGNORE INTO aliases (entity_type, entity_id, alias) VALUES
    ('character', 'alann-barnett', 'Alann'),
    ('character', 'releas-neb', 'Rel'),
    ('deity', 'achiel', 'Achiel, God of Light'),
    ('place', 'wavethorn', 'City of Wavethorn'),
    ('event', 'coup-of-wavethorn', 'OOTID Session 1');
  `);

  console.log('Example data inserted.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await closeDatabase();
    } catch (error) {
      console.error('Failed to close database:', error.message);
      process.exitCode = 1;
    }
  });
