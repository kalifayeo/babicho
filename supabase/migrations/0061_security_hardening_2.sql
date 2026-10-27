-- ============================================================
-- BABICHO — Durcissement de sécurité n°2 (audit de fin de phase)
-- ============================================================
-- À exécuter dans Supabase > SQL Editor (après 0060). Idempotent : peut être
-- rejoué sans danger. Aucune donnée n'est supprimée ni modifiée.
-- Après exécution : relancer supabase/security/audit_rls.sql (requêtes C et E).
-- ============================================================

-- 1. Chiffres d'affaires des organisateurs : plus lisibles par n'importe qui ---
-- organizer_paid_sales(uuid) et commission_rate_for(uuid) sont SECURITY DEFINER et
-- n'avaient jamais été retirées au rôle PUBLIC : un visiteur NON connecté pouvait
-- appeler POST /rest/v1/rpc/organizer_paid_sales avec l'UUID (public) d'un organisateur
-- et lire ses ventes cumulées ainsi que son taux de commission négocié.
-- Elles ne sont utilisées que par le trigger set_order_commission() et par
-- my_commission_status(), tous deux SECURITY DEFINER : ils continuent de fonctionner.
revoke all on function public.organizer_paid_sales(uuid) from public, anon, authenticated;
revoke all on function public.commission_rate_for(uuid) from public, anon, authenticated;
grant execute on function public.organizer_paid_sales(uuid) to service_role;
grant execute on function public.commission_rate_for(uuid) to service_role;

-- my_commission_status() : réservé aux comptes connectés (elle lit auth.uid()).
revoke all on function public.my_commission_status() from public, anon;
grant execute on function public.my_commission_status() to authenticated, service_role;

-- 2. can_review_event : ne plus permettre de sonder les achats d'autrui --------
-- Accordée à « authenticated » avec un p_user_id libre, elle répondait à « tel
-- utilisateur a-t-il un billet pour tel événement ? » pour n'importe quel UUID.
-- Elle ne répond plus que pour soi-même (ou pour un admin / le serveur).
create or replace function public.can_review_event(p_user_id uuid, p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from tickets tk
      join events e on e.id = tk.event_id
     where tk.event_id = p_event_id
       and tk.user_id = p_user_id
       and tk.status in ('valid', 'used')
       and coalesce(e.end_date, e.start_date) < now()
  )
  and (auth.uid() is null or auth.uid() = p_user_id or public.is_admin());
$$;

-- 3. event_card_stats : le montant « collecté » n'est public que pour les causes ---
-- La fonction (appelable par les visiteurs) renvoyait la somme des ventes payées de
-- TOUS les événements publiés, donc le chiffre d'affaires de chaque organisateur.
-- Seules les « causes solidaires » (catégorie kind = 'cause') affichent une cagnotte.
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
        then coalesce((select sum(o.subtotal) from orders o where o.event_id = e.id and o.status = 'paid'), 0)
      else 0
    end,
    e.goal_amount
  from events e
  where e.id = any(event_ids)
    and e.status = 'published';
$$;

-- 4. Profils : on ne peut s'auto-créer qu'un profil « acheteur actif » -------------
-- La policy d'INSERT n'imposait que auth.uid() = user_id ; le verrou de privilèges
-- (migration 0016) ne couvre que les UPDATE. Aujourd'hui le trigger d'inscription crée
-- toujours le profil, mais si une ligne profiles disparaissait un jour (nettoyage,
-- import...), son propriétaire pourrait s'en recréer une avec role = 'admin'.
drop policy if exists "Création de son propre profil" on profiles;
create policy "Création de son propre profil" on profiles
  for insert
  with check (auth.uid() = user_id and role = 'buyer' and status = 'active');

-- 5. Notifications vers les administrateurs : organisateurs actifs uniquement ------
-- La policy « Organisateur notifie les administrateurs » ne vérifiait pas que
-- l'expéditeur est organisateur : n'importe quel compte pouvait injecter des
-- notifications (titre/message/lien libres) chez les admins (phishing interne, spam).
drop policy if exists "Organisateur notifie les administrateurs" on notifications;
create policy "Organisateur notifie les administrateurs" on notifications
  for insert
  with check (
    public.current_user_is_active()
    and exists (select 1 from profiles p where p.user_id = notifications.user_id and p.role = 'admin')
    and exists (select 1 from organizers o where o.user_id = auth.uid())
  );

-- 6. Bornes de taille (NOT VALID : contrôlées sur les nouvelles lignes uniquement) ---
do $$
begin
  begin
    alter table notifications add constraint notifications_size_chk
      check (
        char_length(title) <= 200
        and char_length(message) <= 2000
        and (link is null or (link like '/%' and link not like '//%' and position(chr(92) in link) = 0 and char_length(link) <= 500))
      ) not valid;
  exception when duplicate_object then null;
  end;

  begin
    alter table contact_messages add constraint contact_messages_size_chk
      check (
        char_length(full_name) <= 200
        and char_length(email) <= 320
        and char_length(subject) <= 300
        and char_length(message) <= 6000
      ) not valid;
  exception when duplicate_object then null;
  end;

  begin
    alter table site_feedback add constraint site_feedback_size_chk
      check (
        char_length(display_name) <= 100
        and char_length(message) <= 2000
        and (email is null or char_length(email) <= 320)
      ) not valid;
  exception when duplicate_object then null;
  end;
end $$;

-- 7. Vérification rapide (lecture seule) ---------------------------------------------
-- Doit renvoyer 0 ligne : fonctions SECURITY DEFINER appelables par les visiteurs
-- autres que celles prévues (waitlist_available, waitlist_count, current_user_is_active,
-- is_admin, event_card_stats).
select p.proname as fonction_ouverte_aux_visiteurs, pg_get_function_identity_arguments(p.oid) as arguments
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.prosecdef and p.prorettype <> 'trigger'::regtype
   and has_function_privilege('anon', p.oid, 'EXECUTE')
   and p.proname not in ('waitlist_available', 'waitlist_count', 'current_user_is_active', 'is_admin', 'event_card_stats');
