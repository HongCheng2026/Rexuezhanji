begin;

-- Keep one relation for each unordered player pair. This also closes the race where
-- both players send a request at the same time.
delete from public.friend_relations older
using public.friend_relations newer
where older.id > newer.id
  and least(older.from_player::text, older.to_player::text) = least(newer.from_player::text, newer.to_player::text)
  and greatest(older.from_player::text, older.to_player::text) = greatest(newer.from_player::text, newer.to_player::text);

create unique index if not exists friend_relations_unordered_pair_key
  on public.friend_relations (
    least(from_player::text, to_player::text),
    greatest(from_player::text, to_player::text)
  );

-- The browser never talks to social tables directly. All authorization and
-- validation is kept inside game-api.
drop policy if exists "leaderboard_public_read" on public.leaderboard_entries;
drop policy if exists "leaderboard_owner_write" on public.leaderboard_entries;
drop policy if exists "leaderboard_owner_update" on public.leaderboard_entries;
drop policy if exists "friend_participant_select" on public.friend_relations;
drop policy if exists "friend_participant_insert" on public.friend_relations;
drop policy if exists "friend_participant_update" on public.friend_relations;
drop policy if exists "friend_participant_delete" on public.friend_relations;
drop policy if exists "chat_public_read" on public.chat_messages;
drop policy if exists "chat_owner_write" on public.chat_messages;

revoke all on table public.leaderboard_entries from public, anon, authenticated;
revoke all on table public.friend_relations from public, anon, authenticated;
revoke all on table public.chat_messages from public, anon, authenticated;
grant select, insert, update, delete on table public.leaderboard_entries to service_role;
grant select, insert, update, delete on table public.friend_relations to service_role;
grant select, insert, delete on table public.chat_messages to service_role;
grant usage, select on sequence public.leaderboard_entries_id_seq to service_role;
grant usage, select on sequence public.friend_relations_id_seq to service_role;
grant usage, select on sequence public.chat_messages_id_seq to service_role;

create table if not exists public.endless_sessions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users(id) on delete cascade,
  ticket_hash text not null unique,
  state text not null default 'started' check (state in ('started', 'settled', 'abandoned')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  settled_at timestamptz,
  kills integer not null default 0 check (kills >= 0),
  survival_seconds integer not null default 0 check (survival_seconds >= 0)
);

create index if not exists endless_sessions_player_state_idx
  on public.endless_sessions(player_id, state, started_at desc);

create table if not exists public.endless_records (
  player_id uuid primary key references auth.users(id) on delete cascade,
  best_kills integer not null default 0 check (best_kills >= 0),
  best_survival_seconds integer not null default 0 check (best_survival_seconds >= 0),
  updated_at timestamptz not null default now()
);

alter table public.endless_sessions enable row level security;
alter table public.endless_records enable row level security;
revoke all on table public.endless_sessions from public, anon, authenticated;
revoke all on table public.endless_records from public, anon, authenticated;
grant select, insert, update on table public.endless_sessions to service_role;
grant select, insert, update on table public.endless_records to service_role;

-- Profile mutations and their ledger entry are committed together. operation_id
-- makes retries safe: a repeated request returns the already committed profile.
create or replace function public.commit_profile_operation(
  p_user_id uuid,
  p_expected_revision bigint,
  p_profile jsonb,
  p_save_version integer,
  p_operation_id uuid,
  p_action text,
  p_delta_gold integer,
  p_delta_energy integer,
  p_payload jsonb
)
returns table(applied boolean, profile jsonb, revision bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile jsonb;
  v_revision bigint;
begin
  if exists (
    select 1 from public.reward_ledger
    where operation_id = p_operation_id and player_id = p_user_id
  ) then
    return query
      select false, current_profile.profile, current_profile.revision
      from public.player_profiles current_profile
      where current_profile.user_id = p_user_id;
    return;
  end if;

  update public.player_profiles
  set profile = p_profile,
      save_version = p_save_version,
      revision = public.player_profiles.revision + 1
  where user_id = p_user_id
    and public.player_profiles.revision = p_expected_revision
  returning public.player_profiles.profile, public.player_profiles.revision
    into v_profile, v_revision;

  if not found then
    raise exception 'PROFILE_CONFLICT';
  end if;

  insert into public.reward_ledger(
    operation_id, player_id, action, delta_gold, delta_energy, payload
  ) values (
    p_operation_id, p_user_id, p_action, p_delta_gold, p_delta_energy,
    coalesce(p_payload, '{}'::jsonb)
  );

  return query select true, v_profile, v_revision;
end;
$$;

create or replace function public.commit_endless_result(
  p_user_id uuid,
  p_session_id uuid,
  p_kills integer,
  p_survival_seconds integer
)
returns table(best_kills integer, best_survival_seconds integer)
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.endless_sessions
  set state = 'settled',
      settled_at = now(),
      kills = greatest(0, p_kills),
      survival_seconds = greatest(0, p_survival_seconds)
  where id = p_session_id
    and player_id = p_user_id
    and state = 'started';

  if not found then
    raise exception 'ENDLESS_ALREADY_SETTLED';
  end if;

  insert into public.endless_records(player_id, best_kills, best_survival_seconds)
  values (p_user_id, greatest(0, p_kills), greatest(0, p_survival_seconds))
  on conflict (player_id) do update
  set best_kills = greatest(public.endless_records.best_kills, excluded.best_kills),
      best_survival_seconds = greatest(public.endless_records.best_survival_seconds, excluded.best_survival_seconds),
      updated_at = now();

  return query
    select record.best_kills, record.best_survival_seconds
    from public.endless_records record
    where record.player_id = p_user_id;
end;
$$;

revoke all on function public.commit_profile_operation(uuid, bigint, jsonb, integer, uuid, text, integer, integer, jsonb) from public, anon, authenticated;
revoke all on function public.commit_endless_result(uuid, uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.commit_profile_operation(uuid, bigint, jsonb, integer, uuid, text, integer, integer, jsonb) to service_role;
grant execute on function public.commit_endless_result(uuid, uuid, integer, integer) to service_role;

commit;
