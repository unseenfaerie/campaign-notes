const fs = require('fs');
const path = require('path');

const ROOT = __dirname; // Adjust if needed

function getDisplayName(filename) {
    // Remove extension and replace dashes/underscores with spaces, capitalize
    return filename
        .replace(/\.html$/, '')
        .replace(/-/g, ' ')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

function generateIndex(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    const subdirs = items.filter(item => item.isDirectory());
    const files = items.filter(item => item.isFile() && item.name.endsWith('.html') && !item.name.startsWith('index'));

    // Get directory name for the index file
    const dirName = path.basename(dir);

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${getDisplayName(dirName)}</title>
    <link rel="stylesheet" href="${path.relative(dir, path.join(ROOT, 'styles.css'))}">
</head>
<body>
    <div class="container">
        <div id="sidebar-container"></div>
        <main class="content">
            <h1>${getDisplayName(dirName)}</h1>
`;

    // List subdirectories
    for (const subdir of subdirs) {
        html += `<h2><a href="./${subdir.name}/${subdir.name}.html">${getDisplayName(subdir.name)}</a></h2>\n`;
        // Optionally, list files in subdir here (recursive listing)
    }

    // List files
    if (files.length > 0) {
        html += `<ul>\n`;
        for (const file of files) {
            html += `  <li><a href="./${file.name}">${getDisplayName(file.name)}</a></li>\n`;
        }
        html += `</ul>\n`;
    }

    html += `        </main>
    </div>
    <script src="${path.relative(dir, path.join(ROOT, 'links.js'))}"></script>
    <script src="${path.relative(dir, path.join(ROOT, 'navbar.js'))}"></script>
</body>
</html>
`;

    // Write the index file (e.g., places.html in /places)
    const indexFile = path.join(dir, `${dirName}.html`);
    fs.writeFileSync(indexFile, html, 'utf8');
}

function walk(dir) {
    generateIndex(dir);
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
        if (item.isDirectory()) {
            walk(path.join(dir, item.name));
        }
    }
}

// Start from the root folders you want to index
walk(ROOT);

console.log('Directory index pages generated!');