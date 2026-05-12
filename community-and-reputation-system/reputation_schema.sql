-- Community & User Reputation System schema (Issue #15)
-- Postgres-first, event-sourced reputation model.

create table if not exists users (
  id uuid primary key,
  handle text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists reputation_action_type (
  action_type text primary key,
  default_weight integer not null,
  positive_signal boolean not null,
  description text not null
);

insert into reputation_action_type (action_type, default_weight, positive_signal, description) values
  ('paper_published', 20, true, 'Peer-visible publication completed'),
  ('dataset_shared', 15, true, 'Reusable dataset published'),
  ('code_merged', 18, true, 'Contribution merged to mainline'),
  ('helpful_review', 10, true, 'Review marked helpful by recipient'),
  ('issue_resolved', 8, true, 'Issue closed by accepted contribution'),
  ('abuse_report_confirmed', -35, false, 'Confirmed abuse / policy violation'),
  ('plagiarism_confirmed', -60, false, 'Confirmed plagiarism event'),
  ('spam_confirmed', -25, false, 'Confirmed spam or manipulation')
on conflict (action_type) do nothing;

create table if not exists reputation_event (
  id uuid primary key,
  user_id uuid not null references users(id),
  action_type text not null references reputation_action_type(action_type),
  reference_kind text not null,
  reference_id text not null,
  raw_delta integer not null,
  weighted_delta integer not null,
  confidence numeric(5,4) not null default 1.0000,
  metadata jsonb not null default '{}'::jsonb,
  created_by text not null,
  created_at timestamptz not null default now(),
  unique (user_id, action_type, reference_kind, reference_id)
);

create index if not exists idx_reputation_event_user_time
  on reputation_event(user_id, created_at desc);

create table if not exists reputation_snapshot (
  user_id uuid primary key references users(id),
  total_score integer not null default 0,
  positive_score integer not null default 0,
  negative_score integer not null default 0,
  badge_tier text not null default 'bronze',
  trust_state text not null default 'normal',
  updated_at timestamptz not null default now()
);

create table if not exists moderation_action (
  id uuid primary key,
  target_user_id uuid not null references users(id),
  action text not null,
  reason text not null,
  source_event_id uuid references reputation_event(id),
  expires_at timestamptz,
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists reputation_appeal (
  id uuid primary key,
  target_user_id uuid not null references users(id),
  moderation_action_id uuid not null references moderation_action(id),
  status text not null default 'open',
  rationale text not null,
  resolution_notes text,
  resolved_by text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
