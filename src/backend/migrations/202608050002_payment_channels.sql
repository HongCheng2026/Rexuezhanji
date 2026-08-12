begin;

-- Payment catalog. Existing columns remain available to the first payment
-- skeleton; v2 callers use the normalized market/provider price table below.
alter table public.payment_products
  add column if not exists product_type text not null default 'diamonds',
  add column if not exists title text not null default '',
  add column if not exists description text not null default '',
  add column if not exists base_rewards jsonb not null default '[]'::jsonb,
  add column if not exists first_bonus_rewards jsonb not null default '[]'::jsonb,
  add column if not exists lifetime_limit integer,
  add column if not exists sort_order integer not null default 0;

alter table public.payment_products drop constraint if exists payment_products_product_type_check;
alter table public.payment_products add constraint payment_products_product_type_check
  check (product_type in ('diamonds', 'bundle'));

create table if not exists public.payment_product_prices (
  offer_id text not null references public.payment_products(product_id) on delete cascade,
  market text not null check (market in ('CN', 'GLOBAL')),
  provider text not null check (provider in ('wechat', 'paypal')),
  amount_minor integer not null check (amount_minor > 0),
  currency text not null check (currency in ('CNY', 'USD')),
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (offer_id, market, provider)
);

alter table public.payment_orders
  add column if not exists idempotency_key uuid,
  add column if not exists market text,
  add column if not exists payment_scene text,
  add column if not exists payment_status text not null default 'pending',
  add column if not exists fulfillment_status text not null default 'pending',
  add column if not exists refund_status text not null default 'none',
  add column if not exists provider_order_id text,
  add column if not exists provider_capture_id text,
  add column if not exists reward_snapshot jsonb not null default '[]'::jsonb,
  add column if not exists price_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists benefit_keys text[] not null default '{}'::text[],
  add column if not exists provider_payload jsonb not null default '{}'::jsonb,
  add column if not exists last_provider_sync_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists fulfilled_at timestamptz,
  add column if not exists refunded_at timestamptz;

alter table public.payment_orders drop constraint if exists payment_orders_state_check;
alter table public.payment_orders add constraint payment_orders_state_check check (
  state in ('pending', 'paid', 'cancelled', 'failed', 'expired', 'refunding', 'refunded', 'chargeback', 'debt')
);
alter table public.payment_orders drop constraint if exists payment_orders_market_check;
alter table public.payment_orders add constraint payment_orders_market_check
  check (market is null or market in ('CN', 'GLOBAL'));
alter table public.payment_orders drop constraint if exists payment_orders_payment_status_check;
alter table public.payment_orders add constraint payment_orders_payment_status_check check (
  payment_status in ('pending', 'approved', 'succeeded', 'failed', 'expired', 'cancelled', 'refunding', 'refunded', 'chargeback')
);
alter table public.payment_orders drop constraint if exists payment_orders_fulfillment_status_check;
alter table public.payment_orders add constraint payment_orders_fulfillment_status_check check (
  fulfillment_status in ('pending', 'processing', 'fulfilled', 'failed', 'reversed', 'debt')
);
alter table public.payment_orders drop constraint if exists payment_orders_refund_status_check;
alter table public.payment_orders add constraint payment_orders_refund_status_check check (
  refund_status in ('none', 'pending', 'completed', 'failed', 'chargeback')
);

update public.payment_orders set
  market = coalesce(market, case when currency = 'CNY' then 'CN' else 'GLOBAL' end),
  payment_status = case state when 'paid' then 'succeeded' when 'cancelled' then 'cancelled' when 'failed' then 'failed' else payment_status end,
  fulfillment_status = case state when 'paid' then 'fulfilled' else fulfillment_status end,
  reward_snapshot = case when reward_snapshot = '[]'::jsonb then jsonb_build_array(jsonb_build_object('type', 'diamonds', 'amount', diamonds)) else reward_snapshot end,
  price_snapshot = case when price_snapshot = '{}'::jsonb then jsonb_build_object('amountMinor', price_minor, 'currency', currency, 'provider', provider) else price_snapshot end;

