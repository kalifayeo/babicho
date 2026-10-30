-- ============================================================
-- BABICHO — Objectif (somme demandée) d'une cause solidaire
-- ============================================================
-- Pour une cause (cotisation, acte de générosité...), l'organisateur peut,
-- SI IL LE SOUHAITE, indiquer une somme demandée (objectif) :
--   - goal_amount               : objectif en FCFA (NULL = pas d'objectif) ;
--   - show_goal_public          : afficher l'objectif + la barre de progression
--                                 sur la page publique ;
--   - show_contributions_public : afficher la liste publique des contributions
--                                 (initiale + montant + date, voir 0062/API).
-- L'organisateur et l'administrateur voient toujours le détail complet, quels
-- que soient ces deux réglages (page statistiques de l'événement).
--
-- Ces colonnes ne sont pas verrouillées par enforce_event_content_lock() : elles
-- restent modifiables par l'organisateur après publication.
-- ============================================================

alter table events add column if not exists goal_amount numeric(12,2);
alter table events add column if not exists show_goal_public boolean not null default true;
alter table events add column if not exists show_contributions_public boolean not null default true;

alter table events drop constraint if exists events_goal_amount_positive;
alter table events add constraint events_goal_amount_positive check (goal_amount is null or goal_amount > 0);

-- Cartes (accueil, recherche) : l'objectif et le montant collecté respectent les
-- réglages de l'organisateur. Objectif masqué => pas de barre de progression ;
-- objectif ET liste masqués => pas de montant collecté non plus.
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
    case
      when exists (select 1 from categories c where c.id = e.category_id and c.kind = 'cause')
           and (e.show_goal_public or e.show_contributions_public)
        then coalesce((select sum(o.subtotal) from orders o where o.event_id = e.id and o.status = 'paid'), 0)
      else 0
    end,
    case when e.show_goal_public then e.goal_amount else null end
  from events e
  where e.id = any(event_ids)
    and e.status = 'published';
$$;
