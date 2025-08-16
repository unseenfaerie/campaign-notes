const fs = require('fs');
const path = require('path');

const SKIP_DIRS = new Set(['.git', 'node_modules', '.vscode']);
const ROOT = __dirname;

// 1. Load CAMPAIGN data from global-data.js
const globalDataJs = fs.readFileSync(path.join(ROOT, 'global-data.js'), 'utf8');
const campaignMatch = globalDataJs.match(/window\.CAMPAIGN\s*=\s*({[\s\S]*?});/);
if (!campaignMatch) {
    console.error('Could not find CAMPAIGN object in global-data.js');
    process.exit(1);
}
const campaign = eval('(' + campaignMatch[1] + ')'); // Safe if you control the file

// 2. Build linkEntries from campaign data
const linkEntries = [
    ...(campaign.characters || []).map(c => ({ href: c.href, aliases: c.aliases })),
    ...(campaign.places || []).map(p => ({ href: p.href, aliases: p.aliases })),
    // Add more entity types if needed
];

// 3. Build a flat list of all aliases (sorted by length descending)
const allAliases = linkEntries.flatMap(e => e.aliases).sort((a, b) => b.length - a.length);

// 4. Recursively scan for non-index HTML files
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
        // Skip if already in [Alias]
        const bracketed = new RegExp(`\\[${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'g');
        if (bracketed.test(content)) continue;

        // Replace plain alias (word boundary) not inside <a>...</a> or []
        const aliasRegex = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
        content = content.replace(aliasRegex, (match, offset) => {
            // Check if inside []
            const before = content.slice(0, offset);
            const openBracket = before.lastIndexOf('[');
            const closeBracket = before.lastIndexOf(']');
            if (openBracket > closeBracket) return match; // inside []

            // Check if inside <a ...>...</a>
            const openA = before.lastIndexOf('<a');
            const closeA = before.lastIndexOf('</a>');
            if (openA > closeA) return match; // inside <a>

            // Check if inside <title>...</title>
            const openTitle = before.lastIndexOf('<title>');
            const closeTitle = before.lastIndexOf('</title>');
            if (openTitle > closeTitle) return match; // inside <title>

            changed = true;
            return `[${match}]`;
        });
    }

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
}

// 6. Run for all files
const htmlFiles = getHtmlFiles(ROOT);
htmlFiles.forEach(bracketAliasesInFile);

console.log('Alias auto-bracketing complete.');