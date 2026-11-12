-- ============================================================
-- BABICHO — Renommage de la marque (ex-Tikeo) dans les données
-- ============================================================
-- Met à jour les textes déjà enregistrés en base : pages d'introduction,
-- visite guidée, pop-ups, réglages du site, nom par défaut des profils.
-- Sans risque si rejouée (ne modifie que ce qui contient encore « Tikeo »).
-- À exécuter une fois dans Supabase > SQL Editor.
--
-- NON couvert (contenu saisi à la main depuis l'admin) : articles de blog,
-- témoignages, presse, partenaires, causes… Vérifiez-les dans /admin.

-- 1. Pages d'introduction et visite guidée
update onboarding_slides
   set title = replace(title, 'Tikeo', 'Babicho'),
       description = replace(description, 'Tikeo', 'Babicho')
 where title like '%Tikeo%' or description like '%Tikeo%';

update tour_steps
   set title = replace(title, 'Tikeo', 'Babicho'),
       description = replace(description, 'Tikeo', 'Babicho')
 where title like '%Tikeo%' or description like '%Tikeo%';

-- 2. Pop-ups
update popups
   set title = replace(title, 'Tikeo', 'Babicho'),
       message = replace(message, 'Tikeo', 'Babicho'),
       cta_label = replace(cta_label, 'Tikeo', 'Babicho')
 where title like '%Tikeo%' or message like '%Tikeo%' or cta_label like '%Tikeo%';

-- 3. Réglages du site (uniquement les valeurs encore à leur défaut d'origine).
--    Pensez à vérifier ensuite les liens réseaux sociaux dans /admin/contact-reseaux.
update site_settings set contact_email = 'contact@babicho.com' where contact_email = 'contact@tikeo.com';
update site_settings set facebook_url  = 'https://facebook.com/babicho'            where facebook_url  = 'https://facebook.com/tikeo';
update site_settings set instagram_url = 'https://instagram.com/babicho'           where instagram_url = 'https://instagram.com/tikeo';
update site_settings set tiktok_url    = 'https://tiktok.com/@babicho'             where tiktok_url    = 'https://tiktok.com/@tikeo';
update site_settings set linkedin_url  = 'https://linkedin.com/company/babicho'    where linkedin_url  = 'https://linkedin.com/company/tikeo';

-- 4. Profils : nom par défaut des comptes Apple « Masquer mon e-mail »
update profiles set full_name = 'Membre Babicho' where full_name = 'Membre Tikeo';

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
      when new.email ilike '%@privaterelay.appleid.com' then 'Membre Babicho'
      else nullif(split_part(coalesce(new.email, ''), '@', 1), '')
    end,
    'Membre Babicho'
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

-- 5. Commentaires de colonnes (documentation uniquement)
comment on column profiles.notify_promotions is 'Accepte de recevoir des offres et actualités Babicho (marketing).';
comment on column events.fees_payer is 'Qui paie la commission Babicho : organizer (déduite) ou buyer (frais de service ajoutés).';
