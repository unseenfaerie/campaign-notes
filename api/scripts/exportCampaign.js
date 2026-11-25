require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');
const { loadCampaign, createRenderer } = require('../utils/campaignExport');

async function main() {
    const args = process.argv.slice(2);
    const multiPage = args[0] === '--wiki';
    const [outputPath, databaseArgument, ...extra] = multiPage ? args.slice(1) : args;
    if (!outputPath || extra.length) {
        throw new Error('Usage: node scripts/exportCampaign.js [--wiki] <output-path> [database-path]');
    }
    const databasePath = databaseArgument || process.env.DB_PATH || path.join(__dirname, '../campaign.db');
    const campaign = await loadCampaign(path.resolve(databasePath));
    if (multiPage) {
        const css = await fs.readFile(path.join(__dirname, '../utils/campaignWiki.css'), 'utf8');
        const pages = createRenderer(campaign, { multiPage: true });
        await fs.mkdir(outputPath, { mode: 0o700 });
        try {
            await fs.writeFile(path.join(outputPath, 'style.css'), css, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
            for (const page of pages) {
                await fs.writeFile(path.join(outputPath, page.filename), page.content,
                    { encoding: 'utf8', flag: 'wx', mode: 0o600 });
            }
        } catch (error) {
            throw new Error(`Could not finish wiki export; incomplete directory remains at ${path.resolve(outputPath)}: ${error.message}`);
        }
    } else {
        const html = createRenderer(campaign);
        await fs.writeFile(outputPath, html, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    }
    console.log(`Campaign export created: ${path.resolve(outputPath)}`);
    if (multiPage) console.log(`Open ${path.resolve(outputPath, 'index.html')}`);
    console.log('This DM snapshot includes private campaign information.');
}

main().catch((error) => {
    console.error('Campaign export failed:', error.message);
    process.exitCode = 1;
});
