begin;

alter table public.reward_ledger
  add column if not exists delta_diamonds integer not null default 0,
  add column if not exists session_id uuid,
  add column if not exists session_sequence bigint,
  add column if not exists base_revision bigint,
  add column if not exists rules_version text,
  add column if not exists command_hash text,
  add column if not exists resource_before jsonb,
  add column if not exists resource_after jsonb,
  add column if not exists profile_before_hash text,
  add column if not exists profile_after_hash text;

create table if not exists public.economy_sessions (
  id uuid primary key,
  player_id uuid not null references auth.users(id) on delete cascade,
  base_revision bigint not null default 0,
  rules_version text not null,
  last_sequence bigint not null default 0 check (last_sequence >= 0),
  risk_score integer not null default 0 check (risk_score >= 0),
  state text not null default 'active' check (state in ('active', 'revoked', 'closed')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists economy_sessions_player_state_idx
  on public.economy_sessions(player_id, state, last_seen_at desc);

create table if not exists public.economy_risk_events (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.economy_sessions(id) on delete cascade,
  player_id uuid not null references auth.users(id) on delete cascade,
  points integer not null check (points > 0),
  code text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists economy_risk_events_player_created_idx
  on public.economy_risk_events(player_id, created_at desc);

create table if not exists public.payment_products (
  product_id text primary key,
  diamonds integer not null check (diamonds > 0),
  price_minor integer not null check (price_minor > 0),
  currency text not null,
  enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null references public.payment_products(product_id),
  provider text not null,
  diamonds integer not null check (diamonds > 0),
  price_minor integer not null check (price_minor > 0),
  currency text not null,
  state text not null default 'pending' check (state in ('pending', 'paid', 'cancelled', 'failed')),
  provider_transaction_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists payment_orders_player_created_idx
  on public.payment_orders(player_id, created_at desc);

create table if not exists public.wallet_transactions (
  id bigint generated always as identity primary key,
  order_id uuid not null unique references public.payment_orders(id),
  player_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_transaction_id text not null,
  diamonds integer not null check (diamonds > 0),
  payload_hash text not null,
  created_at timestamptz not null default now(),
  unique(provider, provider_transaction_id)
);

create or replace function public.economy_resource_envelope(p_profile jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'resources', coalesce(p_profile -> 'resources', '{}'::jsonb),
    'owned', coalesce(p_profile -> 'owned', '{}'::jsonb),
    'upgrades', coalesce(p_profile -> 'upgrades', '{}'::jsonb),
    'fighterUpgrades', coalesce(p_profile -> 'fighterUpgrades', '{}'::jsonb),
    'activeSkillGrades', coalesce(p_profile -> 'activeSkillGrades', '{}'::jsonb),
    'autoWeaponLevels', coalesce(p_profile -> 'autoWeaponLevels', '{}'::jsonb),
    'passiveSkills', coalesce(p_profile -> 'passiveSkills', '{}'::jsonb),
    'weaponModules', coalesce(p_profile -> 'weaponModules', '{}'::jsonb),
    'shipSkillLoadouts', coalesce(p_profile -> 'shipSkillLoadouts', '{}'::jsonb),
    'pilotRanks', coalesce(p_profile -> 'pilotRanks', '{}'::jsonb),
    'shipRanks', coalesce(p_profile -> 'shipRanks', '{}'::jsonb),
    'pilotStars', coalesce(p_profile -> 'pilotStars', '{}'::jsonb),
    'shipStars', coalesce(p_profile -> 'shipStars', '{}'::jsonb),
    'pilotCopies', coalesce(p_profile -> 'pilotCopies', '{}'::jsonb),
    'codex', coalesce(p_profile -> 'codex', '{}'::jsonb),
    'shopDailyPurchases', coalesce(p_profile -> 'shopDailyPurchases', '{}'::jsonb),
    'shopWeeklyPurchases', coalesce(p_profile -> 'shopWeeklyPurchases', '{}'::jsonb),
    'claimedDailyShop', coalesce(p_profile -> 'claimedDailyShop', '{}'::jsonb),
    'gacha', coalesce(p_profile -> 'gacha', '{}'::jsonb),
    'signIn', coalesce(p_profile -> 'signIn', '{}'::jsonb),
    'claimedAchievements', coalesce(p_profile -> 'claimedAchievements', '[]'::jsonb),
    'claimedTasks', coalesce(p_profile -> 'claimedTasks', '[]'::jsonb),
    'claimedDailyTasks', coalesce(p_profile -> 'claimedDailyTasks', '{}'::jsonb),
    'claimedDailyActivityRewards', coalesce(p_profile -> 'claimedDailyActivityRewards', '{}'::jsonb),
    'usedRedeemCodes', coalesce(p_profile -> 'usedRedeemCodes', '[]'::jsonb),
    'progress', coalesce(p_profile -> 'progress', '{}'::jsonb),
    'completed', coalesce(p_profile -> 'completed', '[]'::jsonb),
    'unlockedLevel', coalesce(p_profile -> 'unlockedLevel', '1'::jsonb),
    'playerProgression', jsonb_build_object(
      'level', coalesce(p_profile #> '{player,level}', '1'::jsonb),
      'exp', coalesce(p_profile #> '{player,exp}', '0'::jsonb),
      'totalExp', coalesce(p_profile #> '{player,totalExp}', '0'::jsonb)
    )
  );
$$;

create or replace function public.record_economy_risk(
  p_session_id uuid,
  p_user_id uuid,
  p_points integer,
  p_code text,
  p_details jsonb
)
returns table(risk_score integer, revoked boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_score integer;
  v_revoked boolean;
begin
  update public.economy_sessions
  set risk_score = public.economy_sessions.risk_score + greatest(0, p_points),
      state = case
        when public.economy_sessions.risk_score + greatest(0, p_points) >= 100 then 'revoked'
        else public.economy_sessions.state
      end,
      last_seen_at = now()
  where id = p_session_id
    and player_id = p_user_id
  returning public.economy_sessions.risk_score,
            public.economy_sessions.state = 'revoked'
  into v_score, v_revoked;

  if not found then
    raise exception 'ECONOMY_SESSION_NOT_FOUND';
  end if;

  insert into public.economy_risk_events(session_id, player_id, points, code, details)
  values (
    p_session_id,
    p_user_id,
    greatest(1, p_points),
    left(coalesce(p_code, 'UNKNOWN'), 80),
    coalesce(p_details, '{}'::jsonb)
  );

  return query select v_score, v_revoked;
end;
$$;

-- Every authoritative economy mutation records the complete resource envelope
-- before and after the change. Client-supplied final balances are never used.
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
  v_before jsonb;
  v_profile jsonb;
  v_revision bigint;
  v_session_id uuid;
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

  select current_profile.profile
  into v_before
  from public.player_profiles current_profile
  where current_profile.user_id = p_user_id;

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

  if nullif(p_payload #>> '{_economy,sessionId}', '') is not null then
    v_session_id := (p_payload #>> '{_economy,sessionId}')::uuid;
  end if;

  insert into public.reward_ledger(
    operation_id,
    player_id,
    action,
    delta_gold,
    delta_energy,
    delta_diamonds,
    payload,
    session_id,
    session_sequence,
    base_revision,
    rules_version,
    command_hash,
    resource_before,
    resource_after,
    profile_before_hash,
    profile_after_hash
  ) values (
    p_operation_id,
    p_user_id,
    p_action,
    p_delta_gold,
    p_delta_energy,
    coalesce((p_profile #>> '{resources,diamonds}')::integer, 0)
      - coalesce((v_before #>> '{resources,diamonds}')::integer, 0),
    coalesce(p_payload, '{}'::jsonb),
    v_session_id,
    nullif(p_payload #>> '{_economy,sequence}', '')::bigint,
    nullif(p_payload #>> '{_economy,baseRevision}', '')::bigint,
    nullif(p_payload #>> '{_economy,rulesVersion}', ''),
    nullif(p_payload #>> '{_economy,commandHash}', ''),
    public.economy_resource_envelope(v_before),
    public.economy_resource_envelope(p_profile),
    encode(extensions.digest(convert_to(v_before::text, 'UTF8'), 'sha256'), 'hex'),
    encode(extensions.digest(convert_to(p_profile::text, 'UTF8'), 'sha256'), 'hex')
  );

  return query select true, v_profile, v_revision;
end;
$$;

create or replace function public.settle_payment_order(
  p_order_id uuid,
  p_provider text,
  p_provider_transaction_id text,
  p_payload_hash text
)
returns table(profile jsonb, revision bigint, diamonds integer, already_applied boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.payment_orders%rowtype;
  v_before jsonb;
  v_after jsonb;
  v_revision bigint;
begin
  select *
  into v_order
  from public.payment_orders
  where id = p_order_id
  for update;

  if not found then raise exception 'PAYMENT_ORDER_NOT_FOUND'; end if;
  if v_order.provider <> p_provider then raise exception 'PAYMENT_PROVIDER_MISMATCH'; end if;

  if v_order.state = 'paid' then
    if v_order.provider_transaction_id <> p_provider_transaction_id then
      raise exception 'PAYMENT_TRANSACTION_MISMATCH';
    end if;
    return query
      select current_profile.profile,
             current_profile.revision,
             v_order.diamonds,
             true
      from public.player_profiles current_profile
      where current_profile.user_id = v_order.player_id;
    return;
  end if;
  if v_order.state <> 'pending' then raise exception 'PAYMENT_ORDER_NOT_PAYABLE'; end if;

  select current_profile.profile, current_profile.revision
  into v_before, v_revision
  from public.player_profiles current_profile
  where current_profile.user_id = v_order.player_id
  for update;

  v_after := jsonb_set(
    v_before,
    '{resources,diamonds}',
    to_jsonb(coalesce((v_before #>> '{resources,diamonds}')::integer, 0) + v_order.diamonds),
    true
  );

  update public.player_profiles
  set profile = v_after,
      revision = public.player_profiles.revision + 1
  where user_id = v_order.player_id
  returning public.player_profiles.revision into v_revision;

  insert into public.wallet_transactions(
    order_id, player_id, provider, provider_transaction_id, diamonds, payload_hash
  ) values (
    v_order.id, v_order.player_id, p_provider, p_provider_transaction_id, v_order.diamonds, p_payload_hash
  );

  update public.payment_orders
  set state = 'paid',
      provider_transaction_id = p_provider_transaction_id,
      paid_at = now(),
      updated_at = now()
  where id = v_order.id;

  insert into public.reward_ledger(
    operation_id,
    player_id,
    action,
    delta_gold,
    delta_energy,
    delta_diamonds,
    payload,
    base_revision,
    resource_before,
    resource_after,
    profile_before_hash,
    profile_after_hash
  ) values (
    v_order.id,
    v_order.player_id,
    'payment-credit',
    0,
    0,
    v_order.diamonds,
    jsonb_build_object(
      'orderId', v_order.id,
      'productId', v_order.product_id,
      'provider', p_provider,
      'providerTransactionId', p_provider_transaction_id
    ),
    v_revision - 1,
    public.economy_resource_envelope(v_before),
    public.economy_resource_envelope(v_after),
    encode(extensions.digest(convert_to(v_before::text, 'UTF8'), 'sha256'), 'hex'),
    encode(extensions.digest(convert_to(v_after::text, 'UTF8'), 'sha256'), 'hex')
  );

  return query select v_after, v_revision, v_order.diamonds, false;
end;
$$;

alter table public.economy_sessions enable row level security;
alter table public.economy_risk_events enable row level security;
alter table public.payment_products enable row level security;
alter table public.payment_orders enable row level security;
alter table public.wallet_transactions enable row level security;

revoke all on table public.economy_sessions from public, anon, authenticated;
revoke all on table public.economy_risk_events from public, anon, authenticated;
revoke all on table public.payment_products from public, anon, authenticated;
revoke all on table public.payment_orders from public, anon, authenticated;
revoke all on table public.wallet_transactions from public, anon, authenticated;

grant select, insert, update on table public.economy_sessions to service_role;
grant select, insert on table public.economy_risk_events to service_role;
grant select, insert, update on table public.payment_products to service_role;
grant select, insert, update on table public.payment_orders to service_role;
grant select, insert on table public.wallet_transactions to service_role;
grant usage, select on sequence public.economy_risk_events_id_seq to service_role;
grant usage, select on sequence public.wallet_transactions_id_seq to service_role;

revoke all on function public.economy_resource_envelope(jsonb) from public, anon, authenticated;
revoke all on function public.record_economy_risk(uuid, uuid, integer, text, jsonb) from public, anon, authenticated;
revoke all on function public.settle_payment_order(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.economy_resource_envelope(jsonb) to service_role;
grant execute on function public.record_economy_risk(uuid, uuid, integer, text, jsonb) to service_role;
grant execute on function public.settle_payment_order(uuid, text, text, text) to service_role;

commit;
