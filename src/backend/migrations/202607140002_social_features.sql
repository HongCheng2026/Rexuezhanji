-- Social features: leaderboard, friend system, world chat
-- Phase 1 - Useful scope

-- 1. Add online status tracking to player_profiles
alter table public.player_profiles
  add column if not exists last_seen_at timestamptz not null default now();

create index if not exists idx_player_profiles_public_uid
  on public.player_profiles(public_uid);

-- 2. Leaderboard snapshots
create table if not exists public.leaderboard_entries (
  id bigint generated always as identity primary key,
  player_id uuid not null,
  public_uid bigint not null,
  player_name text not null,
  category text not null check (category in ('power', 'clear', 'honor')),
  score bigint not null,
  season int not null default 1,
  updated_at timestamptz not null default now(),
  constraint leaderboard_entries_player_unique unique (player_id, category, season)
);

create index if not exists idx_leaderboard_category_season_score
  on public.leaderboard_entries(category, season, score desc);

-- 3. Friend relations (bidirectional)
create table if not exists public.friend_relations (
  id bigint generated always as identity primary key,
  from_player uuid not null,
  to_player uuid not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friend_relations_unique unique(from_player, to_player),
  constraint friend_relations_no_self check (from_player <> to_player)
);

create index if not exists idx_friend_to_player_status
  on public.friend_relations(to_player, status);

create index if not exists idx_friend_from_player_status
  on public.friend_relations(from_player, status);

create or replace function public.touch_friend_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists friend_relations_touch_updated_at on public.friend_relations;
create trigger friend_relations_touch_updated_at before update on public.friend_relations
for each row execute function public.touch_friend_updated_at();

-- 4. Chat messages
create table if not exists public.chat_messages (
  id bigint generated always as identity primary key,
  player_id uuid not null,
  public_uid bigint not null,
  player_name text not null,
  channel text not null check (channel in ('world', 'friend', 'system', 'guild')),
  message text not null check (char_length(message) > 0 and char_length(message) <= 200),
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_channel_created
  on public.chat_messages(channel, created_at desc);

-- 5. RLS: leaderboard — public read, owner-only write
alter table public.leaderboard_entries enable row level security;
drop policy if exists "leaderboard_public_read" on public.leaderboard_entries;
create policy "leaderboard_public_read" on public.leaderboard_entries
  for select using (true);

drop policy if exists "leaderboard_owner_write" on public.leaderboard_entries;
create policy "leaderboard_owner_write" on public.leaderboard_entries
  for insert with check (auth.uid() = player_id);

drop policy if exists "leaderboard_owner_update" on public.leaderboard_entries;
create policy "leaderboard_owner_update" on public.leaderboard_entries
  for update using (auth.uid() = player_id) with check (auth.uid() = player_id);

-- 6. RLS: friend_relations — only participants can read/write their own relations
alter table public.friend_relations enable row level security;
drop policy if exists "friend_participant_select" on public.friend_relations;
create policy "friend_participant_select" on public.friend_relations
  for select using (auth.uid() = from_player or auth.uid() = to_player);

drop policy if exists "friend_participant_insert" on public.friend_relations;
create policy "friend_participant_insert" on public.friend_relations
  for insert with check (auth.uid() = from_player);

drop policy if exists "friend_participant_update" on public.friend_relations;
create policy "friend_participant_update" on public.friend_relations
  for update using (auth.uid() = to_player);

drop policy if exists "friend_participant_delete" on public.friend_relations;
create policy "friend_participant_delete" on public.friend_relations
  for delete using (auth.uid() = from_player or auth.uid() = to_player);

-- 7. RLS: chat_messages — public read (world/guild), owner write
alter table public.chat_messages enable row level security;
drop policy if exists "chat_public_read" on public.chat_messages;
create policy "chat_public_read" on public.chat_messages
  for select using (true);

drop policy if exists "chat_owner_write" on public.chat_messages;
create policy "chat_owner_write" on public.chat_messages
  for insert with check (auth.uid() = player_id);

-- 8. Grant service_role access for Edge Function
grant select, insert, update, delete on table public.leaderboard_entries to service_role;
grant select, insert, update, delete on table public.friend_relations to service_role;
grant select, insert on table public.chat_messages to service_role;
