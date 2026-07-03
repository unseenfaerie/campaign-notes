// validateSeed.js - Checks value count for each row in seed data

const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, 'seed.js');
const seedContent = fs.readFileSync(seedPath, 'utf8');

// Table column counts (update as needed)
const tableColumns = {
  characters: 18,
  deities: 6,
  events: 8,
  items: 4,
  organizations: 5,
  places: 6,
  spells: 11,
  spheres: 3,
  character_deities: 7,
  character_items: 5,
  character_organizations: 6,
  character_places: 6,
  character_relationships: 7,
  deity_spheres: 2,
  event_characters: 4,
  event_deities: 4,
  event_items: 4,
  event_organizations: 4,
  event_places: 4,
  organization_places: 4,
  item_spells: 2,
  spell_spheres: 2,
  aliases: 3
};

// Regex to find each INSERT block
const insertRegex = /INSERT OR IGNORE INTO (\w+) \([^)]+\) VALUES([\s\S]*?);/g;

let foundIssues = false;
let match;
while ((match = insertRegex.exec(seedContent)) !== null) {
  const table = match[1];
  const valuesBlock = match[2];
  const expectedCount = tableColumns[table];
  if (!expectedCount) continue;

  // Split rows, handle multi-line
  const rows = valuesBlock.split(/\),\s*\(/).map(row => {
    // Remove leading/trailing parens and whitespace
    return row.replace(/^\s*\(/, '').replace(/\)\s*$/, '');
  });

  rows.forEach((row, idx) => {
    // Improved regex: matches single-quoted strings (with escaped quotes), NULL, numbers
    const values = row.match(/'(?:[^']|'')*'|NULL|\d+|\d+\.\d+/g) || [];
    if (values.length !== expectedCount) {
      foundIssues = true;
      console.log(`Table: ${table}, Row ${idx + 1}: Expected ${expectedCount} values, found ${values.length}`);
      console.log(`  Row: (${row})\n`);
    }
  });
}

if (!foundIssues) {
  console.log('All seed data rows have correct value counts.');
} else {
  console.log('Issues found above. Please fix before seeding.');
}
