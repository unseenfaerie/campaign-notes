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

async function initializeDatabase() {
  const statements = buildAllCreateTableSql();

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
