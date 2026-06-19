create extension if not exists pgcrypto;

create table if not exists public.player_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  save_version integer not null default 4,
  profile jsonb not null default '{}'::jsonb,
  revision bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.battle_sessions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users(id) on delete cascade,
  level_id text not null,
  ticket_hash text not null unique,
  state text not null default 'started' check (state in ('started', 'settled', 'abandoned')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  settled_at timestamptz,
  settlement jsonb
);

create table if not exists public.reward_ledger (
  id bigint generated always as identity primary key,
  player_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null unique,
  action text not null,
  delta_gold integer not null default 0,
  delta_energy integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists player_profiles_touch_updated_at on public.player_profiles;
create trigger player_profiles_touch_updated_at before update on public.player_profiles
for each row execute function public.touch_updated_at();

alter table public.player_profiles enable row level security;
alter table public.battle_sessions enable row level security;
alter table public.reward_ledger enable row level security;
revoke all on public.player_profiles from anon, authenticated;
revoke all on public.battle_sessions from anon, authenticated;
revoke all on public.reward_ledger from anon, authenticated;
