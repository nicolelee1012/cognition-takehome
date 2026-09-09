import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { seed } from "./seed";

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), "data", "console.db");

let instance: Database.Database | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS kyc_cases (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_country TEXT NOT NULL,
  account_opened_at TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  status TEXT NOT NULL,
  assigned_reviewer_id TEXT NOT NULL REFERENCES users(id),
  submitted_at TEXT NOT NULL,
  risk_flags TEXT NOT NULL,
  documents TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS refund_requests (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  reason_code TEXT NOT NULL,
  status TEXT NOT NULL,
  assigned_reviewer_id TEXT NOT NULL REFERENCES users(id),
  submitted_at TEXT NOT NULL,
  original_charge_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS feature_flags (
  id TEXT PRIMARY KEY,
  flag_key TEXT NOT NULL,
  environment TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL,
  rollout_percentage INTEGER NOT NULL,
  scheduled_for TEXT,
  last_changed_at TEXT NOT NULL,
  last_changed_by_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tool_requests (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  workflow_summary TEXT NOT NULL,
  records TEXT NOT NULL,
  actions TEXT NOT NULL,
  role_notes TEXT NOT NULL,
  status TEXT NOT NULL,
  requested_by_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  devin_session_id TEXT,
  devin_session_url TEXT,
  devin_status TEXT,
  pull_request_url TEXT
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  reason TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_events(entity_type, entity_id);
`;

export function getDb(): Database.Database {
  if (instance) return instance;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA);
  seed(db);
  instance = db;
  return db;
}
