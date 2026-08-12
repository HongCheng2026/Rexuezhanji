begin;

create extension if not exists pgcrypto;

-- Standalone payment core. It owns money/order state only and never writes a
-- game profile. Game delivery is performed by a separately signed adapter.
create table if not exists public.paycore_offers (
  offer_id text primary key,
  title text not null,
  description text not null default '',
  amount_minor integer not null check (amount_minor > 0),
  currency text not null check (currency = 'CNY'),
  rewards jsonb not null check (jsonb_typeof(rewards) = 'array'),
  first_bonus_rewards jsonb not null default '[]'::jsonb check (jsonb_typeof(first_bonus_rewards) = 'array'),
  enabled boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.paycore_orders (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete restrict,
  offer_id text not null,
  idempotency_key uuid not null,
  provider text not null default 'wechat' check (provider = 'wechat'),
  payment_scene text not null default 'wechat_native' check (payment_scene = 'wechat_native'),
  provider_order_no text not null unique,
  provider_transaction_id text unique,
  amount_minor integer not null check (amount_minor > 0),
  currency text not null check (currency = 'CNY'),
  title_snapshot text not null,
  reward_snapshot jsonb not null check (jsonb_typeof(reward_snapshot) = 'array'),
  benefit_keys text[] not null default '{}'::text[],
  payment_status text not null default 'pending' check (payment_status in ('pending','succeeded','failed','expired','refunded')),
  delivery_status text not null default 'pending' check (delivery_status in ('pending','queued','delivering','delivered','failed','reversed')),
  provider_payload jsonb not null default '{}'::jsonb,
  last_provider_sync_at timestamptz,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  paid_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id, idempotency_key)
);

create index if not exists paycore_orders_account_created_idx on public.paycore_orders(account_id, created_at desc);
create index if not exists paycore_orders_watch_idx on public.paycore_orders(payment_status, delivery_status, created_at);

create table if not exists public.paycore_entitlements (
  account_id uuid not null references auth.users(id) on delete restrict,
  benefit_key text not null,
  order_id uuid not null references public.paycore_orders(id) on delete restrict,
  state text not null check (state in ('reserved','claimed')),
  expires_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  primary key(account_id, benefit_key)
);

create table if not exists public.paycore_provider_events (
  provider text not null,
  event_id text not null,
  event_type text not null,
  order_id uuid references public.paycore_orders(id) on delete set null,
  payload_hash text not null,
  processed_at timestamptz not null default now(),
  primary key(provider, event_id)
);

create table if not exists public.paycore_delivery_outbox (
  event_id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.paycore_orders(id) on delete restrict,
  account_id uuid not null,
  reward_snapshot jsonb not null,
  status text not null default 'pending' check (status in ('pending','delivering','delivered','failed')),
  attempts integer not null default 0,
  last_error text,
  response_snapshot jsonb,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);

create or replace function public.paycore_create_order(
  p_account_id uuid,
  p_offer_id text,
  p_idempotency_key uuid
) returns table(order_id uuid, provider_order_no text, amount_minor integer, currency text, title text, rewards jsonb, expires_at timestamptz)
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_existing public.paycore_orders%rowtype;
  v_offer public.paycore_offers%rowtype;
  v_order_id uuid := gen_random_uuid();
  v_provider_no text;
  v_rewards jsonb;
  v_benefits text[] := '{}'::text[];
  v_benefit_key text;
  v_reserved integer := 0;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_account_id::text || ':' || p_idempotency_key::text, 0));
  select * into v_existing from public.paycore_orders where account_id = p_account_id and idempotency_key = p_idempotency_key;
  if found then
    return query select v_existing.id, v_existing.provider_order_no, v_existing.amount_minor, v_existing.currency,
      v_existing.title_snapshot, v_existing.reward_snapshot, v_existing.expires_at;
    return;
  end if;

  select * into v_offer from public.paycore_offers where offer_id = p_offer_id and enabled for update;
  if not found then raise exception 'PAYCORE_OFFER_UNAVAILABLE'; end if;
  v_rewards := v_offer.rewards;
  v_benefit_key := 'first:' || v_offer.offer_id;

  v_provider_no := 'RX' || upper(substr(replace(v_order_id::text, '-', ''), 1, 28));
  insert into public.paycore_orders(
    id, account_id, offer_id, idempotency_key, provider_order_no, amount_minor, currency,
    title_snapshot, reward_snapshot, benefit_keys
  ) values (
    v_order_id, p_account_id, v_offer.offer_id, p_idempotency_key, v_provider_no, v_offer.amount_minor,
    v_offer.currency, v_offer.title, v_rewards, v_benefits
  );

  insert into public.paycore_entitlements(account_id, benefit_key, order_id, state, expires_at)
  values (p_account_id, v_benefit_key, v_order_id, 'reserved', now() + interval '15 minutes')
  on conflict (account_id, benefit_key) do update set
    order_id = excluded.order_id, state = 'reserved', expires_at = excluded.expires_at, claimed_at = null
  where public.paycore_entitlements.state = 'reserved' and public.paycore_entitlements.expires_at < now();
  get diagnostics v_reserved = row_count;
  if v_reserved > 0 and jsonb_array_length(v_offer.first_bonus_rewards) > 0 then
    v_rewards := v_rewards || v_offer.first_bonus_rewards;
    v_benefits := array[v_benefit_key];
    update public.paycore_orders set reward_snapshot = v_rewards, benefit_keys = v_benefits where id = v_order_id;
  end if;
  return query select v_order_id, v_provider_no, v_offer.amount_minor, v_offer.currency,
    v_offer.title, v_rewards, now() + interval '15 minutes';
