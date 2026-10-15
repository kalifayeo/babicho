-- ============================================================
-- TIKEO — Événements à la une, témoignages et blog / actualités
-- ============================================================
-- Trois contenus pilotés depuis l'administration :
--   1. featured_events : bandeau « À la une » de l'accueil (événements choisis
--      à la main, ordonnés, avec un badge optionnel).
--   2. testimonials    : témoignages d'organisateurs et de participants.
--   3. blog_posts      : articles du blog (brouillon / publié / programmé).
--
-- Lecture publique du contenu ACTIF / PUBLIÉ uniquement ; écriture réservée
-- aux admins porteurs de la permission dédiée (RBAC, migration 0021). Le
-- Super Admin et l'Admin Marketing les portent par défaut.
-- ============================================================

-- 1. Permissions et rôle ------------------------------------------------
insert into permissions (key, category, description) values
  ('featured.manage',     'marketing', 'Gérer le bandeau « Événements à la une » de l''accueil'),
  ('testimonials.manage', 'marketing', 'Gérer les témoignages affichés sur le site'),
  ('blog.manage',         'marketing', 'Gérer les articles du blog / actualités')
on conflict (key) do nothing;

insert into admin_roles (key, name, description, is_system) values
  ('content_admin', 'Admin Contenu', 'Gère le bandeau à la une, les témoignages et le blog.', false)
on conflict (key) do nothing;

insert into admin_role_permissions (role_id, permission_id)
select r.id, p.id from admin_roles r
join permissions p on p.key in ('featured.manage', 'testimonials.manage', 'blog.manage')
where r.key in ('content_admin', 'super_admin', 'marketing_admin')
on conflict do nothing;

-- 2. Événements à la une ------------------------------------------------
create table if not exists featured_events (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null unique references events(id) on delete cascade,
  badge_label text check (badge_label is null or char_length(badge_label) <= 30),
  position integer not null default 0,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists featured_events_status_position_idx on featured_events (status, position);
alter table featured_events enable row level security;

create policy "Lecture des événements à la une actifs" on featured_events
  for select using (status = 'active' or has_permission('featured.manage'));
create policy "Gestion des événements à la une" on featured_events
  for all using (has_permission('featured.manage')) with check (has_permission('featured.manage'));

-- 3. Témoignages --------------------------------------------------------
create table if not exists testimonials (
  id uuid primary key default uuid_generate_v4(),
  author_name text not null check (char_length(author_name) between 1 and 80),
  author_role text check (author_role is null or char_length(author_role) <= 80),
  author_type text not null default 'attendee' check (author_type in ('organizer', 'attendee')),
  city text check (city is null or char_length(city) <= 60),
  content text not null check (char_length(content) between 1 and 600),
  rating smallint not null default 5 check (rating between 1 and 5),
  avatar_url text,
  is_featured boolean not null default false,
  position integer not null default 0,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists testimonials_status_position_idx on testimonials (status, position);
alter table testimonials enable row level security;

create policy "Lecture des témoignages actifs" on testimonials
  for select using (status = 'active' or has_permission('testimonials.manage'));
create policy "Gestion des témoignages" on testimonials
  for all using (has_permission('testimonials.manage')) with check (has_permission('testimonials.manage'));

-- 4. Blog ---------------------------------------------------------------
create table if not exists blog_posts (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  title text not null check (char_length(title) between 1 and 140),
  excerpt text check (excerpt is null or char_length(excerpt) <= 300),
  content text not null default '' check (char_length(content) <= 60000),
  cover_url text,
  category text not null default 'news' check (category in ('news', 'guides', 'organizers', 'events', 'product')),
  author_name text check (author_name is null or char_length(author_name) <= 80),
  is_featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published')),
  -- Date de publication : une date future = article programmé (invisible jusque-là).
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists blog_posts_published_idx on blog_posts (status, published_at desc);
alter table blog_posts enable row level security;

create policy "Lecture des articles publiés" on blog_posts
  for select using (
    has_permission('blog.manage')
    or (status = 'published' and (published_at is null or published_at <= now()))
  );
create policy "Gestion des articles" on blog_posts
  for all using (has_permission('blog.manage')) with check (has_permission('blog.manage'));

-- 5. Stockage : nouveaux dossiers d'images -------------------------------
-- Reprend la règle de 0048 (compte actif obligatoire) + `blog-covers/` et
-- `testimonial-avatars/`, réservés aux gestionnaires concernés.
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
    )
  );
