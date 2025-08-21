const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SKIP_DIRS = new Set(['.git', 'node_modules', '.vscode']);

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

function removeBracketsInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Replace [Alias] with Alias, but only if not inside an HTML tag attribute
    // This regex will match [text] and replace with text
    const newContent = content.replace(/\[([^\]]+)\]/g, '$1');
    if (newContent !== content) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log('Updated:', filePath);
    } else {
        console.log('No changes needed:', filePath);
    }
}

function main() {
    const htmlFiles = getHtmlFiles(ROOT);
    htmlFiles.forEach(removeBracketsInFile);
    console.log('All alias brackets removed.');
}

if (require.main === module) {
    main();
}
