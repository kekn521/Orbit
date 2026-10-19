CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY,
  resource TEXT NOT NULL,
  body TEXT NOT NULL CHECK(json_valid(body)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  demo INTEGER NOT NULL DEFAULT 0 CHECK(demo IN (0, 1))
);
CREATE INDEX IF NOT EXISTS records_resource ON records(resource);
CREATE UNIQUE INDEX IF NOT EXISTS unique_checkin ON records(json_extract(body, '$.habitId'), json_extract(body, '$.date')) WHERE resource = 'checkins';
CREATE UNIQUE INDEX IF NOT EXISTS unique_budget ON records(json_extract(body, '$.category'), json_extract(body, '$.currency')) WHERE resource = 'budgets';
CREATE UNIQUE INDEX IF NOT EXISTS single_settings ON records(resource) WHERE resource = 'settings';
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resource TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  occurred_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
INSERT OR IGNORE INTO migrations VALUES (1, CURRENT_TIMESTAMP);