create unique index if not exists payment_orders_player_idempotency_idx
  on public.payment_orders(player_id, idempotency_key)
  where idempotency_key is not null;
create unique index if not exists payment_orders_provider_order_idx
  on public.payment_orders(provider, provider_order_id)
  where provider_order_id is not null;
create unique index if not exists payment_orders_provider_capture_idx
  on public.payment_orders(provider, provider_capture_id)
  where provider_capture_id is not null;
create index if not exists payment_orders_pending_watch_idx
  on public.payment_orders(payment_status, fulfillment_status, created_at)
  where payment_status in ('pending', 'approved', 'succeeded') or fulfillment_status <> 'fulfilled';

create table if not exists public.payment_entitlements (
  player_id uuid not null references auth.users(id) on delete cascade,
  benefit_key text not null,
  order_id uuid not null references public.payment_orders(id) on delete cascade,
  state text not null check (state in ('reserved', 'claimed')),
  reserved_at timestamptz not null default now(),
  expires_at timestamptz,
  claimed_at timestamptz,
  primary key (player_id, benefit_key)
);

create table if not exists public.payment_events (
  id bigint generated always as identity primary key,
  provider text not null,
  event_id text not null,
  event_type text not null,
  order_id uuid references public.payment_orders(id) on delete set null,
  payload_hash text not null,
  verified boolean not null default false,
  processing_status text not null default 'received' check (processing_status in ('received', 'processed', 'ignored', 'failed')),
  error_code text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(provider, event_id)
);

create table if not exists public.payment_grants (
  order_id uuid primary key references public.payment_orders(id) on delete restrict,
  player_id uuid not null references auth.users(id) on delete cascade,
  reward_snapshot jsonb not null,
  provider_transaction_id text not null,
  granted_at timestamptz not null default now(),
  reversed_at timestamptz,
  reversal_event_id text
);

create table if not exists public.payment_resource_debts (
  id bigint generated always as identity primary key,
  player_id uuid not null references auth.users(id) on delete cascade,
  resource_type text not null check (resource_type in ('diamonds', 'item')),
  resource_id text not null default '',
  amount integer not null check (amount > 0),
  source_order_id uuid not null references public.payment_orders(id) on delete restrict,
  created_at timestamptz not null default now(),
  cleared_at timestamptz,
  unique(player_id, resource_type, resource_id, source_order_id)
);

create index if not exists payment_resource_debts_player_open_idx
  on public.payment_resource_debts(player_id, resource_type, resource_id)
  where cleared_at is null;

alter table public.payment_resource_debts drop constraint if exists payment_resource_debts_amount_check;
alter table public.payment_resource_debts add constraint payment_resource_debts_amount_check check (amount >= 0);

