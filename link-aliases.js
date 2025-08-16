const fs = require('fs');
const path = require('path');

const SKIP_DIRS = new Set(['.git', 'node_modules', '.vscode']);
const ROOT = __dirname;

// 1. Load linkEntries from links.js
const linksJs = fs.readFileSync(path.join(ROOT, 'links.js'), 'utf8');
const linkEntriesMatch = linksJs.match(/const linkEntries\s*=\s*(\[[\s\S]*?\]);/);
if (!linkEntriesMatch) {
    console.error('Could not find linkEntries in links.js');
    process.exit(1);
}
const linkEntries = eval(linkEntriesMatch[1]); // Safe here because you control the file

// 2. Build a flat list of all aliases (sorted by length descending to avoid partial matches)
const allAliases = linkEntries.flatMap(e => e.aliases).sort((a, b) => b.length - a.length);

// 3. Recursively scan for non-index HTML files
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

// 4. Replace plain aliases with [Alias] (not inside <a> or already in [])
function bracketAliasesInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    for (const alias of allAliases) {
        // Regex: not inside [] or <a ...>...</a>
        // We'll skip if already inside [] or inside <a>
        // Negative lookbehind for [ and <a, negative lookahead for ]
        // To avoid complex HTML parsing, we do a simple check

        // Skip if already in [Alias]
        const bracketed = new RegExp(`\\[${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'g');
        if (bracketed.test(content)) continue;

        // Replace plain alias (word boundary) not inside <a>...</a> or []
        // We'll use a callback to check context
        const aliasRegex = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
        content = content.replace(aliasRegex, (match, offset) => {
            // Check if inside []
            const before = content.slice(0, offset);
            const after = content.slice(offset + match.length);
            const openBracket = before.lastIndexOf('[');
            const closeBracket = before.lastIndexOf(']');
            if (openBracket > closeBracket) return match; // inside []

            // Check if inside <a ...>...</a>
            const openA = before.lastIndexOf('<a');
            const closeA = before.lastIndexOf('</a>');
            if (openA > closeA) return match; // inside <a>

            // Otherwise, bracket it
            changed = true;
            return `[${match}]`;
        });
    }

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
}

// 5. Run for all files
const htmlFiles = getHtmlFiles(ROOT);
htmlFiles.forEach(bracketAliasesInFile);

console.log('Alias auto-bracketing complete.');