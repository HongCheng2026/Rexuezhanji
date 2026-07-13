create sequence if not exists public.player_public_uid_seq
  as bigint
  start with 100000001
  increment by 1;

alter table public.player_profiles
  add column if not exists public_uid bigint;

alter table public.player_profiles
  alter column public_uid set default nextval('public.player_public_uid_seq');

update public.player_profiles
set public_uid = nextval('public.player_public_uid_seq')
where public_uid is null;

select setval(
  'public.player_public_uid_seq',
  greatest(100000000, coalesce((select max(public_uid) from public.player_profiles), 100000000)),
  true
);

alter table public.player_profiles
  alter column public_uid set not null;

create unique index if not exists player_profiles_public_uid_key
  on public.player_profiles(public_uid);

alter table public.player_profiles
  drop constraint if exists player_profiles_public_uid_range;

alter table public.player_profiles
  add constraint player_profiles_public_uid_range check (public_uid >= 100000001);
