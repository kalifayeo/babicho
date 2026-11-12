-- ============================================================
-- TIKEO — Profils créés via « Continuer avec Google / Apple »
-- ============================================================
-- Remplace la fonction de création automatique du profil (0003) pour mieux
-- gérer les comptes OAuth :
--   * nom : full_name, sinon name (Google/Apple), sinon début de l'email ;
--     une adresse « Masquer mon e-mail » d'Apple (@privaterelay.appleid.com)
--     donnerait un nom illisible : on met « Membre Tikeo » à la place
--     (l'utilisateur peut le changer dans son espace) ;
--   * photo : avatar_url ou picture (Google), uniquement si c'est une URL https.
-- Le rôle reste TOUJOURS 'buyer' (jamais lu depuis les métadonnées).
-- Sans risque pour les inscriptions par email : mêmes champs qu'avant.
-- À exécuter une fois dans Supabase > SQL Editor.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_name text;
  v_avatar text;
begin
  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    case
      when new.email ilike '%@privaterelay.appleid.com' then 'Membre Tikeo'
      else nullif(split_part(coalesce(new.email, ''), '@', 1), '')
    end,
    'Membre Tikeo'
  );

  v_avatar := coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture');
  if v_avatar is not null and v_avatar !~* '^https://' then
    v_avatar := null;
  end if;

  insert into public.profiles (user_id, full_name, phone, email, avatar_url, role)
  values (
    new.id,
    left(v_name, 120),
    new.raw_user_meta_data ->> 'phone',
    coalesce(new.email, ''),
    v_avatar,
    'buyer'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;