end;
$$;

create or replace function public.paycore_mark_paid(
  p_provider_order_no text,
  p_provider_transaction_id text,
  p_amount_minor integer,
  p_currency text,
  p_event_id text,
  p_event_type text,
  p_payload_hash text
) returns table(order_id uuid, delivery_event_id uuid, duplicate boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_order public.paycore_orders%rowtype;
  v_event uuid;
  v_inserted text;
  v_recorded public.paycore_provider_events%rowtype;
  v_claimed integer := 0;
  v_base_rewards jsonb;
begin
  select * into v_order from public.paycore_orders where provider_order_no = p_provider_order_no for update;
  if not found then raise exception 'PAYCORE_ORDER_NOT_FOUND'; end if;
  if v_order.amount_minor <> p_amount_minor or v_order.currency <> p_currency then raise exception 'PAYCORE_AMOUNT_MISMATCH'; end if;

  insert into public.paycore_provider_events(provider, event_id, event_type, order_id, payload_hash)
  values ('wechat', p_event_id, p_event_type, v_order.id, p_payload_hash)
  on conflict do nothing returning event_id into v_inserted;
  if v_inserted is null then
    select * into v_recorded from public.paycore_provider_events
    where provider = 'wechat' and event_id = p_event_id;
    if not found or v_recorded.order_id <> v_order.id or v_recorded.payload_hash <> p_payload_hash then
      raise exception 'PAYCORE_EVENT_REPLAY_MISMATCH';
    end if;
  end if;

  if v_order.payment_status = 'succeeded' then
    if v_order.provider_transaction_id <> p_provider_transaction_id then raise exception 'PAYCORE_TRANSACTION_MISMATCH'; end if;
    select event_id into v_event from public.paycore_delivery_outbox where order_id = v_order.id;
    return query select v_order.id, v_event, true;
    return;
  end if;
  if v_order.payment_status <> 'pending' then raise exception 'PAYCORE_ORDER_NOT_PAYABLE'; end if;

  update public.paycore_orders set payment_status = 'succeeded', delivery_status = 'queued',
    provider_transaction_id = p_provider_transaction_id, paid_at = now(), updated_at = now()
  where id = v_order.id;
  if cardinality(v_order.benefit_keys) > 0 then
    update public.paycore_entitlements set state = 'claimed', claimed_at = now(), expires_at = null
    where order_id = v_order.id and state = 'reserved' and benefit_key = any(v_order.benefit_keys);
    get diagnostics v_claimed = row_count;
    if v_claimed <> cardinality(v_order.benefit_keys) then
      select rewards into v_base_rewards from public.paycore_offers where offer_id = v_order.offer_id;
      if v_base_rewards is null then raise exception 'PAYCORE_OFFER_SNAPSHOT_MISSING'; end if;
      v_order.reward_snapshot := v_base_rewards;
      update public.paycore_orders set reward_snapshot = v_base_rewards, benefit_keys = '{}'::text[] where id = v_order.id;
    end if;
  end if;
  insert into public.paycore_delivery_outbox(order_id, account_id, reward_snapshot)
  values (v_order.id, v_order.account_id, v_order.reward_snapshot)
  on conflict (order_id) do update set reward_snapshot = excluded.reward_snapshot
  returning event_id into v_event;
  return query select v_order.id, v_event, false;
end;
$$;

create or replace function public.paycore_mark_delivery(
  p_event_id uuid,
  p_success boolean,
  p_response jsonb,
  p_error text default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_order_id uuid;
begin
  update public.paycore_delivery_outbox set
    status = case when p_success then 'delivered' else 'failed' end,
    attempts = attempts + 1,
    last_error = case when p_success then null else left(coalesce(p_error, 'DELIVERY_FAILED'), 200) end,
    response_snapshot = p_response,
    delivered_at = case when p_success then now() else delivered_at end
  where event_id = p_event_id returning order_id into v_order_id;
  if v_order_id is null then raise exception 'PAYCORE_DELIVERY_EVENT_NOT_FOUND'; end if;
  update public.paycore_orders set
    delivery_status = case when p_success then 'delivered' else 'failed' end,
    delivered_at = case when p_success then now() else delivered_at end,
    updated_at = now()
  where id = v_order_id;
end;
$$;

insert into public.paycore_offers(offer_id, title, description, amount_minor, currency, rewards, first_bonus_rewards, sort_order)
values
  ('diamond_60', '60 钻石', '首次支付额外获得 60 钻石', 600, 'CNY', '[{"type":"diamonds","amount":60}]', '[{"type":"diamonds","amount":60}]', 10),
  ('diamond_300', '300 钻石', '首次支付额外获得 300 钻石', 3000, 'CNY', '[{"type":"diamonds","amount":300}]', '[{"type":"diamonds","amount":300}]', 20),
  ('diamond_680', '680 钻石', '首次支付额外获得 680 钻石', 6800, 'CNY', '[{"type":"diamonds","amount":680}]', '[{"type":"diamonds","amount":680}]', 30),
  ('diamond_1280', '1280 钻石', '首次支付额外获得 1280 钻石', 12800, 'CNY', '[{"type":"diamonds","amount":1280}]', '[{"type":"diamonds","amount":1280}]', 40),
  ('diamond_3280', '3280 钻石', '首次支付额外获得 3280 钻石', 32800, 'CNY', '[{"type":"diamonds","amount":3280}]', '[{"type":"diamonds","amount":3280}]', 50),
  ('diamond_6480', '6480 钻石', '首次支付额外获得 6480 钻石', 64800, 'CNY', '[{"type":"diamonds","amount":6480}]', '[{"type":"diamonds","amount":6480}]', 60)
on conflict (offer_id) do update set title = excluded.title, description = excluded.description,
  amount_minor = excluded.amount_minor, rewards = excluded.rewards,
  first_bonus_rewards = excluded.first_bonus_rewards, sort_order = excluded.sort_order, updated_at = now();

alter table public.paycore_offers enable row level security;
alter table public.paycore_orders enable row level security;
alter table public.paycore_entitlements enable row level security;
alter table public.paycore_provider_events enable row level security;
alter table public.paycore_delivery_outbox enable row level security;
revoke all on public.paycore_offers, public.paycore_orders, public.paycore_entitlements,
  public.paycore_provider_events, public.paycore_delivery_outbox from anon, authenticated;
grant select, insert, update on public.paycore_offers, public.paycore_orders, public.paycore_entitlements,
  public.paycore_provider_events, public.paycore_delivery_outbox to service_role;
revoke all on function public.paycore_create_order(uuid,text,uuid) from public, anon, authenticated;
revoke all on function public.paycore_mark_paid(text,text,integer,text,text,text,text) from public, anon, authenticated;
revoke all on function public.paycore_mark_delivery(uuid,boolean,jsonb,text) from public, anon, authenticated;
grant execute on function public.paycore_create_order(uuid,text,uuid) to service_role;
grant execute on function public.paycore_mark_paid(text,text,integer,text,text,text,text) to service_role;
grant execute on function public.paycore_mark_delivery(uuid,boolean,jsonb,text) to service_role;

commit;
