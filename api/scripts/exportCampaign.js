require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');
const { loadCampaign, createRenderer } = require('../utils/campaignExport');

async function main() {
    const [outputPath, databaseArgument, ...extra] = process.argv.slice(2);
    if (!outputPath || extra.length) {
        throw new Error('Usage: node scripts/exportCampaign.js <output.html> [database-path]');
    }
    const databasePath = databaseArgument || process.env.DB_PATH || path.join(__dirname, '../campaign.db');
    const campaign = await loadCampaign(path.resolve(databasePath));
    const html = createRenderer(campaign);
    await fs.writeFile(outputPath, html, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    console.log(`Campaign export created: ${path.resolve(outputPath)}`);
    console.log('This DM snapshot includes private campaign information.');
}

main().catch((error) => {
    console.error('Campaign export failed:', error.message);
    process.exitCode = 1;
});
