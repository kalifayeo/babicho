-- ============================================================
-- BABICHO — Vidéo en fond de la bannière d'accueil
-- ============================================================
-- La bannière d'accueil peut maintenant diffuser une vidéo (.mp4 / .webm) en
-- plein fond, en plus des images et des gifs. On autorise donc la valeur
-- 'video' dans home_slides.media_type. Aucune donnée existante n'est modifiée.
-- ============================================================

alter table home_slides drop constraint if exists home_slides_media_type_check;
alter table home_slides
  add constraint home_slides_media_type_check
  check (media_type in ('image', 'gif', 'video'));
