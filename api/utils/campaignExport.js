const sqlite3 = require('sqlite3');
const { createHash } = require('crypto');
const { domainManifest } = require('../../common/domainManifest');
const { formatLoreDate, isValidLoreDate } = require('../../common/dateSystem');

function openDatabase(path) {
    return new Promise((resolve, reject) => {
        const database = new sqlite3.Database(path, sqlite3.OPEN_READONLY, (error) => {
            if (error) reject(error);
            else resolve(database);
        });
    });
}

function run(database, sql) {
    return new Promise((resolve, reject) => {
        database.run(sql, (error) => (error ? reject(error) : resolve()));
    });
}

function all(database, sql) {
    return new Promise((resolve, reject) => {
        database.all(sql, (error, rows) => (error ? reject(error) : resolve(rows)));
    });
}

function close(database) {
    return new Promise((resolve, reject) => {
        database.close((error) => (error ? reject(error) : resolve()));
    });
}

async function loadCampaign(databasePath) {
    const database = await openDatabase(databasePath);
    try {
        await run(database, 'BEGIN');
        const versions = await all(database, 'SELECT version FROM schema_migrations ORDER BY version');
        const currentVersion = versions.length ? versions[versions.length - 1].version : 0;
        if (currentVersion !== domainManifest.schemaVersion) {
            throw new Error(`Database schema version ${currentVersion} does not match expected version ${domainManifest.schemaVersion}`);
        }

        const entities = {};
        for (const [name, definition] of Object.entries(domainManifest.entities)) {
            entities[name] = await all(database, `SELECT * FROM "${definition.table}"`);
        }
        const relations = {};
        for (const [name, definition] of Object.entries(domainManifest.relations)) {
            relations[name] = await all(database, `SELECT * FROM "${definition.table}"`);
        }
        const posts = await all(database, `SELECT posts.id, posts.title, posts.body, posts.created_at,
            users.username AS author_username FROM posts LEFT JOIN users ON users.id = posts.created_by
            ORDER BY posts.created_at DESC, posts.id DESC`);
        await run(database, 'COMMIT');
        return { entities, relations, posts };
    } finally {
        await close(database);
    }
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character]);
}

function anchor(entityName, id) {
    return `entity-${Buffer.from(JSON.stringify([entityName, String(id)])).toString('base64url')}`;
}

