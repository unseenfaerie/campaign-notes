const fs = require('fs');
const path = require('path');
const CAMPAIGN = require('./campaign-data.js');

function findNearestTemplate(startDir) {
    let dir = startDir;
    const root = path.parse(dir).root;
    while (true) {
        // List files in the current directory (if it exists)
        const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
        // Find the first .txt file (template)
        const template = files.find(f => f.endsWith('.txt'));
        if (template) {
            return path.join(dir, template);
        }
        // If we've reached the root, stop searching
        if (dir === root) break;
        // Move up one directory
        dir = path.dirname(dir);
    }
    // No template found
    return null;
}

// Fill in the template with the entry's name for <title> and <h1>, and replace {{name}} placeholders
function fillTemplate(template, entry) {
    let result = template;
    // Replace the <title> tag with the entry's name
    result = result.replace(/<title>.*?<\/title>/i, `<title>${entry.name}</title>`);
    // Replace the first <h1> tag with the entry's name
    result = result.replace(/<h1>.*?<\/h1>/i, `<h1>${entry.name}</h1>`);
    // Replace all {{name}} placeholders (case-insensitive)
    result = result.replace(/\{\{name\}\}/gi, entry.name);
    return result;
}

// For each array of campaign entries, check if the page exists; if not, generate it from the nearest template
function checkAndGeneratePages(arrays) {
    arrays.forEach(array => {
        array.forEach(entry => {
            if (!entry.href) return; // Skip entries without an href
            // Remove leading slash for path.join to avoid absolute path issues
            let hrefPath = entry.href.startsWith('/') ? entry.href.slice(1) : entry.href;
            hrefPath = hrefPath.replace(/campaign-notes\//, ''); // Remove leading /campaign-notes/

            // If href contains a fragment (e.g., #bert-verinwort), only check/generate the base file
            let baseHrefPath = hrefPath;
            let fragmentIdx = hrefPath.indexOf('#');
            if (fragmentIdx !== -1) {
                baseHrefPath = hrefPath.slice(0, fragmentIdx);
            }
            const filePath = path.join(__dirname, baseHrefPath);

            // If the base file does not exist, generate it
            if (!fs.existsSync(filePath)) {
                const dir = path.dirname(filePath);
                // Find the nearest template file by searching upwards
                const templatePath = findNearestTemplate(dir);
                if (templatePath) {
                    // Read the template and fill in the entry's data
                    let template = fs.readFileSync(templatePath, 'utf8');
                    let filled = fillTemplate(template, entry);
                    // Ensure the target directory exists
                    fs.mkdirSync(dir, { recursive: true });
                    // Write the filled template to the new HTML file
                    fs.writeFileSync(filePath, filled);
                    console.log(`Created: ${filePath}`);
                } else {
                    // Warn if no template was found for this entry
                    console.warn(`No template found for: ${filePath}`);
                }
            }
        });
    });
}

// Gather all arrays from CAMPAIGN
const arrays = [
    CAMPAIGN.playerCharacters,
    CAMPAIGN.nonPlayerCharacters,
    CAMPAIGN.deities,
    CAMPAIGN.organizations,
    CAMPAIGN.places,
    CAMPAIGN.items,
    CAMPAIGN.sessions
];

checkAndGeneratePages(arrays);