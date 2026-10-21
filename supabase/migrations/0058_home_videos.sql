-- ============================================================
-- BABICHO — Vidéos de l'accueil gérées depuis /admin/accueil
-- ============================================================
-- 1) Trois emplacements vidéo sur la page d'accueil, chacun avec une image
--    d'aperçu facultative :
--      - présentation  (presentation_video_url : colonne déjà créée en 0045)
--      - ambiance      (avant les chiffres de confiance)
--      - organisateurs (juste avant l'appel « Créer un événement »)
--    Une valeur vide = l'emplacement n'est pas affiché (sauf « présentation »,
--    qui retombe sur la valeur par défaut du site).
-- 2) Un bucket Storage « site-videos » pour envoyer un fichier .mp4 / .webm
--    depuis l'ordinateur (50 Mo max, limite du plan gratuit Supabase).
--    Au-delà : utiliser un lien YouTube ou Vimeo.
-- Les policies de home_hero_content (lecture publique, modification par
-- `marketing.manage`) couvrent déjà ces colonnes.
-- À exécuter dans Supabase > SQL Editor.
-- ============================================================

alter table home_hero_content
  add column if not exists presentation_poster_url text
    check (presentation_poster_url is null or ((presentation_poster_url ~* '^https?://' or presentation_poster_url ~ '^/[^/]') and char_length(presentation_poster_url) <= 500)),
  add column if not exists ambiance_video_url text
    check (ambiance_video_url is null or ((ambiance_video_url ~* '^https?://' or ambiance_video_url ~ '^/[^/]') and char_length(ambiance_video_url) <= 500)),
  add column if not exists ambiance_poster_url text
    check (ambiance_poster_url is null or ((ambiance_poster_url ~* '^https?://' or ambiance_poster_url ~ '^/[^/]') and char_length(ambiance_poster_url) <= 500)),
  add column if not exists organizers_video_url text
    check (organizers_video_url is null or ((organizers_video_url ~* '^https?://' or organizers_video_url ~ '^/[^/]') and char_length(organizers_video_url) <= 500)),
  add column if not exists organizers_poster_url text
    check (organizers_poster_url is null or ((organizers_poster_url ~* '^https?://' or organizers_poster_url ~ '^/[^/]') and char_length(organizers_poster_url) <= 500));

-- Bucket public : les vidéos de l'accueil doivent être lisibles sans connexion.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-videos', 'site-videos', true, 52428800, array['video/mp4', 'video/webm'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Lecture publique des vidéos du site" on storage.objects;
create policy "Lecture publique des vidéos du site" on storage.objects
  for select using (bucket_id = 'site-videos');

-- Écriture réservée à l'admin (même droit que la page /admin/accueil).
drop policy if exists "Envoi des vidéos du site par l'admin" on storage.objects;
create policy "Envoi des vidéos du site par l'admin" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'site-videos'
    and public.current_user_is_active()
    and (is_admin() or has_permission('marketing.manage'))
  );

drop policy if exists "Modification des vidéos du site par l'admin" on storage.objects;
create policy "Modification des vidéos du site par l'admin" on storage.objects
  for update to authenticated
  using (bucket_id = 'site-videos' and (is_admin() or has_permission('marketing.manage')))
  with check (bucket_id = 'site-videos' and (is_admin() or has_permission('marketing.manage')));

drop policy if exists "Suppression des vidéos du site par l'admin" on storage.objects;
create policy "Suppression des vidéos du site par l'admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'site-videos' and (is_admin() or has_permission('marketing.manage')));
