-- ============================================================
-- BABICHO — Notifications par SMS
-- ============================================================
-- Ajoute un 3e canal de livraison (après email et push) à la file
-- `notifications` :
--   - sms_pending : un SMS doit encore être envoyé.
--
-- Qui reçoit un SMS ? Uniquement les notifications de type
--   - 'purchase'       (achat / contribution confirmé(e)),
--   - 'event_reminder' (rappel 24 h / 3 h avant l'événement),
-- et seulement si l'utilisateur a laissé « SMS » activé dans ses
-- paramètres (profiles.notify_sms) ET possède un numéro (profiles.phone).
--
-- L'envoi réel est fait par /api/cron/tick (server/utils/sms.ts), qui
-- réclame les lots via claim_pending_notifications() (verrou skip locked).
--
-- Sécurité : comme email_pending / push_pending, le drapeau sms_pending ne
-- peut pas être posé par un utilisateur connecté (sinon il pourrait faire
-- envoyer des SMS facturés). Il n'est posé que dans un contexte serveur
-- (service_role, cron, fonctions SQL de Babicho, admin).
-- ============================================================

alter table notifications add column if not exists sms_pending boolean not null default false;

drop index if exists notifications_pending_delivery_idx;
create index if not exists notifications_pending_delivery_idx
  on notifications (created_at)
  where email_pending or push_pending or sms_pending;

-- 1. Garde-fou : un client ne peut jamais poser / modifier sms_pending ------
create or replace function public.notifications_guard_delivery_flags()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or auth.role() = 'service_role'
     or coalesce(current_setting('tikeo.allow_delivery_flags', true), '') = '1'
     or public.is_admin()
  then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.email_pending := false;
    new.push_pending := false;
    new.sms_pending := false;
    new.delivered_at := null;
    new.delivery_claimed_at := null;
    return new;
  end if;

  new.email_pending := old.email_pending;
  new.push_pending := old.push_pending;
  new.sms_pending := old.sms_pending;
  new.delivered_at := old.delivered_at;
  new.delivery_claimed_at := old.delivery_claimed_at;
  new.link := old.link;
  return new;
end;
$$;

-- 2. Pose automatique de sms_pending (achat + rappels) ----------------------
-- Le nom commence par « trg_notifications_s » : il s'exécute APRÈS
-- trg_notifications_guard_delivery_flags (ordre alphabétique), et ne fait rien
-- si le contexte n'est pas un contexte serveur de confiance.
create or replace function public.notifications_flag_sms()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
       auth.uid() is null
    or auth.role() = 'service_role'
    or coalesce(current_setting('tikeo.allow_delivery_flags', true), '') = '1'
    or public.is_admin()
  ) then
    return new;
  end if;

  if new.type in ('purchase', 'event_reminder') then
    new.sms_pending := exists (
      select 1 from profiles p
       where p.user_id = new.user_id
         and p.notify_sms = true
         and nullif(btrim(coalesce(p.phone, '')), '') is not null
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notifications_sms_flag on notifications;
create trigger trg_notifications_sms_flag
  before insert on notifications
  for each row execute function public.notifications_flag_sms();

-- 3. Lot de notifications à livrer (inclut maintenant les SMS) --------------
create or replace function public.claim_pending_notifications(p_limit integer default 100)
returns setof notifications
language sql
security definer
set search_path = public
as $$
  update notifications n
     set delivery_claimed_at = now()
   where n.id in (
     select id
       from notifications
      where (email_pending or push_pending or sms_pending)
        and (delivery_claimed_at is null or delivery_claimed_at < now() - interval '10 minutes')
      order by created_at
      limit greatest(1, least(coalesce(p_limit, 100), 500))
        for update skip locked
   )
  returning n.*;
$$;

revoke all on function public.claim_pending_notifications(integer) from public, anon, authenticated;
grant execute on function public.claim_pending_notifications(integer) to service_role;
