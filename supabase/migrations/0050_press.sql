-- ============================================================
-- TIKEO — Presse & médias (page /presse + bandeau « Ils parlent de nous »)
-- ============================================================
-- Deux contenus gérés depuis /admin/presse :
--   1. press_items     : retombées presse (articles, vidéos / TV, radio /
--                        podcasts) et communiqués de presse.
--   2. press_resources : kit média téléchargeable (logos, charte graphique,
--                        photos, fiche de présentation…).
-- Lecture publique du contenu ACTIF uniquement ; écriture réservée aux admins
-- porteurs de `press.manage` (Super Admin, Admin Marketing et Admin Contenu).
-- ============================================================

-- 1. Permission -------------------------------------------------------
insert into permissions (key, category, description) values
  ('press.manage', 'marketing', 'Gérer la page Presse & médias (retombées, communiqués, kit média)')
on conflict (key) do nothing;

insert into admin_role_permissions (role_id, permission_id)
select r.id, p.id from admin_roles r join permissions p on p.key = 'press.manage'
where r.key in ('super_admin', 'marketing_admin', 'content_admin')
on conflict do nothing;

-- 2. Retombées presse et communiqués -----------------------------------
create table if not exists press_items (
  id uuid primary key default uuid_generate_v4(),
  kind text not null default 'article' check (kind in ('article', 'video', 'audio', 'release')),
  media_name text not null check (char_length(media_name) between 1 and 80),
  title text not null check (char_length(title) between 1 and 160),
  excerpt text check (excerpt is null or char_length(excerpt) <= 300),
  url text check (url is null or url ~* '^https?://'),
  logo_url text,
  published_on date not null default current_date,
  is_featured boolean not null default false,
  position integer not null default 0,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists press_items_status_date_idx on press_items (status, published_on desc);
alter table press_items enable row level security;

create policy "Lecture des retombées presse actives" on press_items
  for select using (status = 'active' or has_permission('press.manage'));
create policy "Gestion des retombées presse" on press_items
  for all using (has_permission('press.manage')) with check (has_permission('press.manage'));

-- 3. Kit média -----------------------------------------------------------
create table if not exists press_resources (
  id uuid primary key default uuid_generate_v4(),
  kind text not null default 'other' check (kind in ('logo', 'guidelines', 'photos', 'factsheet', 'other')),
  title text not null check (char_length(title) between 1 and 80),
  description text check (description is null or char_length(description) <= 200),
  file_url text not null check (file_url ~* '^https?://'),
  position integer not null default 0,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists press_resources_status_position_idx on press_resources (status, position);
alter table press_resources enable row level security;

create policy "Lecture du kit média actif" on press_resources
  for select using (status = 'active' or has_permission('press.manage'));
create policy "Gestion du kit média" on press_resources
  for all using (has_permission('press.manage')) with check (has_permission('press.manage'));

-- 4. Stockage : dossier `press/` (logos des médias, PDF et images du kit) ---
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
    )
  );
