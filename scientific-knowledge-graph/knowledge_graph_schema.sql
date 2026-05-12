-- Issue #17 foundation schema (entities + relationships)

CREATE TABLE IF NOT EXISTS kg_entities (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  source_ref TEXT,
  attributes JSONB NOT NULL DEFAULT {}::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kg_relationships (
  id TEXT PRIMARY KEY,
  src_entity_id TEXT NOT NULL REFERENCES kg_entities(id) ON DELETE CASCADE,
  dst_entity_id TEXT NOT NULL REFERENCES kg_entities(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL,
  confidence NUMERIC(5,4) NOT NULL DEFAULT 0.0,
  provenance JSONB NOT NULL DEFAULT {}::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
