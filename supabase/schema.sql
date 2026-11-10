-- ARCO POLÍTICO: esquema mínimo. Se accede solo desde el servidor (RLS activado, sin políticas).
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  admin_hash text not null unique,
  title text not null,
  description text,
  closes_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  results_mode text not null default 'on_vote' check (results_mode in ('on_vote','after_votes','on_close')),
  results_min int not null default 5 check (results_min between 5 and 1000)
);
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  position int not null,
  name text not null,
  kind text not null check (kind in ('party','person')),
  photo text
);
create table if not exists responses (
  campaign_id uuid not null references campaigns(id) on delete cascade,
  voter_hash text not null,
  ratings jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (campaign_id, voter_hash)
);
-- Bases de datos creadas antes de esta opción:
alter table campaigns add column if not exists results_mode text not null default 'on_vote' check (results_mode in ('on_vote','after_votes','on_close'));
alter table campaigns add column if not exists results_min int not null default 5 check (results_min between 5 and 1000);
create index if not exists items_campaign_idx on items(campaign_id, position);
alter table campaigns enable row level security;
alter table items enable row level security;
alter table responses enable row level security;
