-- Foundation schema for issue #13
CREATE TABLE IF NOT EXISTS ai_assisted_research_tools_mvp_core (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  payload JSONB NOT NULL DEFAULT {}::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
