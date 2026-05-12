-- Enterprise Tooling schema (Issue #19)

create table if not exists enterprise_org (
  id uuid primary key,
  org_slug text not null unique,
  org_name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists enterprise_admin_user (
  id uuid primary key,
  org_id uuid not null references enterprise_org(id),
  email text not null,
  role text not null,
  created_at timestamptz not null default now(),
  unique (org_id, email)
);

create table if not exists enterprise_policy (
  id uuid primary key,
  org_id uuid not null references enterprise_org(id),
  policy_key text not null,
  policy_version integer not null,
  policy_payload jsonb not null,
  effective_at timestamptz not null default now(),
  created_by text not null,
  created_at timestamptz not null default now(),
  unique (org_id, policy_key, policy_version)
);

create table if not exists enterprise_audit_log (
  id uuid primary key,
  org_id uuid not null references enterprise_org(id),
  actor text not null,
  action text not null,
  target_type text not null,
  target_id text not null,
  severity text not null default 'info',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_enterprise_audit_log_org_time
  on enterprise_audit_log(org_id, created_at desc);

create table if not exists enterprise_webhook_endpoint (
  id uuid primary key,
  org_id uuid not null references enterprise_org(id),
  endpoint_url text not null,
  signing_key_ref text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists enterprise_webhook_delivery (
  id uuid primary key,
  endpoint_id uuid not null references enterprise_webhook_endpoint(id),
  event_type text not null,
  event_id text not null,
  attempt integer not null default 1,
  status text not null,
  response_code integer,
  response_excerpt text,
  next_retry_at timestamptz,
  created_at timestamptz not null default now(),
  unique (endpoint_id, event_id, attempt)
);

create table if not exists enterprise_usage_snapshot (
  org_id uuid not null references enterprise_org(id),
  snapshot_date date not null,
  active_users integer not null default 0,
  projects_count integer not null default 0,
  datasets_count integer not null default 0,
  api_calls integer not null default 0,
  storage_gb numeric(10,2) not null default 0,
  primary key (org_id, snapshot_date)
);
