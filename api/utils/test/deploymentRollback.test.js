const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const sqlite3 = require('sqlite3');

const repo = path.resolve(__dirname, '../../..');
const helper = path.join(repo, 'api/scripts/deploymentDatabase.js');

function run(database, sql) {
    return new Promise((resolve, reject) => {
        database.run(sql, (error) => (error ? reject(error) : resolve()));
    });
}

function close(database) {
    return new Promise((resolve, reject) => {
        database.close((error) => (error ? reject(error) : resolve()));
    });
}

function sql(dbPath, statement, query = false) {
    const script = `
        const sqlite3 = require('sqlite3');
        const db = new sqlite3.Database(process.argv[1]);
        const callback = (error, rows) => {
            if (error) { console.error(error.message); process.exitCode = 1; }
            else if (rows) console.log(JSON.stringify(rows));
            db.close();
        };
        if (process.argv[3] === 'query') db.all(process.argv[2], callback);
        else db.exec(process.argv[2], callback);
    `;
    const output = execFileSync(process.execPath, ['-e', script, dbPath, statement, query ? 'query' : 'exec'], { encoding: 'utf8' });
    return query ? JSON.parse(output) : undefined;
}

describe('deployment database rollback', () => {
    let dir;
    let dbPath;
    let env;

    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'campaign-deploy-'));
        dbPath = path.join(dir, 'campaign.db');
        env = { ...process.env, DB_PATH: dbPath };
    });

    afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

    it('snapshots committed WAL data and restores it after changes', async () => {
        const db = new sqlite3.Database(dbPath);
        await run(db, 'PRAGMA journal_mode=WAL');
        await run(db, 'PRAGMA wal_autocheckpoint=0');
        await run(db, 'CREATE TABLE notes (body TEXT)');
        await run(db, "INSERT INTO notes VALUES ('before')");

        execFileSync(process.execPath, [helper, 'snapshot', dir], { env });
        await run(db, "INSERT INTO notes VALUES ('after')");
        await close(db);
        execFileSync(process.execPath, [helper, 'restore', dir], { env });

        expect(sql(dbPath, 'SELECT body FROM notes', true)).toEqual([{ body: 'before' }]);
    });

    it('restores a previously missing database to absence', () => {
        execFileSync(process.execPath, [helper, 'snapshot', dir], { env });
        sql(dbPath, 'CREATE TABLE notes (body TEXT)');
        execFileSync(process.execPath, [helper, 'restore', dir], { env });
        expect(fs.existsSync(dbPath)).toBe(false);
    });

    it('recreates a deleted database from its snapshot', () => {
        sql(dbPath, "CREATE TABLE notes (body TEXT); INSERT INTO notes VALUES ('before');");
        execFileSync(process.execPath, [helper, 'snapshot', dir], { env });
        fs.unlinkSync(dbPath);
        execFileSync(process.execPath, [helper, 'restore', dir], { env });
        expect(sql(dbPath, 'SELECT body FROM notes', true)).toEqual([{ body: 'before' }]);
    });
});

