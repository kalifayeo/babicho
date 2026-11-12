-- ============================================================
-- BABICHO — Cartes événements / cotisations : cœurs, montant récolté, abonnements
--
--  1. events.goal_amount      : objectif d'une cotisation (optionnel). Sans
--                               objectif, la carte n'affiche pas de barre.
--  2. organizer_follows       : bouton « S'abonner » sur les cartes.
--  3. event_card_stats(ids[]) : nombre de cœurs + montant récolté + objectif,
--                               agrégés (les favoris et les commandes des autres
--                               ne sont jamais lisibles ligne à ligne).
-- ============================================================

alter table events
  add column if not exists goal_amount numeric(12,2);

-- ------------------------------------------------------------
-- Abonnements aux organisateurs
-- ------------------------------------------------------------
create table if not exists organizer_follows (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organizer_id uuid not null references organizers(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, organizer_id)
);
create index if not exists organizer_follows_user_idx on organizer_follows (user_id);
create index if not exists organizer_follows_organizer_idx on organizer_follows (organizer_id);

alter table organizer_follows enable row level security;

drop policy if exists "Abonnements lecture" on organizer_follows;
create policy "Abonnements lecture" on organizer_follows
  for select using (auth.uid() = user_id);

drop policy if exists "Abonnements ajout" on organizer_follows;
create policy "Abonnements ajout" on organizer_follows
  for insert with check (auth.uid() = user_id);

drop policy if exists "Abonnements suppression" on organizer_follows;
create policy "Abonnements suppression" on organizer_follows
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Statistiques affichées sur les cartes
-- ------------------------------------------------------------
create or replace function event_card_stats(event_ids uuid[])
returns table (event_id uuid, favorites_count bigint, raised numeric, goal_amount numeric)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.id,
    (select count(*) from favorites f where f.event_id = e.id),
    coalesce((select sum(o.subtotal) from orders o where o.event_id = e.id and o.status = 'paid'), 0),
    e.goal_amount
  from events e
  where e.id = any(event_ids)
    and e.status = 'published';
$$;

revoke all on function event_card_stats(uuid[]) from public;
grant execute on function event_card_stats(uuid[]) to anon, authenticated;
