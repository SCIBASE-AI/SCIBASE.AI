-- Foundation schema for issue #11
CREATE TABLE IF NOT EXISTS user_project_management_core (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  payload JSONB NOT NULL DEFAULT {}::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
