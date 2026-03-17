import { Database } from "bun:sqlite";
import { mkdirSync } from "fs";

const dbPath = process.env.DATABASE_PATH ?? "data/app.db";

// Ensure data/ directory exists
mkdirSync(dbPath.split("/").slice(0, -1).join("/"), { recursive: true });

const db = new Database(dbPath);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

// ── better-auth core tables ────────────────────────────────────────────────

db.exec(`
CREATE TABLE IF NOT EXISTS user (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  emailVerified INTEGER NOT NULL DEFAULT 0,
  image         TEXT,
  createdAt     TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt     TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS session (
  id          TEXT PRIMARY KEY,
  userId      TEXT NOT NULL,
  token       TEXT NOT NULL UNIQUE,
  expiresAt   TEXT NOT NULL,
  ipAddress   TEXT,
  userAgent   TEXT,
  createdAt   TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS account (
  id                    TEXT PRIMARY KEY,
  userId                TEXT NOT NULL,
  accountId             TEXT NOT NULL,
  providerId            TEXT NOT NULL,
  accessToken           TEXT,
  refreshToken          TEXT,
  accessTokenExpiresAt  TEXT,
  refreshTokenExpiresAt TEXT,
  scope                 TEXT,
  idToken               TEXT,
  password              TEXT,
  createdAt             TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS verification (
  id         TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value      TEXT NOT NULL,
  expiresAt  TEXT NOT NULL,
  createdAt  TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt  TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// ── Application tables ─────────────────────────────────────────────────────

db.exec(`
CREATE TABLE IF NOT EXISTS notes (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  title        TEXT NOT NULL DEFAULT 'Untitled note',
  content_json TEXT NOT NULL DEFAULT '{"type":"doc","content":[]}',
  is_public    INTEGER NOT NULL DEFAULT 0,
  public_slug  TEXT UNIQUE,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS note_shares (
  id          TEXT PRIMARY KEY,
  note_id     TEXT NOT NULL,
  shared_by   TEXT NOT NULL,
  recipient   TEXT NOT NULL,
  method      TEXT NOT NULL CHECK(method IN ('email', 'sms')),
  sent_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (note_id)   REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (shared_by) REFERENCES user(id)  ON DELETE CASCADE
);
`);

// ── Indexes ────────────────────────────────────────────────────────────────

db.exec(`
CREATE INDEX IF NOT EXISTS idx_notes_user_id     ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_public_slug ON notes(public_slug);
CREATE INDEX IF NOT EXISTS idx_notes_is_public   ON notes(is_public);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at  ON notes(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_shares_note_id    ON note_shares(note_id);
CREATE INDEX IF NOT EXISTS idx_shares_shared_by  ON note_shares(shared_by);
CREATE INDEX IF NOT EXISTS idx_shares_sent_at    ON note_shares(shared_by, sent_at DESC);
`);

db.close();
console.log(`✓ Database initialized at ${dbPath}`);
