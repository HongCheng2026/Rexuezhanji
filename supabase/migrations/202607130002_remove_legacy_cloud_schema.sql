begin;

-- The first cloud prototype used client-callable RPCs and a separate profiles
-- schema. The Edge Function now owns every valuable mutation, so remove the
-- legacy surface after the current player_profiles schema has been created.
drop function if exists public.bootstrap_profile();
drop function if exists public.start_battle(integer);
drop function if exists public.finish_battle(uuid, integer, integer, integer, integer, integer, double precision);
drop function if exists public.abandon_battle(uuid);
drop function if exists public.sweep_level(integer);
drop function if exists public.upgrade_stat(text);
drop function if exists public.redeem_code_fn(text);
drop function if exists public.save_cosmetics(jsonb, jsonb);
drop function if exists public.buy_shop_item(text);
drop function if exists public.migrate_anonymous(text);

drop table if exists public.code_redemptions;
drop table if exists public.battle_tickets;
drop table if exists public.profiles;
drop table if exists public.redeem_codes;

commit;
