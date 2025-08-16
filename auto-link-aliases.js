const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

// 1. Load CAMPAIGN data from campaign-data.json
const campaign = JSON.parse(fs.readFileSync(path.join(ROOT, 'campaign-data.json'), 'utf8'));

// 2. Build linkEntries from campaign data
const linkEntries = [
    ...(campaign.playerCharacters || []).map(c => ({ href: c.href, aliases: c.aliases })),
    ...(campaign.nonPlayerCharacters || []).map(p => ({ href: p.href, aliases: p.aliases })),
    ...(campaign.items || []).map(p => ({ href: p.href, aliases: p.aliases })),
    ...(campaign.places || []).map(p => ({ href: p.href, aliases: p.aliases })),
    ...(campaign.sessions || []).map(p => ({ href: p.href, aliases: p.aliases })),
    ...(campaign.organizations || []).map(p => ({ href: p.href, aliases: p.aliases })),
];

// 3. Build a flat list of all aliases (sorted by length descending)
const allAliases = linkEntries.flatMap(e => e.aliases).filter(Boolean).sort((a, b) => b.length - a.length);

const debug = process.argv[3]

// 4. Get file path from command line
const filePath = process.argv[2];
if (!filePath) {
    console.error('Usage: node auto-link-aliases.js <path-to-html-file> -debug');
    process.exit(1);
}
if (!fs.existsSync(filePath)) {
    console.error('File does not exist:', filePath);
    process.exit(1);
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
                return match;
            } // inside []

            // Check if inside <a ...>...</a>
            const openA = before.lastIndexOf('<a');
            const closeA = before.lastIndexOf('</a>');
            if (openA > closeA) {
                return match;
            } // inside <a>

            // Check if inside <title>...</title>
            const openTitle = before.lastIndexOf('<title>');
            const closeTitle = before.lastIndexOf('</title>');
            if (openTitle > closeTitle) {
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

bracketAliasesInFile(filePath);

console.log('Alias auto-bracketing complete.');