create table if not exists public.player_payment_compliance (
  player_id uuid primary key references auth.users(id) on delete cascade,
  cn_real_name_verified boolean not null default false,
  age_band text not null default 'unknown' check (age_band in ('unknown', 'adult', 'minor')),
  payment_allowed boolean not null default false,
  verified_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_oauth_states (
  state_hash text primary key,
  player_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null references public.payment_orders(id) on delete cascade,
  provider text not null check (provider = 'wechat'),
  consumed_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_admin_nonces (
  nonce text primary key,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Seed the authoritative catalog. Payment channels are still controlled by
-- Edge Function secrets; enabled prices alone never make a provider live.
insert into public.payment_products(
  product_id, diamonds, price_minor, currency, enabled, metadata,
  product_type, title, description, base_rewards, first_bonus_rewards, lifetime_limit, sort_order
) values
  ('diamond_60', 60, 600, 'CNY', true, '{}'::jsonb, 'diamonds', '钻石小包', '60 钻石', '[{"type":"diamonds","amount":60}]', '[{"type":"diamonds","amount":60}]', null, 10),
  ('diamond_300', 300, 3000, 'CNY', true, '{}'::jsonb, 'diamonds', '钻石补给', '300 钻石', '[{"type":"diamonds","amount":300}]', '[{"type":"diamonds","amount":300}]', null, 20),
  ('diamond_680', 680, 6800, 'CNY', true, '{}'::jsonb, 'diamonds', '钻石战备', '680 钻石', '[{"type":"diamonds","amount":680}]', '[{"type":"diamonds","amount":680}]', null, 30),
  ('diamond_1280', 1280, 12800, 'CNY', true, '{}'::jsonb, 'diamonds', '钻石库藏', '1280 钻石', '[{"type":"diamonds","amount":1280}]', '[{"type":"diamonds","amount":1280}]', null, 40),
  ('diamond_3280', 3280, 32800, 'CNY', true, '{}'::jsonb, 'diamonds', '钻石军需', '3280 钻石', '[{"type":"diamonds","amount":3280}]', '[{"type":"diamonds","amount":3280}]', null, 50),
  ('diamond_6480', 6480, 64800, 'CNY', true, '{}'::jsonb, 'diamonds', '钻石旗舰', '6480 钻石', '[{"type":"diamonds","amount":6480}]', '[{"type":"diamonds","amount":6480}]', null, 60),
  ('bundle_recruit', 60, 600, 'CNY', true, '{}'::jsonb, 'bundle', '新兵补给', '永久限购一次', '[{"type":"diamonds","amount":60},{"type":"item","itemId":"stamina_potion","amount":3}]', '[]', 1, 110),
  ('bundle_ace', 300, 3000, 'CNY', true, '{}'::jsonb, 'bundle', '王牌战备', '永久限购一次', '[{"type":"diamonds","amount":300},{"type":"item","itemId":"starlink_ticket","amount":1},{"type":"item","itemId":"auto_weapon_module_gold","amount":1}]', '[]', 1, 120),
  ('bundle_flagship', 680, 6800, 'CNY', true, '{}'::jsonb, 'bundle', '旗舰支援', '永久限购一次', '[{"type":"diamonds","amount":680},{"type":"item","itemId":"starlink_ticket","amount":3},{"type":"item","itemId":"auto_weapon_module_gold","amount":1}]', '[]', 1, 130)
on conflict (product_id) do update set
  diamonds = excluded.diamonds,
  product_type = excluded.product_type,
  title = excluded.title,
  description = excluded.description,
  base_rewards = excluded.base_rewards,
  first_bonus_rewards = excluded.first_bonus_rewards,
  lifetime_limit = excluded.lifetime_limit,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.payment_product_prices(offer_id, market, provider, amount_minor, currency, enabled)
values
  ('diamond_60', 'CN', 'wechat', 600, 'CNY', true), ('diamond_60', 'GLOBAL', 'paypal', 99, 'USD', true),
  ('diamond_300', 'CN', 'wechat', 3000, 'CNY', true), ('diamond_300', 'GLOBAL', 'paypal', 499, 'USD', true),
  ('diamond_680', 'CN', 'wechat', 6800, 'CNY', true), ('diamond_680', 'GLOBAL', 'paypal', 999, 'USD', true),
  ('diamond_1280', 'CN', 'wechat', 12800, 'CNY', true), ('diamond_1280', 'GLOBAL', 'paypal', 1999, 'USD', true),
  ('diamond_3280', 'CN', 'wechat', 32800, 'CNY', true), ('diamond_3280', 'GLOBAL', 'paypal', 4999, 'USD', true),
  ('diamond_6480', 'CN', 'wechat', 64800, 'CNY', true), ('diamond_6480', 'GLOBAL', 'paypal', 9999, 'USD', true),
  ('bundle_recruit', 'CN', 'wechat', 600, 'CNY', true), ('bundle_recruit', 'GLOBAL', 'paypal', 99, 'USD', true),
  ('bundle_ace', 'CN', 'wechat', 3000, 'CNY', true), ('bundle_ace', 'GLOBAL', 'paypal', 499, 'USD', true),
  ('bundle_flagship', 'CN', 'wechat', 6800, 'CNY', true), ('bundle_flagship', 'GLOBAL', 'paypal', 999, 'USD', true)
on conflict (offer_id, market, provider) do update set
  amount_minor = excluded.amount_minor,
  currency = excluded.currency,
  updated_at = now();

create or replace function public.create_payment_order_v2(
  p_player_id uuid,
  p_offer_id text,
  p_market text,
  p_provider text,
  p_payment_scene text,
  p_idempotency_key uuid
)
returns table(
  order_id uuid,
  offer_id text,
  amount_minor integer,
  currency text,
  reward_snapshot jsonb,
  benefit_keys text[],
  expires_at timestamptz,
  existing boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product public.payment_products%rowtype;
  v_price public.payment_product_prices%rowtype;
  v_order public.payment_orders%rowtype;
  v_rewards jsonb;
  v_keys text[] := '{}'::text[];
  v_key text;
  v_now timestamptz := now();
begin
  perform pg_advisory_xact_lock(hashtextextended(p_player_id::text || ':' || p_offer_id, 0));

  select * into v_order from public.payment_orders
  where player_id = p_player_id and idempotency_key = p_idempotency_key;
  if found then
    return query select v_order.id, v_order.product_id, v_order.price_minor, v_order.currency,
      v_order.reward_snapshot, v_order.benefit_keys, v_order.expires_at, true;
    return;
  end if;

  update public.payment_orders
    set state = 'expired', payment_status = 'expired', updated_at = v_now
    where player_id = p_player_id and payment_status = 'pending' and expires_at <= v_now;
  delete from public.payment_entitlements
    where player_id = p_player_id and state = 'reserved' and expires_at <= v_now;

  if exists (
    select 1 from public.payment_resource_debts
    where player_id = p_player_id and cleared_at is null and amount > 0
  ) then
    raise exception 'PAYMENT_DEBT_LOCKED';
  end if;

  select * into v_product from public.payment_products
    where product_id = p_offer_id and enabled = true;
  if not found then raise exception 'PAYMENT_PRODUCT_NOT_FOUND'; end if;

  select price.* into v_price from public.payment_product_prices price
    where price.offer_id = p_offer_id and price.market = p_market and price.provider = p_provider and price.enabled = true;
  if not found then raise exception 'PAYMENT_CHANNEL_PRICE_NOT_FOUND'; end if;

  v_rewards := v_product.base_rewards;
  if v_product.product_type = 'bundle' then
    v_key := 'bundle:' || p_offer_id;
    if exists (
      select 1 from public.payment_entitlements
      where player_id = p_player_id and benefit_key = v_key
        and (state = 'claimed' or expires_at > v_now)
    ) then raise exception 'PAYMENT_PRODUCT_LIMIT_REACHED'; end if;
    v_keys := array_append(v_keys, v_key);
  elsif jsonb_array_length(v_product.first_bonus_rewards) > 0 then
    v_key := 'first:' || p_offer_id;
    if not exists (
      select 1 from public.payment_entitlements
      where player_id = p_player_id and benefit_key = v_key
        and (state = 'claimed' or expires_at > v_now)
    ) then
      v_rewards := v_rewards || v_product.first_bonus_rewards;
      v_keys := array_append(v_keys, v_key);
    end if;
  end if;

  insert into public.payment_orders(
    player_id, product_id, provider, diamonds, price_minor, currency, state,
    idempotency_key, market, payment_scene, payment_status, fulfillment_status,
    reward_snapshot, price_snapshot, benefit_keys, expires_at
  ) values (
    p_player_id, p_offer_id, p_provider, v_product.diamonds, v_price.amount_minor, v_price.currency, 'pending',
    p_idempotency_key, p_market, left(coalesce(p_payment_scene, ''), 40), 'pending', 'pending',
    v_rewards, jsonb_build_object('amountMinor', v_price.amount_minor, 'currency', v_price.currency,
      'market', p_market, 'provider', p_provider), v_keys, v_now + interval '15 minutes'
  ) returning * into v_order;

  foreach v_key in array v_keys loop
    insert into public.payment_entitlements(player_id, benefit_key, order_id, state, expires_at)
    values (p_player_id, v_key, v_order.id, 'reserved', v_order.expires_at);
  end loop;

  return query select v_order.id, v_order.product_id, v_order.price_minor, v_order.currency,
    v_order.reward_snapshot, v_order.benefit_keys, v_order.expires_at, false;
end;
$$;

create or replace function public.fulfill_payment_order_v2(
  p_order_id uuid,
  p_provider text,
  p_provider_transaction_id text,
  p_provider_order_id text,
  p_amount_minor integer,
  p_currency text,
  p_event_id text,
  p_event_type text,
  p_payload_hash text
)
returns table(profile jsonb, revision bigint, already_applied boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.payment_orders%rowtype;
  v_before jsonb;
  v_after jsonb;
  v_revision bigint;
  v_reward jsonb;
  v_type text;
  v_item text;
  v_amount integer;
  v_debt integer;
  v_apply integer;
  v_remaining integer;
  v_debt_row record;
  v_event_inserted bigint;
begin
  select * into v_order from public.payment_orders where id = p_order_id for update;
  if not found then raise exception 'PAYMENT_ORDER_NOT_FOUND'; end if;
  if v_order.provider <> p_provider then raise exception 'PAYMENT_PROVIDER_MISMATCH'; end if;
  if v_order.price_minor <> p_amount_minor or v_order.currency <> upper(p_currency) then
    raise exception 'PAYMENT_AMOUNT_MISMATCH';
  end if;
  if v_order.payment_status in ('refunded', 'chargeback') then raise exception 'PAYMENT_ORDER_REVERSED'; end if;

  insert into public.payment_events(provider, event_id, event_type, order_id, payload_hash, verified)
  values (p_provider, p_event_id, p_event_type, p_order_id, p_payload_hash, true)
  on conflict (provider, event_id) do nothing returning id into v_event_inserted;

  if v_order.fulfillment_status = 'fulfilled' then
    if coalesce(v_order.provider_transaction_id, '') <> p_provider_transaction_id then
      raise exception 'PAYMENT_TRANSACTION_MISMATCH';
    end if;
    return query select current_profile.profile, current_profile.revision, true
      from public.player_profiles current_profile where current_profile.user_id = v_order.player_id;
    return;
  end if;
  if v_order.payment_status not in ('pending', 'approved', 'succeeded') then
    raise exception 'PAYMENT_ORDER_NOT_PAYABLE';
  end if;

  select current_profile.profile, current_profile.revision into v_before, v_revision
    from public.player_profiles current_profile where current_profile.user_id = v_order.player_id for update;
  if not found then raise exception 'PAYMENT_PROFILE_NOT_FOUND'; end if;
  v_after := v_before;

  for v_reward in select value from jsonb_array_elements(v_order.reward_snapshot) loop
    v_type := v_reward ->> 'type';
    v_amount := greatest(0, coalesce((v_reward ->> 'amount')::integer, 0));
    if v_amount = 0 then continue; end if;
    if v_type = 'diamonds' then
      v_remaining := v_amount;
      for v_debt_row in select id, amount from public.payment_resource_debts
        where player_id = v_order.player_id and resource_type = 'diamonds' and resource_id = '' and cleared_at is null
        order by created_at, id for update
      loop
        exit when v_remaining <= 0;
        update public.payment_resource_debts set
          amount = greatest(0, v_debt_row.amount - v_remaining),
          cleared_at = case when v_debt_row.amount <= v_remaining then now() else null end
        where id = v_debt_row.id;
        v_remaining := greatest(0, v_remaining - v_debt_row.amount);
      end loop;
      v_apply := v_remaining;
      v_after := jsonb_set(v_after, '{resources,diamonds}',
        to_jsonb(coalesce((v_after #>> '{resources,diamonds}')::integer, 0) + v_apply), true);
    elsif v_type = 'item' then
      v_item := left(coalesce(v_reward ->> 'itemId', ''), 80);
      if v_item = '' then continue; end if;
      v_remaining := v_amount;
      for v_debt_row in select id, amount from public.payment_resource_debts
        where player_id = v_order.player_id and resource_type = 'item' and resource_id = v_item and cleared_at is null
        order by created_at, id for update
      loop
        exit when v_remaining <= 0;
        update public.payment_resource_debts set
          amount = greatest(0, v_debt_row.amount - v_remaining),
          cleared_at = case when v_debt_row.amount <= v_remaining then now() else null end
        where id = v_debt_row.id;
        v_remaining := greatest(0, v_remaining - v_debt_row.amount);
      end loop;
      v_apply := v_remaining;
      v_after := jsonb_set(v_after, array['resources','inventory',v_item],
        to_jsonb(coalesce((v_after #>> array['resources','inventory',v_item])::integer, 0) + v_apply), true);
    end if;
  end loop;

  v_after := jsonb_set(v_after, '{paymentDebtLocked}', to_jsonb(exists(
    select 1 from public.payment_resource_debts where player_id = v_order.player_id and cleared_at is null and amount > 0
  )), true);

  update public.player_profiles set profile = v_after, revision = public.player_profiles.revision + 1
    where user_id = v_order.player_id returning public.player_profiles.revision into v_revision;

  insert into public.payment_grants(order_id, player_id, reward_snapshot, provider_transaction_id)
  values (v_order.id, v_order.player_id, v_order.reward_snapshot, p_provider_transaction_id);

  insert into public.wallet_transactions(order_id, player_id, provider, provider_transaction_id, diamonds, payload_hash)
  values (v_order.id, v_order.player_id, p_provider, p_provider_transaction_id,
    greatest(1, coalesce((select sum((entry.reward ->> 'amount')::integer) from jsonb_array_elements(v_order.reward_snapshot) as entry(reward) where entry.reward ->> 'type' = 'diamonds'), 0)),
    p_payload_hash);

  update public.payment_entitlements set state = 'claimed', claimed_at = now(), expires_at = null
    where order_id = v_order.id and state = 'reserved';

  update public.payment_orders set
    state = 'paid', payment_status = 'succeeded', fulfillment_status = 'fulfilled',
    provider_transaction_id = p_provider_transaction_id,
    provider_capture_id = coalesce(provider_capture_id, p_provider_transaction_id),
    provider_order_id = coalesce(provider_order_id, nullif(p_provider_order_id, '')),
    paid_at = coalesce(paid_at, now()), fulfilled_at = now(), updated_at = now()
    where id = v_order.id;

  insert into public.reward_ledger(
    operation_id, player_id, action, delta_gold, delta_energy, delta_diamonds, payload,
    base_revision, resource_before, resource_after, profile_before_hash, profile_after_hash
  ) values (
    v_order.id, v_order.player_id, 'payment-credit', 0, 0,
    coalesce((v_after #>> '{resources,diamonds}')::integer, 0) - coalesce((v_before #>> '{resources,diamonds}')::integer, 0),
    jsonb_build_object('orderId', v_order.id, 'offerId', v_order.product_id, 'provider', p_provider,
      'providerTransactionId', p_provider_transaction_id, 'rewards', v_order.reward_snapshot),
    v_revision - 1, public.economy_resource_envelope(v_before), public.economy_resource_envelope(v_after),
    encode(extensions.digest(convert_to(v_before::text, 'UTF8'), 'sha256'), 'hex'),
    encode(extensions.digest(convert_to(v_after::text, 'UTF8'), 'sha256'), 'hex')
  );

  update public.payment_events set processing_status = 'processed', processed_at = now()
    where provider = p_provider and event_id = p_event_id;
  return query select v_after, v_revision, false;
end;
$$;

create or replace function public.reverse_payment_order_v2(
  p_order_id uuid,
  p_provider text,
  p_event_id text,
  p_event_type text,
  p_payload_hash text,
  p_chargeback boolean default false
)
returns table(profile jsonb, revision bigint, already_reversed boolean, debt_created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.payment_orders%rowtype;
  v_grant public.payment_grants%rowtype;
  v_before jsonb;
  v_after jsonb;
  v_revision bigint;
  v_reward jsonb;
  v_type text;
  v_item text;
  v_amount integer;
  v_owned integer;
  v_short integer;
  v_has_debt boolean := false;
begin
  select * into v_order from public.payment_orders where id = p_order_id for update;
  if not found then raise exception 'PAYMENT_ORDER_NOT_FOUND'; end if;
  if v_order.provider <> p_provider then raise exception 'PAYMENT_PROVIDER_MISMATCH'; end if;
  select * into v_grant from public.payment_grants where order_id = p_order_id for update;
  if not found then raise exception 'PAYMENT_GRANT_NOT_FOUND'; end if;

  insert into public.payment_events(provider, event_id, event_type, order_id, payload_hash, verified)
  values (p_provider, p_event_id, p_event_type, p_order_id, p_payload_hash, true)
  on conflict (provider, event_id) do nothing;

  if v_grant.reversed_at is not null then
    return query select current_profile.profile, current_profile.revision, true,
      exists(select 1 from public.payment_resource_debts d where d.player_id = v_order.player_id and d.cleared_at is null)
      from public.player_profiles current_profile where current_profile.user_id = v_order.player_id;
    return;
  end if;

  select current_profile.profile, current_profile.revision into v_before, v_revision
    from public.player_profiles current_profile where current_profile.user_id = v_order.player_id for update;
  v_after := v_before;

  for v_reward in select value from jsonb_array_elements(v_grant.reward_snapshot) loop
    v_type := v_reward ->> 'type';
    v_amount := greatest(0, coalesce((v_reward ->> 'amount')::integer, 0));
    if v_type = 'diamonds' then
      v_owned := greatest(0, coalesce((v_after #>> '{resources,diamonds}')::integer, 0));
      v_short := greatest(0, v_amount - v_owned);
      v_after := jsonb_set(v_after, '{resources,diamonds}', to_jsonb(greatest(0, v_owned - v_amount)), true);
      if v_short > 0 then
        insert into public.payment_resource_debts(player_id, resource_type, resource_id, amount, source_order_id)
        values (v_order.player_id, 'diamonds', '', v_short, v_order.id)
        on conflict (player_id, resource_type, resource_id, source_order_id) do update
          set amount = public.payment_resource_debts.amount + excluded.amount, cleared_at = null;
        v_has_debt := true;
      end if;
    elsif v_type = 'item' then
      v_item := left(coalesce(v_reward ->> 'itemId', ''), 80);
      v_owned := greatest(0, coalesce((v_after #>> array['resources','inventory',v_item])::integer, 0));
      v_short := greatest(0, v_amount - v_owned);
      v_after := jsonb_set(v_after, array['resources','inventory',v_item], to_jsonb(greatest(0, v_owned - v_amount)), true);
      if v_short > 0 then
        insert into public.payment_resource_debts(player_id, resource_type, resource_id, amount, source_order_id)
        values (v_order.player_id, 'item', v_item, v_short, v_order.id)
        on conflict (player_id, resource_type, resource_id, source_order_id) do update
          set amount = public.payment_resource_debts.amount + excluded.amount, cleared_at = null;
        v_has_debt := true;
      end if;
    end if;
  end loop;

  v_after := jsonb_set(v_after, '{paymentDebtLocked}', to_jsonb(v_has_debt or exists(
    select 1 from public.payment_resource_debts where player_id = v_order.player_id and cleared_at is null and amount > 0
  )), true);
  update public.player_profiles set profile = v_after, revision = public.player_profiles.revision + 1
    where user_id = v_order.player_id returning public.player_profiles.revision into v_revision;
  update public.payment_grants set reversed_at = now(), reversal_event_id = p_event_id where order_id = v_order.id;
  update public.payment_orders set
    state = case when v_has_debt then 'debt' when p_chargeback then 'chargeback' else 'refunded' end,
    payment_status = case when p_chargeback then 'chargeback' else 'refunded' end,
    fulfillment_status = case when v_has_debt then 'debt' else 'reversed' end,
    refund_status = case when p_chargeback then 'chargeback' else 'completed' end,
    refunded_at = now(), updated_at = now()
    where id = v_order.id;

  insert into public.reward_ledger(
    operation_id, player_id, action, delta_gold, delta_energy, delta_diamonds, payload,
    base_revision, resource_before, resource_after, profile_before_hash, profile_after_hash
  ) values (
    gen_random_uuid(), v_order.player_id, case when p_chargeback then 'payment-chargeback' else 'payment-refund' end,
    0, 0, coalesce((v_after #>> '{resources,diamonds}')::integer, 0) - coalesce((v_before #>> '{resources,diamonds}')::integer, 0),
    jsonb_build_object('orderId', v_order.id, 'eventId', p_event_id, 'debtCreated', v_has_debt),
    v_revision - 1, public.economy_resource_envelope(v_before), public.economy_resource_envelope(v_after),
    encode(extensions.digest(convert_to(v_before::text, 'UTF8'), 'sha256'), 'hex'),
    encode(extensions.digest(convert_to(v_after::text, 'UTF8'), 'sha256'), 'hex')
  );
  update public.payment_events set processing_status = 'processed', processed_at = now()
    where provider = p_provider and event_id = p_event_id;
  return query select v_after, v_revision, false, v_has_debt;
end;
$$;

alter table public.payment_product_prices enable row level security;
alter table public.payment_entitlements enable row level security;
alter table public.payment_events enable row level security;
alter table public.payment_grants enable row level security;
alter table public.payment_resource_debts enable row level security;
alter table public.player_payment_compliance enable row level security;
alter table public.payment_oauth_states enable row level security;
alter table public.payment_admin_nonces enable row level security;

revoke all on table public.payment_product_prices, public.payment_entitlements, public.payment_events,
  public.payment_grants, public.payment_resource_debts, public.player_payment_compliance,
  public.payment_oauth_states, public.payment_admin_nonces from public, anon, authenticated;
grant select, insert, update, delete on table public.payment_product_prices, public.payment_entitlements,
  public.payment_events, public.payment_grants, public.payment_resource_debts,
  public.player_payment_compliance, public.payment_oauth_states, public.payment_admin_nonces to service_role;
grant usage, select on sequence public.payment_events_id_seq, public.payment_resource_debts_id_seq to service_role;

revoke all on function public.create_payment_order_v2(uuid, text, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.fulfill_payment_order_v2(uuid, text, text, text, integer, text, text, text, text) from public, anon, authenticated;
revoke all on function public.reverse_payment_order_v2(uuid, text, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.create_payment_order_v2(uuid, text, text, text, text, uuid) to service_role;
grant execute on function public.fulfill_payment_order_v2(uuid, text, text, text, integer, text, text, text, text) to service_role;
grant execute on function public.reverse_payment_order_v2(uuid, text, text, text, text, boolean) to service_role;

commit;
