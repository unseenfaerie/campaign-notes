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

  await runSql(`Inserting characters...`, `INSERT OR IGNORE INTO characters (id, player_character, is_public, name, birthdate, ancestry, class, level, alignment, strength, dexterity, constitution, intelligence, wisdom, charisma, max_health, retired, deceased, short_description, long_explanation) VALUES
    ('alann-barnett', true, false, 'Alann Barnett', '0200190001_age-of-descent-default', 'human', 'Cleric', '4', 'neutral-good', 13, 8, 11, 10, 14, 11, 20, false, false, 'A lawful and strong-willed adventurer.', 'Alann found purpose in his deity, the god of law, Doh. He was known to be a bit of a hardass, but was extremely charitable.'),
    ('releas-neb', true, false, 'Releas Neb', '0200194001_age-of-descent-default', 'human', 'Magic User', '7', 'chaotic-good', 5, 14, 10, 18, 13, 9, 16, false, false, 'A clever and resourceful wizard.', 'Rel came to Wavethorn with bright optimism in his heart. He fights for justice at every turn.'),
    ('orlaith-of-the-mosswood', true, false, 'Orlaith of the Mosswood', '0200197001_age-of-descent-default', 'human', 'Druid', '1', 'chaotic-neutral', 12, 15, 11, 9, 15, 9, 2, false, false, 'A burgeoning druid with knowledge of herbs.', 'Orlaith was orphaned at a young age and was taken in by Mildred of the Mosswood in Lundgren. They are proficient in herbalism, singing, and hunting. They also can fix wagons and carts since they interned at the repair shop as a youth.'),
    ('djinn', true, false, 'Djinn Rat-Eater', '0200195001_age-of-descent-default', 'human', 'Assassin', '2', 'neutral-evil', 8, 18, 10, 4, 15, 10, 5, false, false, 'A deceptive and quick assassin.', 'Djinn traveled extremely far to be in Othlorin, leaving a hard and traumatic life back in Skrazdagh. He fell in with a criminal gang in Wavethorn who now act as his family.'),
    ('apollonia-palleday', true, false, 'Apollonia Palleday', '0200198001_age-of-descent-default', 'human', 'Magic User', '5', 'neutral-good', 13, 8, 11, 18, 14, 11, 18, false, false, 'A bright and curious spellcaster.', NULL),
    ('durchir', true, false, 'Durchir', '0200187001_age-of-descent-default', 'half-elf', 'Fighter', '2', 'lawful-evil', 18, 10, 12, 15, 10, 11, 22, false, true, 'Durchir of the Angry Orchard, fallen hero.', NULL),
    ('cormac', true, false, 'Cormac', '0200193001_age-of-descent-default', 'half-elf', 'Thief/Illusionist', '5/4', 'chaotic-good', 9, 16, 7, 15, 14, 7, 15, false, false, 'A clever and nimble adventurer.', NULL),
    ('bert-verinwort', false, false, 'Bert Verinwort', '0200166001_age-of-descent-default', 'human', NULL, NULL, 'lawful-neutral', NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, 'A local notable in Wavethorn.', NULL),
    ('sieg-ordoss', false, false, 'Sieg Ordoss', '0200163001_age-of-descent-default', 'human', NULL, NULL, 'lawful-neutral', NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, true, 'A mysterious figure.', NULL),
    ('mildred-of-the-mosswood', false, false, 'Mildred of the Mosswood', '0200133001_age-of-descent-default', 'human', 'Druid', NULL, 'neutral-good', NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, 'A wise old druid and herbal healer who lives in Lundgren.', NULL),
    ('gereg', false, false, 'Gereg', '0200179001_age-of-descent-default', 'human', 'Thief', '5', 'neutral-evil', NULL, NULL, NULL, NULL, NULL, NULL, 20, false, false, 'A resident of Wavethorn.', NULL);
  `);

  await runSql(`Normalizing seeded character alignments...`, `UPDATE characters SET alignment = lower(replace(alignment, ' ', '-')) WHERE alignment IS NOT NULL;`);

  await runSql(`Inserting user_character_anchors...`, `INSERT OR IGNORE INTO user_character_anchors (character_id, user_id, created_at) VALUES
    ('alann-barnett', 'alice', ?),
    ('orlaith-of-the-mosswood', 'rosie', ?),
    ('djinn', 'sadhi', ?),
    ('apollonia-palleday', 'sadhi', ?),
    ('releas-neb', 'keith', ?);
  `, [nowIso, nowIso, nowIso, nowIso, nowIso]);

  await runSql(`Inserting deities...`, `INSERT OR IGNORE INTO deities (id, is_public, name, alignment, short_description, long_explanation) VALUES
    ('achiel', true, 'Achiel', 'lawful-good', 'God of Light.', NULL),
    ('idona', true, 'Idona', 'chaotic-good', 'Goddess of Humanity.', 'The patron goddess of and mother to Humankind. Her nurturing guidance shows us what we need to know to thrive. Those that worship Idona are numerous within the Othlorin. She is primarily worshipped as Achiels Wife, deserving of respect and credence. There are some women who have dedicated their lives to interpreting the messages of the moon as those are what Idona intends.'),
    ('ponat', true, 'Ponat', 'lawful-good', 'God of fortress and protection.', NULL),
    ('wyaris', false, 'Wyaris', 'chaotic-good', 'Lady of Swords.', NULL),
    ('danaris', false, 'Danaris', 'chaotic-neutral', 'Lady of Death.', NULL),
    ('vaharis', false, 'Vaharis', 'lawful-neutral', 'Lady of Judgement.', NULL),
    ('sylrineth', false, 'Sylrineth', 'chaotic-evil', 'Keeper of Forbidden Knowledge.', 'Syrineth is queen of the 666 layers of the abyss. There she hoards esoteric knowledge and hedonistic souls. Her many demons do her bidding.'),
    ('doh', true, 'Doh', 'lawful-neutral', 'God of Law.', NULL);
  `);

  await runSql(`Normalizing seeded deity alignments...`, `UPDATE deities SET alignment = lower(replace(alignment, ' ', '-')) WHERE alignment IS NOT NULL;`);

  await runSql(`Inserting events...`, `INSERT OR IGNORE INTO events (id, is_public, name, real_world_date, in_game_time_start, in_game_time_end, previous_event_id, next_event_id, short_description, long_explanation) VALUES
    ('coup-of-wavethorn', false, 'The Coup of Wavethorn', '2025-08-01', '0200200255_age-of-descent-default', '0200200260_age-of-descent-default', NULL, 'night-of-spiders', 'Rel, Cormac, Alann, and Durchir arrive in Othlorin at the port city of Wavethorn and upend the local government.', 'Approximately 200 years after the fall of Vokdjinn... A new adventuring party takes shape. Rel, Durchir, Alann, and Cormac come to Othlorin from Gatûn. Some seek the riches that lie in the ruins of the old elven homeland. They settle into Wavethorn, a merchant''s city on the edge of the sea. Before long, they are suspected of murder. Their confidant Bert Verinwort is later framed for a demonic ritual murder of several prominent figures in town, including his uncle Phil Verinwort. After being kidnapped by Wyvernfang bandits, the party understands the conspiracy to remove political threats to those that the Wyvernfang have installed on the council. Brae Novan and Daniel Hillstop are connected to the gang. After gathering evidence against these parties, the party clears a nearby dungeon of Wyvernfang and uses a massive amount of money they found to bankroll a coup of the government. The coup succeeds and a new, more balanced, three-council-oligarchy is implemented by Bert. This endeavor was made possible by an underground crime lord named Gereg. Due to his involvement, the party was obliged to put him into power on the Mercantile council. Brae and Daniel escaped execution by fleeing the town before the new regime was enacted.'),
    ('night-of-spiders', false, 'The Night of Spiders', '2025-08-02', '0200200279_age-of-descent-default', '0200200282_age-of-descent-default', 'coup-of-wavethorn', NULL, 'Rel, Cormac, Alann, and Durchir track down a bounty for the Adventurer''s Guild and uncover sinsiter evil.', 'Rel, Cormac, Alann, and Durchir join the Adventurer''s Guild! Their first quest is to bring three purported outlaws to justice. These women have been seen impersonating Winged Blades of Wyaris and harassing Ponat worshippers. The party tracks down the individuals and brings them to jail in Wavethorn. After doing this, they hear word that other adventurers from the guild is in trouble in the ruins of Aranil. Naturally they investigate. Upon entering, the party is subjected to a horrifying spider illusion dungeon. Walls of spiders with a horrifying human form flowing through them chase the party down endless halls. After finding and slaying a witch in a crimson robe, they save the weakened other party. They return to Wavethorn to find out that the trial of the three that they had captured was an absolute bloodbath. Every single person in the courtroom was killed. Seeking these three once again the party heads to some coastal caves. They find a strange and magical experimentation lab set up. The place is abandoned, save for a man composed of spiders. As Durchir strikes this man with his sword, he disintegrates part by part into tiny spiders and crawls apart.');
  `);

  await runSql(`Inserting items...`, `INSERT OR IGNORE INTO items (id, is_public, name, short_description, long_explanation) VALUES
    ('cormacs-spellbook', false, 'Cormac''s Spellbook', 'The first spellbook belonging to Cormac.', NULL),
    ('rels-spellbook', false, 'Rel''s Spellbook', 'The first spellbook belonging to Releas.', 'Rel was afforded the best spells his mentor could afford to show him, as Rel was his most promising (and most morally evolved) of his students.'),
    ('narisse-amulet', false, 'Nar''isse Amulet', 'A green glass chunk fastened to a leather neck strap by thin copper wire.', 'Expending a charge allows the user to completely blend in to natural settings if they remain completely still. 3 charges remain.'),
    ('pollys-spellbook', false, 'Polly''s Spellbook', 'The first spellbook belonging to Polly.', 'This spellbook is a relic of a mysterious order of mages.');
  `);

  await runSql(`Inserting organizations...`, `INSERT OR IGNORE INTO organizations (id, is_public, name, type, short_description, long_explanation) VALUES
    ('church-of-achiels-light', true, 'Church of Achiel''s Light', 'religious', 'The main church of Achiel.', NULL),
    ('order-of-the-iron-duch', false, 'The Order of the Iron Düch', 'adventuring-party', 'A party of heroes.', NULL),
    ('orphans-of-lundgren', false, 'The Orphans of Lundgren', 'adventuring-party', 'A duo of misfits helping the citizens of Lundgren.', NULL),
    ('wyvernfang', false, 'Wyvernfang', 'gang', 'A bandit group based around Wavethorn.', NULL),
    ('three-sisters', false, 'The Three Sisters', 'pantheon', 'The Three Sister Goddesses.', NULL),
    ('achielan-pantheon', true, 'Achielan Pantheon', 'pantheon', 'The primary deities worshipped by humans.', NULL),
    ('ancient-elven-pantheon', false, 'The Ancient Elven Pantheon', 'pantheon', 'The primary deities worshipped by the ancient elves.', NULL),
    ('adventurers-guild', false, 'The Adventurer''s Guild', 'guild', 'A guild for adventurers in Novafell and Wavethorn.', NULL);
  `);

  await runSql(`Inserting places...`, `INSERT OR IGNORE INTO places (id, is_public, name, type, parent_id, short_description, establishments, long_explanation) VALUES
    ('the-universe', false, 'The Universe', 'universe', NULL, 'Everything in existence.', NULL, NULL),
    ('material-plane', false, 'The Material Plane', 'plane', 'the-universe', 'The plane of standard physical existence.', NULL, NULL),
    ('the-world', true, 'The World', 'planet', 'material-plane', 'The world of mists.', NULL, NULL),
    ('othlorin', true, 'Othlorin', 'continent', 'the-world', 'The old land of the elves, now a rapidly burgeoning human territory.', NULL, NULL),
    ('wavethorn', true, 'Wavethorn', 'city-state', 'othlorin', 'A city-state on the coast.', NULL, NULL),
    ('itholis', true, 'Itholis', 'country', 'othlorin', 'The largest country in Othlorin, composed of 6 Counties.', NULL, NULL),
    ('weinmere', true, 'Weinmere', 'region', 'itholis', 'A county in Itholis. Ruled over by Count Jirakby', NULL, NULL),
    ('tempusfen', true, 'Tempusfen', 'region', 'itholis', 'A former county in Itholis. Composed of swamps and misty forests.', NULL, NULL),
    ('anash', false, 'Anash', 'city', 'weinmere', 'A city in the Weinmere.', NULL, NULL),
    ('lundgren', false, 'Lundgren', 'town', 'tempusfen', 'A quiet logging town settled on the edge of the Misty Marsh.', '*The Sneaking Squirrel*\nRun by Angeline and Martin Acorn, this is the only inn Lundgren has to offer.', NULL);
  `);

  await runSql(`Inserting spells...`, `INSERT OR IGNORE INTO spells (id, is_public, type, name, level, school, casting_time, range, components, materials, duration, description) VALUES
    ('fireball', true, 'arcane', 'Fireball', 3, 'Evocation', '1 action', '150 feet', 'V,S,M', 'Bat guano.','Instantaneous', 'A bright streak flashes to a point you choose.'),
    ('raise-dead', true, 'divine', 'Raise Dead', 5, NULL, '1 hour', 'Touch', 'V, S, M', 'Mummy wrappings, some kind of salve.', 'Instantaneous', 'Return a dead creature to life.'),
    ('lightning-bolt', true, 'arcane', 'Lightning Bolt', 3, 'Evocation', '1 action', '100 feet', 'V,S,M', 'A small bit of fulgurite.', 'Instantaneous', 'A stroke of lightning forming a line 100 feet long and 5 feet wide blasts out from you.'),
    ('healing-word', true, 'divine', 'Healing Word', 1, NULL, '1 bonus action', '60 feet', NULL, NULL, 'Instantaneous', 'A creature of your choice that you can see within range regains hit points.'),
    ('mage-hand', true, 'arcane', 'Mage Hand', 0, 'Conjuration', '1 action', '30 feet', 'V,S', NULL, '1 minute', 'A spectral hand appears and can manipulate objects.'),
    ('audible-glamer', true, 'arcane', 'Audible Glamer', 1, 'Illusion', '1 action', '30 feet', 'V,S', NULL, '1 minute', 'Creates a sound that can be heard up to 100 feet away.'),
    ('change-self', true, 'arcane', 'Change Self', 1, 'Illusion', '1 action', 'Self', 'V,S', NULL, '1 hour', 'You assume a different form.'),
    ('magic-missile', true, 'arcane', 'Magic Missile', 1, 'Evocation', '1 action', '120 feet', 'V,S', NULL, 'Instantaneous', 'Creates three glowing darts of magical force. 1d4+1 damage per bolt.');
  `);

  await runSql(`Inserting spheres...`, `INSERT OR IGNORE INTO spheres (id, is_public, name, short_description) VALUES
    ('all-sphere', true, 'All Sphere', 'Sphere of All.'),
    ('animal-sphere', true, 'Animal Sphere', 'Sphere of Animal.'),
    ('astral-sphere', true, 'Astral Sphere', 'Sphere of Astral.'),
    ('charm-sphere', true, 'Charm Sphere', 'Sphere of Charm.'),
    ('combat-sphere', true, 'Combat Sphere', 'Sphere of Combat.'),
    ('creation-sphere', true, 'Creation Sphere', 'Sphere of Creation.'),
    ('divination-sphere', true, 'Divination Sphere', 'Sphere of Divination.'),
    ('elemental-sphere', true, 'Elemental Sphere', 'Sphere of Elemental.'),
    ('guardian-sphere', true, 'Guardian Sphere', 'Sphere of Guardian.'),
    ('healing-sphere', true, 'Healing Sphere', 'Sphere of Healing.'),
    ('necromantic-sphere', true, 'Necromantic Sphere', 'Sphere of Necromantic.'),
    ('plant-sphere', true, 'Plant Sphere', 'Sphere of Plant.'),
    ('protection-sphere', true, 'Protection Sphere', 'Sphere of Protection.'),
    ('summoning-sphere', true, 'Summoning Sphere', 'Sphere of Summoning.'),
    ('sun-sphere', true, 'Sun Sphere', 'Sphere of Sun.'),
    ('weather-sphere', true, 'Weather Sphere', 'Sphere of Weather.');
  `);

  await runSql(`Inserting aliases...`, `INSERT OR IGNORE INTO aliases (is_public, entity_type, entity_id, alias) VALUES
    (false, 'character', 'alann-barnett', 'Alann'),
    (false, 'character', 'releas-neb', 'Rel'),
    (false, 'deity', 'achiel', 'Achiel, God of Light'),
    (false, 'place', 'wavethorn', 'City of Wavethorn'),
    (false, 'character', 'djinn', 'Djinn');
  `);

  // // Join Tables

  await runSql(`Inserting character_deities...`, `INSERT OR IGNORE INTO character_deities (character_id, deity_id, adopted_date, dissolution_date, relationship_type, short_description, long_explanation) VALUES
    ('alann-barnett', 'achiel', '0200200001_age-of-descent-default', '', 'patron', 'Short description.', NULL),
    ('alann-barnett', 'doh', '0200200001_age-of-descent-default', '', 'patron', 'Short description.', NULL),
    ('releas-neb', 'wyaris', '0200200001_age-of-descent-default', '0200200336_age-of-descent-default', 'patron', 'Short description.', NULL),
    ('releas-neb', 'achiel', '0200200336_age-of-descent-default', '', 'patron', 'Converted to worshipping Achiel.', NULL),
    ('appolonia-palleday', 'idona', '0200200001_age-of-descent-default', '', 'patron', 'Short description.', NULL),
    ('durchir', 'ponat', '0200200001_age-of-descent-default', '', 'patron', 'Short description.', NULL),
    ('cormac', 'idona', '0200200001_age-of-descent-default', '', 'patron', 'Short description.', NULL);
  `);

  await runSql(`Inserting character_items...`, `INSERT OR IGNORE INTO character_items (character_id, item_id, acquired_date, relinquished_date, short_description) VALUES
    ('releas-neb', 'rels-spellbook', '0200195034_age-of-descent-default', '0200200062_age-of-descent-default', 'Gained from his reclusive master in GatUn, then stolen by ruffians in Wavethorn.'),
    ('releas-neb', 'rels-spellbook', '0200200122_age-of-descent-default', NULL, 'Recovered from street ruffians.'),
    ('apollonia-palleday', 'pollys-spellbook', '0200200189_age-of-descent-default', NULL, 'Received from her betrothed, Alaric Evermoon.'),
    ('cormac', 'cormacs-spellbook', '0200195152_age-of-descent-default', NULL, 'Received from his master.');
  `);

  await runSql(`Inserting character_organizations...`, `INSERT OR IGNORE INTO character_organizations (character_id, organization_id, joined_date, left_date, short_description, long_explanation) VALUES
    ('alann-barnett', 'adventurers-guild', '0200200001_age-of-descent-default', '0200200336_age-of-descent-default', 'Joined the Adventurers Guild to protect Wavethorn, left after the Night of Spiders.', NULL),
    ('alann-barnett', 'adventurers-guild', '0200201001_age-of-descent-default', '', 'Rejoined due to pressure from the party.', NULL),
    ('releas-neb', 'adventurers-guild', '0200200029_age-of-descent-default', '', 'Became a member of the Adventurers Guild.', NULL),
    ('durchir', 'adventurers-guild', '0200200057_age-of-descent-default', '', 'Allied with the Adventurers Guild for information.', NULL),
    ('orlaith-of-the-mosswood', 'orphans-of-lundgren', '0300006018_age-of-light-default', '', 'Formed the Orphans of Lundgren with Djinn.', NULL),
    ('djinn', 'orphans-of-lundgren', '0300006018_age-of-light-default', '', 'Formed the Orphans of Lundgren with Orlaith.', NULL),
    ('cormac', 'adventurers-guild', '0200200085_age-of-descent-default', '', 'Sworn to protect the realm as a knight.', NULL);
  `);

  await runSql(`Inserting character_places...`, `INSERT OR IGNORE INTO character_places (character_id, place_id, arrived_date, left_date, short_description, long_explanation) VALUES
    ('alann-barnett', 'wavethorn', '0200200001_age-of-descent-default', '0200200336_age-of-descent-default', 'Hometown and primary setting for early adventures.', NULL),
    ('releas-neb', 'gatun', '0200200029_age-of-descent-default', '0200200057_age-of-descent-default', 'Met his mentor here.', NULL),
    ('durchir', 'wavethorn', '0200200057_age-of-descent-default', '0200200085_age-of-descent-default', 'Frequent visitor due to guild activities.', NULL),
    ('cormac', 'wavethorn', '0200200085_age-of-descent-default', '0200200113_age-of-descent-default', 'Sworn to protect the town.', NULL);
  `);

  await runSql(`Inserting character_relationships...`, `INSERT OR IGNORE INTO character_relationships (character_id, related_id, established_date, dissolution_date, relationship_type, short_description, long_explanation) VALUES
    ('alann-barnett', 'releas-neb', '0200200001_age-of-descent-default', '0200200336_age-of-descent-default', 'friend', 'Short description.', NULL),
    ('alann-barnett', 'durchir', '0200200001_age-of-descent-default', '0200200336_age-of-descent-default', 'associate', 'Short description.', NULL),
    ('alann-barnett', 'cormac', '0200200001_age-of-descent-default', '0200200336_age-of-descent-default', 'friend', 'Short description.', NULL),
    ('releas-neb', 'durchir', '0200200001_age-of-descent-default', '0200200336_age-of-descent-default', 'associate', 'Short description.', NULL),
    ('releas-neb', 'cormac', '0200200001_age-of-descent-default', '0200200336_age-of-descent-default', 'friend', 'Short description.', NULL),
    ('releas-neb', 'alann-barnett', '0200200001_age-of-descent-default', '0200200336_age-of-descent-default', 'friend', 'Short description.', NULL),
    ('durchir', 'cormac', '0200200001_age-of-descent-default', '0200200336_age-of-descent-default', 'associate', 'Short description.', NULL),
    ('durchir', 'releas-neb', '0200200001_age-of-descent-default', '0200200336_age-of-descent-default', 'associate', 'Short description.', NULL),
    ('durchir', 'alann-barnett', '0200200001_age-of-descent-default', '0200200336_age-of-descent-default', 'associate', 'Short description.', NULL),
    ('cormac', 'durchir', '0200200001_age-of-descent-default', '0200200336_age-of-descent-default', 'associate', 'Short description.', NULL),
    ('cormac', 'releas-neb', '0200200001_age-of-descent-default', '0200200336_age-of-descent-default', 'friend', 'Short description.', NULL),
    ('orlaith-of-the-mosswood', 'mildred-of-the-mosswood', '0200191257_age-of-descent-default', NULL, 'mentor', 'Orlaith was taken in by Mildred as a baby.', NULL),
    ('mildred-of-the-mosswood', 'orlaith-of-the-mosswood', '0200191257_age-of-descent-default', NULL, 'student', 'Mildred adopted Orlaith and trained them in Druidic ways.', NULL),
    ('cormac', 'alann-barnett', '0200200001_age-of-descent-default', '0200200336_age-of-descent-default', 'friend', 'Short description.', NULL);
  `);

  await runSql(`Inserting deity_spheres...`, `INSERT OR IGNORE INTO deity_spheres (deity_id, sphere_id) VALUES
    ('achiel', 'healing-sphere'),
    ('achiel', 'creation-sphere'),
    ('wyaris', 'combat-sphere');
  `);

  await runSql(`Inserting deity_organizations...`, `INSERT OR IGNORE INTO deity_organizations (deity_id, organization_id) VALUES
    ('achiel', 'achielan-pantheon'),
    ('sylrineth', 'ancient-elven-pantheon'),
    ('idona', 'achielan-pantheon'),
    ('wyaris', 'three-sisters'),
    ('danaris', 'three-sisters'),
    ('vaharis', 'three-sisters'),
    ('ponat', 'achielan-pantheon');
  `);

  await runSql(`Inserting event_characters...`, `INSERT OR IGNORE INTO event_characters (event_id, character_id, short_description, long_explanation) VALUES
    ('coup-of-wavethorn', 'alann-barnett', 'Short description.', NULL),
    ('coup-of-wavethorn', 'releas-neb', 'Short description.', NULL);
  `);

  await runSql(`Inserting event_organizations...`, `INSERT OR IGNORE INTO event_organizations (event_id, organization_id, short_description, long_explanation) VALUES
    ('coup-of-wavethorn', 'wavethorn-guard', 'Short description.', NULL),
    ('coup-of-wavethorn', 'mages-guild', 'Short description.', NULL);
  `);

  await runSql(`Inserting event_places...`, `INSERT OR IGNORE INTO event_places (event_id, place_id) VALUES
    ('coup-of-wavethorn', 'wavethorn');
  `);

  await runSql(`Inserting organization_places...`, `INSERT OR IGNORE INTO organization_places (organization_id, place_id, short_description, long_explanation) VALUES
    ('adventurers-guild', 'wavethorn', 'Short description.', NULL),
    ('wyvernfang', 'wavethorn', 'Short description.', NULL);
  `);

  await runSql(`Inserting item_spells...`, `INSERT OR IGNORE INTO item_spells (item_id, spell_id) VALUES
    ('rels-spellbook', 'fireball'),
    ('rels-spellbook', 'magic-missile'),
    ('cormacs-spellbook', 'change-self'),
    ('cormacs-spellbook', 'audible-glamer');
  `);

  await runSql(`Inserting spell_spheres...`, `INSERT OR IGNORE INTO spell_spheres (spell_id, sphere_id) VALUES
    ('raise-dead', 'necromantic'),
    ('healing-word', 'healing');
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