describe('activation rollback', () => {
    let dir;
    let root;
    let dbPath;
    let env;
    let script;
    let archive;
    let previous;

    function stub(name, body) {
        const file = path.join(dir, 'bin', name);
        fs.writeFileSync(file, `#!/bin/bash\nset -e\n${body}\n`, { mode: 0o755 });
        return file;
    }

    function activate(overrides = {}) {
        return spawnSync('bash', [script, archive], {
            input: 'https://example.test\n',
            env: { ...env, ...overrides },
            encoding: 'utf8',
        });
    }

    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'campaign-activate-'));
        root = path.join(dir, 'root');
        dbPath = path.join(dir, 'campaign.db');
        previous = path.join(root, 'releases', 'previous');
        fs.mkdirSync(previous, { recursive: true });
        fs.mkdirSync(path.join(dir, 'bin'));
        fs.symlinkSync(previous, path.join(root, 'current'));
        sql(dbPath, "CREATE TABLE notes (body TEXT); INSERT INTO notes VALUES ('before');");

        const withEnv = stub('with-env', `
if [[ "$FAIL_RESTORE" == 1 && "$3" == restore ]]; then exit 1; fi
exec "$@"`);
        stub('systemctl', `
echo "$*" >> "$CALLS"
if [[ "$1" == stop && "$FAIL_ROLLBACK_STOP" == 1 ]]; then
    if [[ -f "$TEST_DIR/stopped-once" ]]; then exit 1; fi
    touch "$TEST_DIR/stopped-once"
fi
if [[ "$1" == start && "$FAIL_START" == 1 && ! -f "$TEST_DIR/start-failed" ]]; then
    touch "$TEST_DIR/start-failed"; exit 1
fi`);
        stub('chown', 'exit 0');
        stub('sudo', 'shift 2; exec "$@"');
        stub('sleep', 'exit 0');
        stub('curl', '[[ "$FAIL_HEALTH" != 1 ]]');
        stub('npm', `
node -e 'const db = new (require("sqlite3").Database)(process.env.DB_PATH); db.exec("CREATE TABLE IF NOT EXISTS notes (body TEXT); INSERT INTO notes VALUES (\\x27after\\x27)", (error) => { if (error) { console.error(error); process.exitCode = 1; } db.close(); });'
[[ "$FAIL_MIGRATION" != 1 ]]`);
        stub('node', `
if [[ "$1" == */scripts/smoke-test.js && "$FAIL_SMOKE" == 1 ]]; then exit 1; fi
if [[ "$1" == */scripts/smoke-test.js ]]; then exit 0; fi
exec "${process.execPath}" "$@"`);

        const source = fs.readFileSync(path.join(repo, 'deploy/campaign-notes-activate'), 'utf8')
            .replace('root=/opt/campaign-notes', `root=${root}`)
            .replaceAll('/usr/local/sbin/with-env.sh', withEnv);
        script = path.join(dir, 'activate');
        fs.writeFileSync(script, source);
        const staging = path.join(dir, 'staging');
        fs.mkdirSync(path.join(staging, 'api/scripts'), { recursive: true });
        fs.mkdirSync(path.join(staging, 'scripts'));
        fs.copyFileSync(helper, path.join(staging, 'api/scripts/deploymentDatabase.js'));
        fs.copyFileSync(path.join(repo, 'api/config.js'), path.join(staging, 'api/config.js'));
        fs.copyFileSync(path.join(repo, 'scripts/smoke-test.js'), path.join(staging, 'scripts/smoke-test.js'));
        archive = path.join(dir, 'release.tar.gz');
        execFileSync('tar', ['-czf', archive, '-C', staging, '.']);
        env = {
            ...process.env,
            PATH: `${path.join(dir, 'bin')}:${process.env.PATH}`,
            NODE_PATH: path.join(repo, 'node_modules'),
            DB_PATH: dbPath,
            CALLS: path.join(dir, 'calls'),
            TEST_DIR: dir,
        };
    });

    afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

    it.each(['FAIL_MIGRATION', 'FAIL_START', 'FAIL_HEALTH', 'FAIL_SMOKE'])(
        'restores the application and database on %s',
        (failure) => {
            const result = activate({ [failure]: '1' });
            expect(result.status).toBe(1);
            expect(result.stderr).toContain('Rollback completed');
            expect(fs.realpathSync(path.join(root, 'current'))).toBe(previous);
            expect(sql(dbPath, 'SELECT body FROM notes', true)).toEqual([{ body: 'before' }]);
            expect(fs.readFileSync(env.CALLS, 'utf8').trim().endsWith('start campaign-notes.service')).toBe(true);
            expect(fs.readdirSync(root).filter((name) => name.startsWith('rollback.'))).toHaveLength(0);
        }
    );

    it('keeps the snapshot and leaves the service stopped if restoration fails', () => {
        const result = activate({ FAIL_SMOKE: '1', FAIL_RESTORE: '1' });
        expect(result.status).toBe(1);
        expect(result.stderr).toContain('database restore failed');
        expect(fs.readFileSync(env.CALLS, 'utf8').trim().endsWith('stop campaign-notes.service')).toBe(true);
        expect(fs.readdirSync(root).filter((name) => name.startsWith('rollback.'))).toHaveLength(1);
    });

    it('does not restore the database when the service cannot be stopped', () => {
        const result = activate({ FAIL_SMOKE: '1', FAIL_ROLLBACK_STOP: '1' });
        expect(result.status).toBe(1);
        expect(result.stderr).toContain('could not stop the service');
        expect(sql(dbPath, 'SELECT body FROM notes', true)).toEqual([{ body: 'before' }, { body: 'after' }]);
        expect(fs.readdirSync(root).filter((name) => name.startsWith('rollback.'))).toHaveLength(1);
    });

    it('restarts the previous service without migrating if the snapshot fails', () => {
        const result = activate({ DB_PATH: 'relative.db' });
        expect(result.status).toBe(1);
        expect(result.stderr).toContain('absolute persistent database path');
        expect(fs.realpathSync(path.join(root, 'current'))).toBe(previous);
        expect(sql(dbPath, 'SELECT body FROM notes', true)).toEqual([{ body: 'before' }]);
        expect(fs.readFileSync(env.CALLS, 'utf8').trim().endsWith('start campaign-notes.service')).toBe(true);
    });

    it('removes a newly created database after a failed first deployment', () => {
        fs.unlinkSync(path.join(root, 'current'));
        fs.unlinkSync(dbPath);
        const result = activate({ FAIL_MIGRATION: '1' });
        expect(result.status).toBe(1);
        expect(fs.existsSync(dbPath)).toBe(false);
        expect(fs.existsSync(path.join(root, 'current'))).toBe(false);
        expect(fs.readFileSync(env.CALLS, 'utf8')).not.toContain('start');
    });

    it('retains the migrated database when activation succeeds', () => {
        const result = activate();
        expect(result.status).toBe(0);
        expect(fs.realpathSync(path.join(root, 'current'))).not.toBe(previous);
        expect(sql(dbPath, 'SELECT body FROM notes', true)).toEqual([{ body: 'before' }, { body: 'after' }]);
        expect(fs.readdirSync(root).filter((name) => name.startsWith('rollback.'))).toHaveLength(0);
    });
});
