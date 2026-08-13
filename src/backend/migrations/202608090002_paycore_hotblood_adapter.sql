begin;

-- Game-specific adapter. The payment core knows only this signed HTTP
-- endpoint; this adapter is the sole component allowed to edit game diamonds.
create table if not exists public.paycore_hotblood_deliveries (
  event_id uuid primary key,
  order_id uuid not null unique,
  account_id uuid not null,
  reward_snapshot jsonb not null,
  payload_hash text not null,
  profile_revision bigint not null,
  delivered_at timestamptz not null default now()
);

create table if not exists public.paycore_hotblood_nonces (
  nonce text primary key,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create or replace function public.paycore_apply_hotblood_grant(
  p_event_id uuid,
  p_order_id uuid,
  p_account_id uuid,
  p_rewards jsonb,
  p_payload_hash text
) returns table(profile jsonb, revision bigint, duplicate boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_existing public.paycore_hotblood_deliveries%rowtype;
  v_profile jsonb;
  v_revision bigint;
  v_reward jsonb;
  v_amount integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_event_id::text, 0));
  select * into v_existing from public.paycore_hotblood_deliveries where event_id = p_event_id;
  if found then
    if v_existing.order_id <> p_order_id or v_existing.account_id <> p_account_id or v_existing.payload_hash <> p_payload_hash then
      raise exception 'PAYCORE_DELIVERY_REPLAY_MISMATCH';
    end if;
    return query select p.profile, p.revision, true from public.player_profiles p where p.user_id = p_account_id;
    return;
  end if;

  select p.profile, p.revision into v_profile, v_revision
  from public.player_profiles p where p.user_id = p_account_id for update;
  if not found then raise exception 'PAYCORE_GAME_PROFILE_NOT_FOUND'; end if;
  if jsonb_typeof(p_rewards) <> 'array' then raise exception 'PAYCORE_REWARDS_INVALID'; end if;

  for v_reward in select value from jsonb_array_elements(p_rewards) loop
    if v_reward ->> 'type' <> 'diamonds' then raise exception 'PAYCORE_REWARD_TYPE_UNSUPPORTED'; end if;
    v_amount := coalesce((v_reward ->> 'amount')::integer, 0);
    if v_amount <= 0 or v_amount > 100000 then raise exception 'PAYCORE_REWARD_AMOUNT_INVALID'; end if;
    v_profile := jsonb_set(
      v_profile,
      '{resources,diamonds}',
      to_jsonb(coalesce((v_profile #>> '{resources,diamonds}')::integer, 0) + v_amount),
      true
    );
  end loop;

  update public.player_profiles set profile = v_profile, revision = public.player_profiles.revision + 1
  where user_id = p_account_id returning public.player_profiles.revision into v_revision;
  insert into public.paycore_hotblood_deliveries(event_id, order_id, account_id, reward_snapshot, payload_hash, profile_revision)
  values (p_event_id, p_order_id, p_account_id, p_rewards, p_payload_hash, v_revision);
  return query select v_profile, v_revision, false;
end;
$$;

alter table public.paycore_hotblood_deliveries enable row level security;
alter table public.paycore_hotblood_nonces enable row level security;
revoke all on public.paycore_hotblood_deliveries, public.paycore_hotblood_nonces from anon, authenticated;
grant select, insert, update, delete on public.paycore_hotblood_deliveries, public.paycore_hotblood_nonces to service_role;
revoke all on function public.paycore_apply_hotblood_grant(uuid,uuid,uuid,jsonb,text) from public, anon, authenticated;
grant execute on function public.paycore_apply_hotblood_grant(uuid,uuid,uuid,jsonb,text) to service_role;

commit;
