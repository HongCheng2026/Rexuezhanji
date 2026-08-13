begin;

-- Move the legacy mixed codexBonds array into the Codex-owned state document.
update public.player_profiles p
set profile = jsonb_set(
  p.profile - 'codexBonds',
  '{codex}',
  jsonb_build_object(
    'activatedUnits', (
      select coalesce(jsonb_agg(activated_values.id order by activated_values.id), '[]'::jsonb)
      from (
        select jsonb_array_elements_text(coalesce(p.profile #> '{codex,activatedUnits}', '[]'::jsonb)) as id
        union
        select substr(legacy.id, 6)
        from jsonb_array_elements_text(coalesce(p.profile -> 'codexBonds', '[]'::jsonb)) legacy(id)
        where legacy.id like 'unit:%' and length(legacy.id) > 5
      ) activated_values
    ),
    'activatedBonds', (
      select coalesce(jsonb_agg(activated_values.id order by activated_values.id), '[]'::jsonb)
      from (
        select jsonb_array_elements_text(coalesce(p.profile #> '{codex,activatedBonds}', '[]'::jsonb)) as id
        union
        select legacy.id
        from jsonb_array_elements_text(coalesce(p.profile -> 'codexBonds', '[]'::jsonb)) legacy(id)
        where legacy.id not like 'unit:%'
      ) activated_values
    )
  ),
  true
)
where p.profile ? 'codexBonds' or not (p.profile ? 'codex');

-- Include Codex activation state in every subsequent economy audit envelope.
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

create or replace function public.activate_codex_entry(
  p_user_id uuid,
  p_operation_id uuid,
  p_kind text,
  p_entry_id text
)
returns table(applied boolean, profile jsonb, revision bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_state jsonb;
  v_values jsonb;
  v_revision bigint;
begin
  if p_kind not in ('unit', 'bond') or nullif(p_entry_id, '') is null or length(p_entry_id) > 80 then
    raise exception 'CODEX_ACTIVATION_INVALID';
  end if;

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

  select current_profile.profile, current_profile.revision
  into v_before, v_revision
  from public.player_profiles current_profile
  where current_profile.user_id = p_user_id
  for update;

  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;

  v_state := coalesce(v_before -> 'codex', '{"activatedUnits":[],"activatedBonds":[]}'::jsonb);
  if p_kind = 'unit' then
    v_values := coalesce(v_state -> 'activatedUnits', '[]'::jsonb);
  else
    v_values := coalesce(v_state -> 'activatedBonds', '[]'::jsonb);
  end if;

  if exists (select 1 from jsonb_array_elements_text(v_values) value(entry_id) where entry_id = p_entry_id) then
    return query select false, v_before, v_revision;
    return;
  end if;

  if p_kind = 'unit' then
    v_state := jsonb_set(v_state, '{activatedUnits}', v_values || to_jsonb(p_entry_id), true);
  else
    v_state := jsonb_set(v_state, '{activatedBonds}', v_values || to_jsonb(p_entry_id), true);
  end if;
  v_after := jsonb_set(v_before - 'codexBonds', '{codex}', v_state, true);

  update public.player_profiles
  set profile = v_after,
      revision = public.player_profiles.revision + 1
  where user_id = p_user_id
  returning public.player_profiles.revision into v_revision;

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
    p_operation_id,
    p_user_id,
    'codex-activate',
    0,
    0,
    0,
    jsonb_build_object('kind', p_kind, 'entryId', p_entry_id),
    v_revision - 1,
    public.economy_resource_envelope(v_before),
    public.economy_resource_envelope(v_after),
    encode(extensions.digest(convert_to(v_before::text, 'UTF8'), 'sha256'), 'hex'),
    encode(extensions.digest(convert_to(v_after::text, 'UTF8'), 'sha256'), 'hex')
  );

  return query select true, v_after, v_revision;
end;
$$;

revoke all on function public.activate_codex_entry(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.activate_codex_entry(uuid, uuid, text, text) to service_role;

commit;
