begin;

grant select, insert, update on table public.player_profiles to service_role;
grant select, insert, update on table public.battle_sessions to service_role;
grant select, insert on table public.reward_ledger to service_role;

grant usage, select on sequence public.player_public_uid_seq to service_role;
grant usage, select on sequence public.reward_ledger_id_seq to service_role;

commit;
