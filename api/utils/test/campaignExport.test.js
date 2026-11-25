const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const sqlite3 = require('sqlite3');
const { domainManifest } = require('../../../common/domainManifest');
const { buildAllCreateTableSql } = require('../../data/schemaBuilder');
const { loadCampaign, createRenderer } = require('../campaignExport');

function run(database, sql, params = []) {
    return new Promise((resolve, reject) => {
        database.run(sql, params, (error) => (error ? reject(error) : resolve()));
    });
}

function close(database) {
    return new Promise((resolve, reject) => {
        database.close((error) => (error ? reject(error) : resolve()));
    });
}

function id(entity, value) {
    return `entity-${Buffer.from(JSON.stringify([entity, value])).toString('base64url')}`;
}

describe('offline campaign export', () => {
    let directory;
    let databasePath;
    let outputPath;

    beforeEach(async () => {
        directory = fs.mkdtempSync(path.join(os.tmpdir(), 'campaign-export-'));
        databasePath = path.join(directory, 'campaign.db');
        outputPath = path.join(directory, 'export.html');
        const database = new sqlite3.Database(databasePath);
        for (const statement of buildAllCreateTableSql()) await run(database, statement);
        await run(database, 'CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY)');
        await run(database, 'INSERT INTO schema_migrations VALUES (?)', [domainManifest.schemaVersion]);
        await run(database, 'CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT)');
        await run(database, "INSERT INTO users VALUES ('author', 'Storyteller')");
        await run(database, 'CREATE TABLE posts (id INTEGER PRIMARY KEY, title TEXT, body TEXT, created_at TEXT, created_by TEXT)');
        await run(database, `INSERT INTO characters (id, player_character, is_public, name, deceased, short_description)
            VALUES (?, 1, 0, ?, 0, ?)`, ['hero', 'A & B', 'Visits Town <script>alert(1)</script>.']);
        await run(database, `INSERT INTO characters (id, player_character, is_public, name, deceased, short_description)
            VALUES (?, 0, 1, ?, 0, ?)`, ['second', 'Another', 'A hero.']);
        await run(database, `INSERT INTO places (id, is_public, name, type, parent_id, short_description)
            VALUES (?, 1, ?, 'city', ?, ?)`, ['town', 'Town', null, 'A place.']);
        await run(database, `INSERT INTO places (id, is_public, name, type, parent_id, short_description)
            VALUES (?, 1, ?, 'city', ?, ?)`, ['child', 'District', 'town', 'A district.']);
        await run(database, `INSERT INTO aliases (entity_type, entity_id, alias, is_public)
            VALUES ('character', 'hero', 'Hero', 0)`);
        await run(database, `INSERT INTO character_places
            (character_id, place_id, arrived_date, short_description, visibility_direction)
            VALUES (?, ?, ?, ?, ?)`, ['hero', 'town', '0300001001_age-of-light-default', 'Hero arrived.', 'first_to_second']);
        await run(database, `INSERT INTO character_places
            (character_id, place_id, arrived_date, short_description, visibility_direction)
            VALUES (?, ?, ?, ?, ?)`, ['hero', 'town', '0300001002_age-of-light-default', 'Returned.', 'both']);
        await run(database, `INSERT INTO posts VALUES (1, ?, ?, ?, 'author')`,
            ['News', 'Hero visits Town.', '2026-01-01T00:00:00Z']);
        await close(database);
    });

    afterEach(() => {
        for (const filename of ['campaign.db', 'export.html', 'missing.html']) {
            const target = path.join(directory, filename);
            if (fs.existsSync(target)) fs.unlinkSync(target);
        }
        fs.rmdirSync(directory);
    });

    it('renders all campaign content with safe links, references, aliases and relation history', async () => {
        const html = createRenderer(await loadCampaign(databasePath));
        const hero = id('Character', 'hero');
        const town = id('Place', 'town');
        const district = id('Place', 'child');
        expect(html).toContain(`id="${hero}"`);
        expect(html).toContain(`href="#${town}">Town</a>`);
        expect(html).toContain(`href="#${hero}">Hero</a>`);
        expect(html).toContain(`href="#${district}">District</a> (Parent Id)`);
        expect(html).toContain('Aliases:</strong> Hero');
        expect(html).toContain('1 Vodardas, Year 1 AL');
        expect(html).toContain('2 Vodardas, Year 1 AL');
        expect(html).toContain('Outgoing');
        expect(html).toContain('Incoming');
        expect(html).toContain('Bidirectional');
        expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
        expect(html).not.toContain('<script>');
        expect(html).toContain('<h3>News</h3>');
        expect(html).toContain('by Storyteller');
        expect(html).not.toContain('last_edited_by');
        const anchors = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
        expect(new Set(anchors).size).toBe(anchors.length);
        for (const match of html.matchAll(/href="#([^"]+)"/g)) expect(anchors).toContain(match[1]);
    });

    it('does not link ambiguous names and preserves dangling records', async () => {
        const campaign = await loadCampaign(databasePath);
        campaign.entities.Alias.push({ id: 2, entity_type: 'character', entity_id: 'second', alias: 'Hero' });
        campaign.relations.CharacterPlace[0].place_id = 'missing';
        campaign.relations.CharacterPlace[1].place_id = 'missing';
        campaign.relations.CharacterPlace[1].character_id = 'also-missing';
        campaign.entities.Alias.push({ id: 3, entity_type: 'character', entity_id: 'missing', alias: 'Lost alias' });
        const html = createRenderer(campaign);
        expect(html).toContain('<p class="prose">Hero visits ');
        expect(html).toContain('Missing Place (missing)');
        expect(html).toContain('Hero arrived.');
        expect(html).toContain('CharacterPlace: missing Character (also-missing) and missing Place (missing)');
        expect(html).toContain('Returned.');
        expect(html).toContain('Alias Lost alias: missing character (missing)');
    });

    it('creates a private file, refuses overwrites and never creates a missing database', () => {
        const script = path.join(__dirname, '../../scripts/exportCampaign.js');
        const execute = (output, database) => spawnSync(process.execPath, [script, output, database], { encoding: 'utf8' });
        const result = execute(outputPath, databasePath);
        expect(result.status).toBe(0);
        expect(fs.statSync(outputPath).mode & 0o777).toBe(0o600);
        expect(fs.readFileSync(outputPath, 'utf8')).toContain('Offline DM snapshot');
        expect(execute(outputPath, databasePath).status).not.toBe(0);
        const missingDatabase = path.join(directory, 'missing.db');
        expect(execute(path.join(directory, 'missing.html'), missingDatabase).status).not.toBe(0);
        expect(fs.existsSync(missingDatabase)).toBe(false);
    });

    it('rejects a database with an incompatible schema', async () => {
        const database = new sqlite3.Database(databasePath);
        await run(database, 'UPDATE schema_migrations SET version = 1');
        await close(database);
        await expect(loadCampaign(databasePath)).rejects.toThrow('does not match expected version');
    });
});
