const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SKIP_DIRS = new Set(['.git', 'node_modules', '.vscode']);

function getDisplayName(filename) {
    return filename
        .replace(/\.html$/, '')
        .replace(/-/g, ' ')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

function getRelativeResource(dir, file) {
    return path.relative(dir, path.join(ROOT, file)).replace(/\\/g, '/');
}

function listDirRecursiveOutline(dir, baseDir = dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true })
        .filter(item => !SKIP_DIRS.has(item.name) && !item.name.startsWith('.'));
    let html = '<ul>\n';
    for (const item of items) {
        if (item.isDirectory()) {
            html += `<li><strong>${getDisplayName(item.name)}</strong>\n`;
            html += listDirRecursive(path.join(dir, item.name), baseDir);
            html += '</li>\n';
        } else if (item.isFile() && item.name.endsWith('.html')) {
            const relPath = path.relative(baseDir, path.join(dir, item.name)).replace(/\\/g, '/');
            html += `<li><a href="./${relPath}">${getDisplayName(item.name)}</a></li>\n`;
        }
    }
    html += '</ul>\n';
    return html;
}

function listDirRecursiveHeader(dir, baseDir = dir, depth = 2) {
    const items = fs.readdirSync(dir, { withFileTypes: true })
        .filter(item => !SKIP_DIRS.has(item.name) && !item.name.startsWith('.'));

    let html = '';

    // List files in this directory
    const files = items.filter(item =>
        item.isFile() &&
        item.name.endsWith('.html') &&
        !item.name.startsWith('index') &&
        item.name !== `${path.basename(dir)}.html`
    );
    if (files.length > 0) {
        html += '<ul>\n';
        for (const file of files) {
            const relPath = path.relative(baseDir, path.join(dir, file.name)).replace(/\\/g, '/');
            html += `<li><a href="./${relPath}">${getDisplayName(file.name)}</a></li>\n`;
        }
        html += '</ul>\n';
    }

    for (const item of items) {
        if (item.isDirectory()) {
            // Use depth to determine header level (max h6)
            const headerLevel = Math.min(depth, 6);
            const dirDisplay = getDisplayName(item.name);
            const relPath = path.relative(baseDir, path.join(dir, item.name, `${item.name}.html`)).replace(/\\/g, '/');
            html += `<h${headerLevel}><a href="./${relPath}">${dirDisplay}</a></h${headerLevel}>\n`;
            html += listDirRecursiveHeader(path.join(dir, item.name), baseDir, depth + 1);
        }
    }

    return html;
}

function listDirFlat(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true })
        .filter(item => !SKIP_DIRS.has(item.name) && !item.name.startsWith('.'));
    let html = '';
    // Subdirectories as headers
    for (const item of items) {
        if (item.isDirectory()) {
            html += `<h2><a href="./${item.name}/${item.name}.html">${getDisplayName(item.name)}</a></h2>\n`;
        }
    }
    // Files as list
    const files = items.filter(item => item.isFile() && item.name.endsWith('.html') && !item.name.startsWith('index'));
    if (files.length > 0) {
        html += '<ul>\n';
        for (const file of files) {
            html += `<li><a href="./${file.name}">${getDisplayName(file.name)}</a></li>\n`;
        }
        html += '</ul>\n';
    }
    return html;
}

function generateIndex(dir, isRoot = false) {
    const dirName = path.basename(dir);
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${getDisplayName(dirName)}</title>
    <link rel="stylesheet" href="campaign-notes/styles.css">
</head>
<body>
    <div class="container">
        <div id="sidebar-container"></div>
        <main class="content">
            <h1>${getDisplayName(dirName)}</h1>
`;

    if (isRoot) {
        html += listDirFlat(dir);
    } else {
        html += listDirRecursiveHeader(dir);
    }

    html += `        </main>
    </div>
    <script src="${getRelativeResource(dir, 'navbar.js')}"></script>
    <script src="${getRelativeResource(dir, 'breadcrumbs.js')}"></script>
</body>
</html>
`;

    // Write the index file (e.g., places.html in /places)
    const indexFile = path.join(dir, `${dirName}.html`);
    fs.writeFileSync(indexFile, html, 'utf8');
}

function walk(dir, isRoot = false) {
    if (!isRoot) {
        generateIndex(dir, isRoot);
    }
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
        if (item.isDirectory() && !SKIP_DIRS.has(item.name) && !item.name.startsWith('.')) {
            walk(path.join(dir, item.name), false);
        }
    }
}

// Start from the root folder
walk(ROOT, true);

console.log('Directory index pages generated!');