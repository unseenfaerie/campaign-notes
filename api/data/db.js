// db.js - SQLite database initialization using domainManifest-driven SQL
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { buildAllCreateTableSql } = require('./schemaBuilder');

const dbPath = path.join(__dirname, '../campaign.db');
const db = new sqlite3.Database(dbPath);

function runStatement(sql) {
  return new Promise((resolve, reject) => {
    db.run(sql, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function getAuthCreateTableSql() {
  return [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('dm', 'player', 'viewer')),
      disabled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS refresh_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      refresh_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      rotated_from TEXT,
      rotated_to TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_refresh_sessions_user_id ON refresh_sessions(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_refresh_sessions_expires_at ON refresh_sessions(expires_at)`,
    `CREATE TABLE IF NOT EXISTS wiki_content_slices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_slug TEXT NOT NULL,
      section_key TEXT NOT NULL,
      content_json TEXT NOT NULL,
      visibility_policy TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(page_slug, section_key)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_wiki_content_slices_page_slug ON wiki_content_slices(page_slug)`,
  ];
}

async function initializeDatabase() {
  const statements = [...buildAllCreateTableSql(), ...getAuthCreateTableSql()];

  // Keep FK enforcement aligned with table definitions at runtime.
  await runStatement('PRAGMA foreign_keys = ON');

  for (const sql of statements) {
    await runStatement(sql);

    const tableMatch = sql.match(/CREATE TABLE IF NOT EXISTS\s+([a-zA-Z0-9_]+)/i);
    if (tableMatch) {
      console.log(`Created or verified table: ${tableMatch[1]}`);
    }
  }

  console.log('Database tables created or verified from domainManifest.');
}

if (require.main === module) {
  initializeDatabase()
    .then(() => db.close())
    .catch((err) => {
      console.error('Database initialization failed:', err.message);
      db.close();
      process.exitCode = 1;
    });
}

module.exports = {
  db,
  initializeDatabase,
};
