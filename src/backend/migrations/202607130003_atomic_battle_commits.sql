begin;

create or replace function public.commit_battle_start(
  p_user_id uuid,
  p_expected_revision bigint,
  p_profile jsonb,
  p_save_version integer,
  p_ticket_hash text,
  p_level_id text,
  p_expires_at timestamptz,
  p_operation_id uuid,
  p_delta_energy integer,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.player_profiles
  set profile = p_profile,
      save_version = p_save_version,
      revision = revision + 1
  where user_id = p_user_id
    and revision = p_expected_revision;

  if not found then
    raise exception 'PROFILE_CONFLICT';
  end if;

  insert into public.battle_sessions(player_id, level_id, ticket_hash, expires_at)
  values (p_user_id, p_level_id, p_ticket_hash, p_expires_at);

  insert into public.reward_ledger(operation_id, player_id, action, delta_gold, delta_energy, payload)
  values (p_operation_id, p_user_id, 'start-battle', 0, p_delta_energy, coalesce(p_payload, '{}'::jsonb));
end;
$$;

create or replace function public.commit_battle_settlement(
  p_user_id uuid,
  p_battle_id uuid,
  p_expected_revision bigint,
  p_profile jsonb,
  p_save_version integer,
  p_settlement jsonb,
  p_delta_gold integer,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.player_profiles
  set profile = p_profile,
      save_version = p_save_version,
      revision = revision + 1
  where user_id = p_user_id
    and revision = p_expected_revision;

  if not found then
    raise exception 'PROFILE_CONFLICT';
  end if;

  update public.battle_sessions
  set state = 'settled',
      settled_at = now(),
      settlement = p_settlement
  where id = p_battle_id
    and player_id = p_user_id
    and state = 'started';

  if not found then
    raise exception 'BATTLE_ALREADY_SETTLED';
  end if;

  insert into public.reward_ledger(operation_id, player_id, action, delta_gold, delta_energy, payload)
  values (p_battle_id, p_user_id, 'finish-battle', p_delta_gold, 0, coalesce(p_payload, '{}'::jsonb));
end;
$$;

revoke all on function public.commit_battle_start(uuid, bigint, jsonb, integer, text, text, timestamptz, uuid, integer, jsonb) from public, anon, authenticated;
revoke all on function public.commit_battle_settlement(uuid, uuid, bigint, jsonb, integer, jsonb, integer, jsonb) from public, anon, authenticated;
grant execute on function public.commit_battle_start(uuid, bigint, jsonb, integer, text, text, timestamptz, uuid, integer, jsonb) to service_role;
grant execute on function public.commit_battle_settlement(uuid, uuid, bigint, jsonb, integer, jsonb, integer, jsonb) to service_role;

commit;
