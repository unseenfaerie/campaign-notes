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
        await run(database, `INSERT INTO places (id, is_public, name, type, short_description)
            VALUES (?, 1, ?, 'city', ?)`, ['town', 'Town', 'A place.']);
        await run(database, `INSERT INTO places (id, is_public, name, type, short_description)
            VALUES (?, 1, ?, 'city', ?)`, ['child', 'District', 'A district.']);
        await run(database, `INSERT INTO place_containment (child_id, parent_id, visibility_direction)
            VALUES ('child', 'town', 'both')`);
        await run(database, `INSERT INTO events (id, is_public, name, short_description)
            VALUES ('first', 1, 'First Event', 'First.'), ('last', 1, 'Last Event', 'Last.')`);
        await run(database, `INSERT INTO event_sequence (earlier_id, later_id, visibility_direction)
            VALUES ('first', 'last', 'both')`);
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
        const wiki = path.join(directory, 'wiki');
        if (fs.existsSync(wiki)) fs.rmSync(wiki, { recursive: true });
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
        expect(html).toContain(`href="#${district}">District</a></strong> (Child; Bidirectional)`);
        expect(html).toContain(`href="#${town}">Town</a></strong> (Parent; Bidirectional)`);
        expect(html).toContain(`href="#${id('Event', 'last')}">Last Event</a></strong> (Next; Bidirectional)`);
        expect(html).toContain(`href="#${id('Event', 'first')}">First Event</a></strong> (Previous; Bidirectional)`);
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

    it('omits secret DM notes from rendered exports', async () => {
        const campaign = await loadCampaign(databasePath);
        campaign.entities.Character[0].secret_dm_notes = 'Players must never see this.';

        expect(createRenderer(campaign)).not.toContain('Players must never see this.');
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

    it('links the longest unambiguous mention without matching inside words', async () => {
        const campaign = await loadCampaign(databasePath);
        campaign.entities.Place.push(
            { id: 'the', name: 'The', short_description: 'A name.' },
            { id: 'the-town', name: 'The Town', short_description: 'A longer name.' },
            { id: 'kelvin', name: 'Kelvin', short_description: 'A name.' },
        );
        campaign.entities.Character[0].short_description = 'The Town; The; Township; Kelvin.';
        const pages = [...createRenderer(campaign, { multiPage: true })];
        const hero = pages.find((page) => page.content.includes('<h1>A &amp; B</h1>'));
        const the = pages.find((page) => page.content.includes('<h1>The</h1>'));
        const town = pages.find((page) => page.content.includes('<h1>The Town</h1>'));
        const kelvin = pages.find((page) => page.content.includes('<h1>Kelvin</h1>'));
        expect(hero.content).toContain(`<a href="${town.filename}">The Town</a>`);
        expect(hero.content).toContain(`<a href="${the.filename}">The</a>`);
        expect(hero.content).toContain('Township;');
        expect(hero.content).toContain(`<a href="${kelvin.filename}">Kelvin</a>`);
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

    it('renders connected wiki pages with safe relative links and campaign history', async () => {
        const campaign = await loadCampaign(databasePath);
        campaign.relations.CharacterPlace.push({
            character_id: 'missing', place_id: 'missing', arrived_date: '0300001003_age-of-light-default',
            short_description: 'Lost history', visibility_direction: 'both',
        });
        const pages = [...createRenderer(campaign, { multiPage: true })];
        const files = new Map(pages.map((page) => [page.filename, page.content]));
        expect(files.size).toBe(pages.length);
        expect(files.get('index.html')).toContain('category-characters-1.html');
        const hero = pages.find((page) => page.content.includes('<h1>A &amp; B</h1>'));
        const town = pages.find((page) => page.content.includes('<h1>Town</h1>'));
        const district = pages.find((page) => page.content.includes('<h1>District</h1>'));
        expect(hero.content).toContain(`href="${town.filename}">Town</a>`);
        expect(hero.content).toContain('Aliases:</strong> Hero');
        expect(hero.content).toContain('1 Vodardas, Year 1 AL');
        expect(hero.content).toContain('2 Vodardas, Year 1 AL');
        expect(hero.content).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
        expect(town.content).toContain(`href="${hero.filename}">A &amp; B</a>`);
        expect(town.content).toContain(`href="${district.filename}">District</a>`);
        expect(district.content).toContain(`href="${town.filename}">Town</a>`);
        expect(files.get('unresolved-1.html')).toContain('Lost history');
        const post = pages.find((page) => page.content.includes('<h1>News</h1>'));
        expect(post.content).toContain(`href="${hero.filename}">Hero</a>`);
        expect(post.content).toContain('Storyteller');
        for (const { content } of pages) {
            expect(content).not.toContain('<script>');
            for (const match of content.matchAll(/(?:href|src)="([^"]+)"/g)) {
                expect(match[1] === 'style.css' || files.has(match[1])).toBe(true);
            }
        }
    });

    it('paginates category indexes without duplicating or omitting entries', async () => {
        const campaign = await loadCampaign(databasePath);
        for (let index = 0; index < 201; index += 1) {
            campaign.entities.Character.push({
                id: `extra-${index}`, name: `Extra ${index}`, short_description: 'A traveler.',
            });
        }
        const pages = [...createRenderer(campaign, { multiPage: true })];
        const first = pages.find((page) => page.filename === 'category-characters-1.html').content;
        const second = pages.find((page) => page.filename === 'category-characters-2.html').content;
        expect(first).toContain('Page 1 of 2');
        expect(first).toContain('href="category-characters-2.html">Next');
        expect(second).toContain('href="category-characters-1.html">Previous');
        const entryLinks = (html) => [...html.matchAll(/href="(entry-[^"]+\.html)"/g)].map((match) => match[1]);
        const links = [...entryLinks(first), ...entryLinks(second)];
        expect(links).toHaveLength(203);
        expect(new Set(links).size).toBe(203);
    });

    it('writes a private wiki folder and refuses to overwrite an existing destination', () => {
        const script = path.join(__dirname, '../../scripts/exportCampaign.js');
        const wiki = path.join(directory, 'wiki');
        const execute = () => spawnSync(process.execPath, [script, '--wiki', wiki, databasePath], { encoding: 'utf8' });
        expect(execute().status).toBe(0);
        expect(fs.statSync(wiki).mode & 0o777).toBe(0o700);
        expect(fs.statSync(path.join(wiki, 'index.html')).mode & 0o777).toBe(0o600);
        expect(fs.existsSync(path.join(wiki, 'style.css'))).toBe(true);
        expect(execute().status).not.toBe(0);
        expect(fs.readFileSync(path.join(wiki, 'index.html'), 'utf8')).toContain('Campaign Notes');
    });
});
