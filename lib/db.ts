import { Database } from "bun:sqlite";

let _db: Database | null = null;

export function getDb(): Database {
  if (!_db) {
    _db = new Database(process.env.DATABASE_PATH ?? "data/app.db");
    _db.exec("PRAGMA journal_mode = WAL");
    _db.exec("PRAGMA synchronous = NORMAL");
    _db.exec("PRAGMA foreign_keys = ON");
  }
  return _db;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function query<T>(sql: string, params: any[] = []): T[] {
  return getDb().query(sql).all(...params) as T[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function get<T>(sql: string, params: any[] = []): T | undefined {
  return getDb().query(sql).get(...params) as T | undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function run(sql: string, params: any[] = []): void {
  getDb().query(sql).run(...params);
}
