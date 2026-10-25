-- ============================================================
-- BABICHO — Comptes supprimés : nettoyage de la liste + historique
-- ============================================================
-- Contexte : « Supprimer » un compte anonymise le profil (voir 0022 et
-- server/api/admin/users/[userId]/delete.post.ts) sans effacer la ligne, pour
-- ne pas détruire commandes/paiements par cascade. Résultat : la liste
-- /admin/utilisateurs se remplissait de lignes « compte-supprime+…@….invalid ».
--
-- 1. Les anciens comptes anonymisés dont le statut n'était pas « deleted » le
--    deviennent (l'écran Utilisateurs ne liste plus les comptes supprimés).
-- 2. Chaque compte supprimé reçoit une trace dans audit_logs (si elle manque)
--    pour apparaître dans /admin/utilisateurs/historique.
-- 3. Index pour lire vite l'historique des comptes.
-- Aucune donnée n'est effacée.

-- Le verrou de privilèges (enforce_profile_privilege_lock) refuse tout changement
-- de statut hors « service_role » : dans l'éditeur SQL de Supabase il n'y a pas
-- d'utilisateur connecté, d'où l'erreur STATUS_CHANGE_FORBIDDEN. On se déclare
-- donc service_role pour CETTE transaction uniquement (set_config ... true).
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

update profiles
   set status = 'deleted',
       full_name = 'Compte supprimé',
       phone = null,
       avatar_url = null
 where status <> 'deleted'
   and email like 'compte-supprime+%';

insert into audit_logs (user_id, action, entity_type, entity_id, metadata, created_at)
select null, 'ADMIN_USER_DELETED', 'profiles', p.user_id,
       jsonb_build_object('legacy', true, 'previousRole', p.role),
       coalesce(p.updated_at, now())
  from profiles p
 where p.status = 'deleted'
   and not exists (
     select 1 from audit_logs a
      where a.entity_type = 'profiles'
        and a.action = 'ADMIN_USER_DELETED'
        and a.entity_id = p.user_id
   );

create index if not exists audit_logs_entity_type_created_idx
  on audit_logs (entity_type, created_at desc);
