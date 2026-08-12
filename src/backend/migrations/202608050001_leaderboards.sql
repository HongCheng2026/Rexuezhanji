-- Full-server leaderboard read indexes.
-- Endless results remain server-authoritative in endless_records; the UI never
-- submits an endless leaderboard score directly.

begin;

create index if not exists endless_records_leaderboard_idx
  on public.endless_records(best_kills desc, best_survival_seconds desc);

commit;
