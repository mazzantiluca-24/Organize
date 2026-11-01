CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  parent TEXT NOT NULL DEFAULT '',
  text TEXT NOT NULL,
  ord REAL NOT NULL DEFAULT 0,
  done INTEGER NOT NULL DEFAULT 0,
  collapsed INTEGER NOT NULL DEFAULT 0,
  due_date TEXT,
  due_time TEXT,
  remind TEXT,
  repeat TEXT,
  notes TEXT,
  color TEXT,
  icon TEXT,
  remind_at TEXT,
  notified_at TEXT,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS items_remind ON items(remind_at) WHERE notified_at IS NULL AND done = 0;
CREATE TABLE IF NOT EXISTS push_subs (
  endpoint TEXT PRIMARY KEY,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  label TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);