function label(value) {
    return value.split('_').filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function createRenderer(campaign, { multiPage = false } = {}) {
    const entities = new Map();
    const aliases = new Map();
    const unresolved = [];
    for (const [name, definition] of Object.entries(domainManifest.entities)) {
        if (name === 'Alias') continue;
        for (const row of campaign.entities[name]) {
            const key = anchor(name, row[definition.idField]);
            entities.set(key, { name, definition, row, key });
        }
    }
    for (const alias of campaign.entities.Alias) {
        const name = Object.keys(domainManifest.entities)
            .find((candidate) => candidate !== 'Alias' && candidate.toLowerCase() === String(alias.entity_type).toLowerCase());
        const key = name && anchor(name, alias.entity_id);
        if (!key || !entities.has(key)) {
            unresolved.push(`<li>Alias ${escapeHtml(alias.alias)}: missing ${escapeHtml(alias.entity_type)} (${escapeHtml(alias.entity_id)})</li>`);
            continue;
        }
        if (!aliases.has(key)) aliases.set(key, []);
        aliases.get(key).push(alias.alias);
    }

    const candidates = new Map();
    for (const entity of entities.values()) {
        for (const text of [entity.row.name, ...(aliases.get(entity.key) || [])]) {
            if (typeof text !== 'string' || !text.trim()) continue;
            const normalized = text.trim().toLocaleLowerCase();
            if (!candidates.has(normalized)) candidates.set(normalized, { text: text.trim(), keys: new Set() });
            candidates.get(normalized).keys.add(entity.key);
        }
    }
    const mentionsByInitial = new Map();
    const mentionsByWord = new Map();
    const fallbackMentions = new Map();
    const mergedMentions = new Map();
    const contextSensitiveCase = /^(tr|az|lt)(-|$)/i.test(Intl.DateTimeFormat().resolvedOptions().locale);
    function firstAsciiWord(text) {
        const match = /^[A-Za-z0-9_]+(?=$|[^\p{L}\p{N}_])/u.exec(text);
        if (match && contextSensitiveCase && /i/i.test(match[0])) return null;
        return match ? match[0].toLocaleLowerCase() : null;
    }
    for (const candidate of [...candidates.values()].sort((a, b) => b.text.length - a.text.length)) {
        candidate.normalized = candidate.text.toLocaleLowerCase();
        const initial = candidate.text[0].toLocaleLowerCase();
        if (!mentionsByInitial.has(initial)) mentionsByInitial.set(initial, []);
        mentionsByInitial.get(initial).push(candidate);
        const word = firstAsciiWord(candidate.text);
        const groups = word ? mentionsByWord : fallbackMentions;
        const key = word || initial;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(candidate);
    }

    function matchingCandidates(text, index) {
        if (!isBoundary(text[index - 1])) return [];
        const initial = text[index].toLocaleLowerCase();
        if (!mentionsByInitial.has(initial)) return [];
        const word = firstAsciiWord(text.slice(index));
        if (!word) return mentionsByInitial.get(initial) || [];
        const exact = mentionsByWord.get(word);
        const fallback = fallbackMentions.get(initial);
        if (!exact) return fallback || [];
        if (!fallback) return exact;
        if (!mergedMentions.has(word)) {
            mergedMentions.set(word, [...exact, ...fallback].sort((a, b) => b.text.length - a.text.length));
        }
        return mergedMentions.get(word);
    }

    function entityFile(entity) {
        return `entry-${createHash('sha256').update(entity.key).digest('hex')}.html`;
    }

    function link(entity, text = entity.row.name) {
        const destination = multiPage ? entityFile(entity) : `#${entity.key}`;
        return `<a href="${destination}">${escapeHtml(text)}</a>`;
    }

    function isBoundary(character) {
        return character === undefined || !/[\p{L}\p{N}_]/u.test(character);
    }

    const proseCache = new Map();
    function prose(value) {
        const text = String(value);
        if (proseCache.has(text)) return proseCache.get(text);
        let output = '';
        let index = 0;
        while (index < text.length) {
            const match = matchingCandidates(text, index).find((candidate) =>
                text.slice(index, index + candidate.text.length).toLocaleLowerCase() === candidate.normalized &&
                isBoundary(text[index + candidate.text.length])
            );
            if (match) {
                const part = text.slice(index, index + match.text.length);
                const key = match.keys.size === 1 ? match.keys.values().next().value : null;
                output += key ? link(entities.get(key), part) : escapeHtml(part);
                index += match.text.length;
            } else {
                output += escapeHtml(text[index]);
                index += 1;
            }
        }
        proseCache.set(text, output);
        return output;
    }

    function fieldValue(value, field) {
        if (field.ref) {
            const target = entities.get(anchor(field.ref, value));
            return target ? link(target) : `${escapeHtml(value)} (missing ${escapeHtml(field.ref)})`;
        }
        if (field.type === 'boolean') return value ? 'Yes' : 'No';
        if (field.type === 'loreDate' && isValidLoreDate(value)) return escapeHtml(formatLoreDate(value));
        return field.expository ? prose(value) : escapeHtml(value);
    }

    function fields(row, definitions) {
        const entries = Object.entries(definitions)
            .filter(([name, field]) => !field.primary && !field.hidden && name !== 'name' && row[name] !== null && row[name] !== undefined && row[name] !== '');
        if (!entries.length) return '';
        return `<dl>${entries.map(([name, field]) =>
            `<dt>${escapeHtml(label(name))}</dt><dd>${fieldValue(row[name], field)}</dd>`
        ).join('')}</dl>`;
    }

    const connections = new Map();
    function addConnection(key, html) {
        if (!connections.has(key)) connections.set(key, []);
        connections.get(key).push(html);
    }
    for (const [name, definition] of Object.entries(domainManifest.relations)) {
        for (const row of campaign.relations[name]) {
            const members = definition.members.map((member) => entities.get(anchor(member.entity, row[member.key])));
            if (!['first_to_second', 'second_to_first', 'both'].includes(row.visibility_direction)) {
                throw new Error(`Relation ${name} has an invalid visibility direction`);
            }
            const payload = { ...definition.payload };
            delete payload.visibility_direction;
            if (members.every((member) => !member)) {
                const missing = definition.members.map((member) =>
                    `missing ${escapeHtml(member.entity)} (${escapeHtml(row[member.key])})`
                ).join(' and ');
                unresolved.push(`<li>${escapeHtml(name)}: ${missing} (${escapeHtml(row.visibility_direction)})${fields(row, payload)}</li>`);
                continue;
            }
            for (const index of [0, 1]) {
                if (!members[index]) continue;
                if (index === 1 && members[0] && members[0].key === members[1].key) continue;
                const direction = row.visibility_direction === 'both' ? 'Bidirectional' :
                    row.visibility_direction === (index === 0 ? 'first_to_second' : 'second_to_first') ? 'Outgoing' : 'Incoming';
                const other = definition.members[1 - index];
                const target = members[1 - index] ? link(members[1 - index]) :
                    `Missing ${escapeHtml(other.entity)} (${escapeHtml(row[other.key])})`;
                addConnection(members[index].key, `<li><strong>${target}</strong> (${escapeHtml(definition.members[index].route)}; ${direction})${fields(row, payload)}</li>`);
            }
        }
    }
    for (const entity of entities.values()) {
        for (const [name, field] of Object.entries(entity.definition.fields)) {
            if (!field.ref || entity.row[name] === null || entity.row[name] === undefined || entity.row[name] === '') continue;
            const target = entities.get(anchor(field.ref, entity.row[name]));
            if (target) addConnection(target.key, `<li>${link(entity)} (${escapeHtml(label(name))})</li>`);
        }
    }

    if (multiPage) {
        return wikiPages();
    }

    const sections = [];
    for (const [name, definition] of Object.entries(domainManifest.entities)) {
        if (name === 'Alias') continue;
        const rows = [...entities.values()].filter((entity) => entity.name === name)
            .sort((a, b) => String(a.row.name).localeCompare(String(b.row.name)));
        const sectionId = `section-${definition.route}`;
        const index = rows.map((entity) => `<li>${link(entity)}</li>`).join('');
        const entries = rows.map((entity) => {
            const entityAliases = aliases.get(entity.key) || [];
            const related = connections.get(entity.key) || [];
            return `<article id="${entity.key}"><h3>${escapeHtml(entity.row.name)}</h3>` +
                (entityAliases.length ? `<p><strong>Aliases:</strong> ${entityAliases.map(escapeHtml).join(', ')}</p>` : '') +
                fields(entity.row, definition.fields) +
                (related.length ? `<h4>Connections</h4><ul>${related.join('')}</ul>` : '') +
                '<p><a href="#top">Back to index</a></p></article>';
        }).join('');
        sections.push({ id: sectionId, title: definition.ui.label, body: `<ul>${index}</ul>${entries}` });
    }
    if (campaign.posts.length) {
        const posts = campaign.posts.map((post) =>
            `<article><h3>${escapeHtml(post.title)}</h3><p>${escapeHtml(post.created_at)} &middot; by ${escapeHtml(post.author_username || 'Unknown author')}</p><p class="prose">${prose(post.body)}</p><p><a href="#top">Back to index</a></p></article>`
        ).join('');
        sections.unshift({ id: 'section-posts', title: 'Posts', body: posts });
    }
    if (unresolved.length) {
        sections.push({
            id: 'section-unresolved',
            title: 'Unresolved records',
            body: `<p>These records reference entries missing from the database.</p><ul>${unresolved.join('')}</ul>`,
        });
    }

    return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">' +
        '<meta name="viewport" content="width=device-width, initial-scale=1">' +
        '<title>Campaign Notes</title><style>' +
        'body{font-family:Georgia,serif;line-height:1.5;max-width:60em;margin:0 auto;padding:1em;color:#24211f;background:#fff}' +
        'a{color:#174a7e} article{border-top:1px solid #aaa;padding:1em 0} dt{font-weight:bold;margin-top:.7em}' +
        'dd{margin-left:1em;white-space:pre-wrap;overflow-wrap:break-word} .prose{white-space:pre-wrap}' +
        'li{margin:.4em 0} h1,h2,h3,h4{line-height:1.2}' +
        '</style></head><body><header id="top"><h1>Campaign Notes</h1>' +
        '<p>Offline DM snapshot. Includes private campaign information.</p><nav><ul>' +
        sections.map((section) => `<li><a href="#${escapeHtml(section.id)}">${escapeHtml(section.title)}</a></li>`).join('') +
        '</ul></nav></header><main>' +
        sections.map((section) => `<section id="${escapeHtml(section.id)}"><h2>${escapeHtml(section.title)}</h2>${section.body}</section>`).join('') +
        '</main></body></html>\n';

    function* wikiPages() {
        const pageSize = 200;
        const categories = Object.entries(domainManifest.entities)
            .filter(([name]) => name !== 'Alias')
            .map(([name, definition]) => ({
                name,
                definition,
                entries: [...entities.values()].filter((entity) => entity.name === name)
                    .sort((a, b) => String(a.row.name).localeCompare(String(b.row.name))),
            }));
        const categoryFile = (route, number = 1) => `category-${route}-${number}.html`;
        const postFile = (post) => `post-${createHash('sha256').update(String(post.id)).digest('hex')}.html`;
        const nav = '<a href="index.html">Home</a>' +
            categories.map(({ definition }) =>
                ` <a href="${categoryFile(definition.route)}">${escapeHtml(definition.ui.label)}</a>`
            ).join('') +
            (campaign.posts.length ? ' <a href="posts-1.html">Posts</a>' : '') +
            (unresolved.length ? ' <a href="unresolved-1.html">Unresolved records</a>' : '');

        function page(title, content, breadcrumb = '') {
            return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">' +
                '<meta name="viewport" content="width=device-width, initial-scale=1">' +
                `<title>${escapeHtml(title)} - Campaign Notes</title><link rel="stylesheet" href="style.css">` +
                `</head><body><header class="site-header"><a class="brand" href="index.html">Campaign Notes</a>` +
                `<nav aria-label="Main navigation">${nav}</nav></header>` +
                `<main><div class="breadcrumb"><a href="index.html">Home</a>${breadcrumb}</div>` +
                `<h1>${escapeHtml(title)}</h1>${content}</main>` +
                '<footer>Ashvanced Dungeons and Dragons</footer></body></html>\n';
        }

        function* lists(items, title, filename, renderItem) {
            const count = Math.max(1, Math.ceil(items.length / pageSize));
            for (let number = 1; number <= count; number += 1) {
                const list = items.slice((number - 1) * pageSize, number * pageSize);
                const pagination = count > 1 ?
                    `<nav class="pagination" aria-label="Pages">${number > 1 ? `<a href="${filename(number - 1)}">Previous</a> ` : ''}` +
                    `Page ${number} of ${count}${number < count ? ` <a href="${filename(number + 1)}">Next</a>` : ''}</nav>` : '';
                yield {
                    filename: filename(number), content: page(title,
                        `<p>${items.length} ${items.length === 1 ? 'entry' : 'entries'}</p>${pagination}` +
                        (list.length ? `<ul class="entry-list">${list.map(renderItem).join('')}</ul>` : '<p>No entries yet.</p>') + pagination)
                };
            }
        }

        const home = '<p>Browse your campaign by subject. Each entry opens as its own page, with links to related lore.</p>' +
            '<h2>Explore the campaign</h2><ul class="entry-list">' +
            categories.map(({ definition, entries }) =>
                `<li><a href="${categoryFile(definition.route)}">${escapeHtml(definition.ui.label)}</a> <span class="muted">(${entries.length})</span></li>`
            ).join('') +
            (campaign.posts.length ? `<li><a href="posts-1.html">Posts</a> <span class="muted">(${campaign.posts.length})</span></li>` : '') +
            (unresolved.length ? `<li><a href="unresolved-1.html">Unresolved records</a> <span class="muted">(${unresolved.length})</span></li>` : '') +
            '</ul>';
        yield { filename: 'index.html', content: page('Campaign Notes', home) };

        for (const { definition, entries } of categories) {
            const categoryName = definition.ui.label;
            const file = (number) => categoryFile(definition.route, number);
            yield* lists(entries, categoryName, file, (entity) => `<li>${link(entity)}</li>`);
            for (const entity of entries) {
                const entityAliases = aliases.get(entity.key) || [];
                const facts = Object.fromEntries(Object.entries(definition.fields)
                    .filter(([, field]) => !field.expository));
                const descriptions = Object.entries(definition.fields)
                    .filter(([name, field]) => field.expository && entity.row[name] !== null &&
                        entity.row[name] !== undefined && entity.row[name] !== '');
                const lead = descriptions.find(([name]) => name === 'short_description' || name === 'description');
                const remaining = descriptions.filter(([name]) => !lead || name !== lead[0]);
                const factsHtml = fields(entity.row, facts);
                const related = connections.get(entity.key) || [];
                const content = (factsHtml || entityAliases.length ?
                    `<aside class="infobox"><h2>${escapeHtml(definition.ui.singularLabel)}</h2>` +
                    (entityAliases.length ? `<p><strong>Aliases:</strong> ${entityAliases.map(escapeHtml).join(', ')}</p>` : '') +
                    `${factsHtml}</aside>` : '') +
                    (lead ? `<p class="lead prose">${prose(entity.row[lead[0]])}</p>` : '') +
                    remaining.map(([name]) => `<section><h2>${escapeHtml(label(name))}</h2><p class="prose">${prose(entity.row[name])}</p></section>`).join('') +
                    (related.length ? `<section class="connections"><h2>Connections</h2><ul>${related.join('')}</ul></section>` : '') +
                    '<div class="clear"></div>';
                yield {
                    filename: entityFile(entity),
                    content: page(entity.row.name, content,
                        ` &rsaquo; <a href="${file(1)}">${escapeHtml(categoryName)}</a>`),
                };
            }
        }
        if (campaign.posts.length) {
            yield* lists(campaign.posts, 'Posts', (number) => `posts-${number}.html`,
                (post) => `<li><a href="${postFile(post)}">${escapeHtml(post.title)}</a></li>`);
            for (const post of campaign.posts) {
                const content = `<p class="muted">${escapeHtml(post.created_at)} &middot; by ${escapeHtml(post.author_username || 'Unknown author')}</p>` +
                    `<p class="prose">${prose(post.body)}</p>`;
                yield { filename: postFile(post), content: page(post.title, content, ' &rsaquo; <a href="posts-1.html">Posts</a>') };
            }
        }
        if (unresolved.length) {
            yield* lists(unresolved, 'Unresolved records', (number) => `unresolved-${number}.html`, (item) => item);
        }
    }
}

module.exports = { loadCampaign, createRenderer };
