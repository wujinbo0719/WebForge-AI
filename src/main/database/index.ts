import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = path.join(app.getPath('userData'), 'webforge.db')
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    runMigrations(db)
  }
  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

function runMigrations(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `)

  const migrations = getMigrations()
  const applied = new Set(
    (database.prepare('SELECT name FROM migrations').all() as { name: string }[]).map(
      (r) => r.name
    )
  )

  for (const migration of migrations) {
    if (!applied.has(migration.name)) {
      database.exec(migration.sql)
      database.prepare('INSERT INTO migrations (name) VALUES (?)').run(migration.name)
    }
  }
}

function getMigrations(): { name: string; sql: string }[] {
  return [
    {
      name: '001_create_projects',
      sql: `
        CREATE TABLE projects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          industry TEXT NOT NULL,
          domain TEXT,
          website_type TEXT NOT NULL DEFAULT 'multi-page',
          status TEXT NOT NULL DEFAULT 'draft',
          config_json TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        );
      `
    },
    {
      name: '002_create_templates',
      sql: `
        CREATE TABLE templates (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          industry TEXT,
          description TEXT,
          config_json TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        );
      `
    },
    {
      name: '003_create_settings',
      sql: `
        CREATE TABLE settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `
    }
  ]
}
