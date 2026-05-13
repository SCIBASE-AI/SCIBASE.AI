-- Foundation schema for issue #12
CREATE TABLE IF NOT EXISTS realtime_collaboration_editor_core (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  payload JSONB NOT NULL DEFAULT {}::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
