-- ============================================================
-- BABICHO — Logo et en-tête gérés depuis l'admin
-- ============================================================
-- Ajoute à la ligne unique de `site_settings` : le logo (clair et sombre),
-- le nom du site, un court slogan à côté du logo, la taille du logo et
-- l'affichage du filet de couleur sous l'en-tête.
-- Un champ vide = valeur par défaut du site (logo Babicho, taille normale,
-- filet affiché). Même permission que la page Contact & réseaux : `site.manage`.
-- ============================================================

alter table site_settings
  add column if not exists logo_url text
    check (logo_url is null or (logo_url ~* '^https://' and char_length(logo_url) <= 500)),
  add column if not exists logo_dark_url text
    check (logo_dark_url is null or (logo_dark_url ~* '^https://' and char_length(logo_dark_url) <= 500)),
  add column if not exists site_name text
    check (site_name is null or char_length(site_name) <= 60),
  add column if not exists header_tagline text
    check (header_tagline is null or char_length(header_tagline) <= 80),
  add column if not exists logo_size text
    check (logo_size is null or logo_size in ('sm', 'md', 'lg')),
  add column if not exists header_strip text
    check (header_strip is null or header_strip in ('show', 'hide'));

-- Stockage : dossier `site-branding/` du bucket « media » (logos du site).
drop policy if exists "Envoi de médias par les comptes connectés" on storage.objects;
create policy "Envoi de médias par les comptes connectés" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media'
    and public.current_user_is_active()
    and (
      (storage.foldername(name))[1] in ('event-covers', 'seating-plans', 'organizer-logos', 'avatars')
      or ((storage.foldername(name))[1] = 'home-slides' and is_admin())
      or ((storage.foldername(name))[1] = 'partner-logos' and has_permission('partners.manage'))
      or ((storage.foldername(name))[1] = 'blog-covers' and has_permission('blog.manage'))
      or ((storage.foldername(name))[1] = 'testimonial-avatars' and has_permission('testimonials.manage'))
      or ((storage.foldername(name))[1] = 'press' and has_permission('press.manage'))
      or ((storage.foldername(name))[1] = 'site-branding' and has_permission('site.manage'))
    )
  );
