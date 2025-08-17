const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

const SKIP_DIRS = new Set(['.git', 'node_modules', '.vscode']);

// 1. Load CAMPAIGN data from campaign-data.json
const campaign = JSON.parse(fs.readFileSync(path.join(ROOT, 'campaign-data.json'), 'utf8'));

// 2. Build linkEntries from campaign data
// For each top-level category added here, also update: links.js
const linkEntries = [
    ...(campaign.playerCharacters || []).map(c => ({ href: c.href, aliases: c.aliases })),
    ...(campaign.nonPlayerCharacters || []).map(p => ({ href: p.href, aliases: p.aliases })),
    ...(campaign.items || []).map(p => ({ href: p.href, aliases: p.aliases })),
    ...(campaign.places || []).map(p => ({ href: p.href, aliases: p.aliases })),
    ...(campaign.sessions || []).map(p => ({ href: p.href, aliases: p.aliases })),
    ...(campaign.organizations || []).map(p => ({ href: p.href, aliases: p.aliases })),
    ...(campaign.deities || []).map(d => ({ href: d.href, aliases: d.aliases }))
];

// 3. Build a flat list of all aliases (sorted by length descending)
const allAliases = linkEntries.flatMap(e => e.aliases).filter(Boolean).sort((a, b) => b.length - a.length);

const debug = process.argv[3]
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
            console.log('looking at: ' + fullPath);
            files.push(fullPath);
        }
    }
    return files;
}

// 5. Replace plain aliases with [Alias] (not inside <a> or already in [])
function bracketAliasesInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    for (const alias of allAliases) {
        // Replace plain alias (word boundary) not inside <a>...</a> or [] or <title>...</title>
        // For multi-word aliases, \b will only match at the start/end if the alias is surrounded by non-word chars.
        // To handle multi-word, use lookbehind/lookahead for non-word or start/end.
        const aliasRegex = new RegExp(`(?<!\\[|<a[^>]*?>|\\w)${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?!\\]|</a>|\\w)`, 'g');
        if (debug) { console.log('looking for ' + alias); }
        content = content.replace(aliasRegex, (match, offset) => {
            debug ?? console.log('looking for ' + alias + ', hitting ' + match);
            // Check if inside []
            const before = content.slice(0, offset);
            const openBracket = before.lastIndexOf('[');
            const closeBracket = before.lastIndexOf(']');
            if (openBracket > closeBracket) {
                debug ?? console.log('rejecting: ' + match + ', bracket');
                return match;
            } // inside []

            // Check if inside <a ...>...</a>
            const openA = before.lastIndexOf('<a');
            const closeA = before.lastIndexOf('</a>');
            if (openA > closeA) {
                debug ?? console.log('rejecting: ' + match + ', <a>');
                return match;
            } // inside <a>

            // Check if inside <title>...</title>
            const openTitle = before.lastIndexOf('<title>');
            const closeTitle = before.lastIndexOf('</title>');
            if (openTitle > closeTitle) {
                debug ?? console.log('rejecting: ' + match + ', inside <title>');
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