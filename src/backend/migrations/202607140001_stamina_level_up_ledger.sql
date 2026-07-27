begin;

drop function if exists public.commit_battle_settlement(uuid, uuid, bigint, jsonb, integer, jsonb, integer, jsonb);

create or replace function public.commit_battle_settlement(
  p_user_id uuid,
  p_battle_id uuid,
  p_expected_revision bigint,
  p_profile jsonb,
  p_save_version integer,
  p_settlement jsonb,
  p_delta_gold integer,
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
  values (p_battle_id, p_user_id, 'finish-battle', p_delta_gold, p_delta_energy, coalesce(p_payload, '{}'::jsonb));
end;
$$;

revoke all on function public.commit_battle_settlement(uuid, uuid, bigint, jsonb, integer, jsonb, integer, integer, jsonb) from public, anon, authenticated;
grant execute on function public.commit_battle_settlement(uuid, uuid, bigint, jsonb, integer, jsonb, integer, integer, jsonb) to service_role;

commit;
