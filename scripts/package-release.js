const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const outputDirectory = path.join(root, 'release');
const archivePath = path.join(outputDirectory, 'campaign-notes-release.tar.gz');

execFileSync('npm', ['run', 'wiki:build'], { cwd: root, stdio: 'inherit' });

fs.rmSync(outputDirectory, { recursive: true, force: true });
fs.mkdirSync(outputDirectory, { recursive: true });

const files = [
    'api',
    'common',
    'package.json',
    'package-lock.json',
];
const stagingDirectory = path.join(outputDirectory, 'app');
fs.mkdirSync(stagingDirectory, { recursive: true });

for (const file of files) {
    fs.cpSync(path.join(root, file), path.join(stagingDirectory, file), {
        recursive: true,
        filter: (source) => !source.split(path.sep).includes('node_modules')
            && !source.endsWith(`${path.sep}campaign.db`)
            && !source.includes(`${path.sep}backups${path.sep}`)
            && !source.endsWith(`${path.sep}.env`)
            && !source.endsWith(`${path.sep}seedUsers.local.js`),
    });
}

fs.cpSync(path.join(root, 'wiki', 'dist'), path.join(stagingDirectory, 'wiki', 'dist'), {
    recursive: true,
});

execFileSync('tar', ['-czf', archivePath, '-C', stagingDirectory, '.'], {
    cwd: root,
    stdio: 'inherit',
});

console.log(`Release archive created: ${archivePath}`);