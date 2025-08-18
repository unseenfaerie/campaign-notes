const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

const SKIP_DIRS = new Set(['.git', 'node_modules', '.vscode']);

// 1. Load CAMPAIGN data from campaign-data.js
const campaign = require(path.join(ROOT, 'campaign-data.js'));

// 2. Build linkEntries from campaign data
// For each top-level category added here, also update: links.js
function ensureNameInAliases(arr) {
    return (arr || []).map(obj => {
        const aliases = Array.isArray(obj.aliases) ? obj.aliases.slice() : [];
        if (obj.name && !aliases.includes(obj.name)) {
            aliases.push(obj.name);
        }
        return { ...obj, aliases };
    });
}

const linkEntries = [
    ...ensureNameInAliases(campaign.playerCharacters).map(c => ({ href: c.href, aliases: c.aliases })),
    ...ensureNameInAliases(campaign.nonPlayerCharacters).map(p => ({ href: p.href, aliases: p.aliases })),
    ...ensureNameInAliases(campaign.items).map(p => ({ href: p.href, aliases: p.aliases })),
    ...ensureNameInAliases(campaign.places).map(p => ({ href: p.href, aliases: p.aliases })),
    ...ensureNameInAliases(campaign.sessions).map(p => ({ href: p.href, aliases: p.aliases })),
    ...ensureNameInAliases(campaign.organizations).map(p => ({ href: p.href, aliases: p.aliases })),
    ...ensureNameInAliases(campaign.deities).map(d => ({ href: d.href, aliases: d.aliases }))
];

// 3. Build a flat list of all aliases (sorted by length descending)
const allAliases = linkEntries.flatMap(e => e.aliases).filter(Boolean).sort((a, b) => b.length - a.length);

const debug = false; //make true for console messages
let recurse = false;

// 4. Get file path from command line
const filePath = process.argv[2];
if (!filePath) {
    recurse = true;
}
if (!fs.existsSync(filePath)) {
    recurse = true;
}

function getHtmlFiles(dir) {
    let files = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files = files.concat(getHtmlFiles(fullPath));
        } else if (
            entry.isFile() &&
            entry.name.endsWith('.html') &&
            !entry.name.startsWith('index') &&
            entry.name !== `${path.basename(dir)}.html`
        ) {
            if (debug) { console.log('looking at: ' + fullPath); }
            files.push(fullPath);
        }
    }
    return files;
}

// 5. Replace plain aliases with [Alias] (not inside <a> or already in [])


function bracketAliasesInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Try to extract the page's name from the <title> tag
    let pageName = null;
    const titleMatch = content.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
        pageName = titleMatch[1].trim();
        if (debug) { console.log('Page name detected:', pageName); }
    }

    // Find all aliases for the object whose name matches the page title
    let pageAliases = [];
    if (pageName) {
        for (const entry of linkEntries) {
            if (entry.aliases && entry.aliases.includes(pageName)) {
                pageAliases = entry.aliases;
                if (debug) { console.log('Page aliases detected:', pageAliases); }
                break;
            }
        }
    }

    for (const alias of allAliases) {
        // Skip bracketing if alias matches the page name or any alias for the object with that name
        if (pageName && (alias === pageName || (pageAliases && pageAliases.includes(alias)))) {
            if (debug) { console.log('Skipping self-link alias:', alias); }
            continue;
        }
        // Replace plain alias (word boundary) not inside <a>...</a> or [] or <title>...</title>
        const aliasRegex = new RegExp(`(?<!\\[|<a[^>]*?>|\\w)${alias.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}(?!\\]|</a>|\\w)`, 'g');
        if (debug) { console.log('looking for ' + alias); }
        content = content.replace(aliasRegex, (match, offset) => {
            if (debug) { console.log('looking for ' + alias + ', hitting ' + match); }
            // Check if inside []
            const before = content.slice(0, offset);
            const openBracket = before.lastIndexOf('[');
            const closeBracket = before.lastIndexOf(']');
            if (openBracket > closeBracket) {
                if (debug) { console.log('rejecting: ' + match + ', bracket'); }
                return match;
            } // inside []

            // Check if inside <a ...>...</a>
            const openA = before.lastIndexOf('<a');
            const closeA = before.lastIndexOf('</a>');
            if (openA > closeA) {
                if (debug) { console.log('rejecting: ' + match + ', <a>'); }
                return match;
            } // inside <a>

            // Check if inside <title>...</title>
            const openTitle = before.lastIndexOf('<title>');
            const closeTitle = before.lastIndexOf('</title>');
            if (openTitle > closeTitle) {
                if (debug) { console.log('rejecting: ' + match + ', inside <title>'); }
                return match; // inside <title>
            }

            changed = true;
            if (debug) { console.log(`[${match}]`); }
            return `[${match}]`;
        });
    }

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated:', filePath);
    } else {
        console.log('No changes needed:', filePath);
    }
}

if (recurse) {
    const htmlFiles = getHtmlFiles(ROOT);
    htmlFiles.forEach(bracketAliasesInFile);
} else {
    bracketAliasesInFile(filePath);
}

console.log('Alias auto-bracketing complete.');