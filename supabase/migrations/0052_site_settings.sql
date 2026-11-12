-- ============================================================
-- TIKEO — Contact & réseaux sociaux gérés depuis l'admin
-- ============================================================
-- Une seule ligne (id = true) : coordonnées de contact affichées sur /contact
-- et liens des réseaux sociaux (barre du haut, pied de page, bouton WhatsApp).
-- Lecture publique (ce sont des informations déjà visibles sur le site) ;
-- écriture réservée aux admins porteurs de `site.manage`.
-- Un champ vide = l'élément est masqué sur le site.
-- ============================================================

insert into permissions (key, category, description) values
  ('site.manage', 'marketing', 'Gérer les coordonnées de contact et les liens des réseaux sociaux du site')
on conflict (key) do nothing;

insert into admin_role_permissions (role_id, permission_id)
select r.id, p.id from admin_roles r join permissions p on p.key = 'site.manage'
where r.key in ('super_admin', 'marketing_admin', 'content_admin')
on conflict do nothing;

create table if not exists site_settings (
  id boolean primary key default true check (id),
  contact_email text check (contact_email is null or char_length(contact_email) <= 120),
  contact_phone text check (contact_phone is null or char_length(contact_phone) <= 40),
  contact_address text check (contact_address is null or char_length(contact_address) <= 200),
  contact_hours text check (contact_hours is null or char_length(contact_hours) <= 120),
  facebook_url text check (facebook_url is null or facebook_url ~* '^https://'),
  instagram_url text check (instagram_url is null or instagram_url ~* '^https://'),
  tiktok_url text check (tiktok_url is null or tiktok_url ~* '^https://'),
  linkedin_url text check (linkedin_url is null or linkedin_url ~* '^https://'),
  x_url text check (x_url is null or x_url ~* '^https://'),
  youtube_url text check (youtube_url is null or youtube_url ~* '^https://'),
  whatsapp_channel_url text check (whatsapp_channel_url is null or whatsapp_channel_url ~* '^https://'),
  updated_at timestamptz not null default now()
);

alter table site_settings enable row level security;

create policy "Lecture publique des réglages du site" on site_settings
  for select using (true);
create policy "Gestion des réglages du site" on site_settings
  for all using (has_permission('site.manage')) with check (has_permission('site.manage'));

-- Valeurs actuelles du site (modifiables ensuite depuis /admin/contact-reseaux).
-- contact_hours reste vide : le texte traduit par défaut s'affiche tant qu'il n'est pas renseigné.
insert into site_settings (id, contact_email, contact_phone, contact_address, facebook_url, instagram_url, tiktok_url, linkedin_url, whatsapp_channel_url)
values (
  true,
  'contact@tikeo.com',
  '+225 07 00 00 00 00',
  'Abidjan, Côte d''Ivoire',
  'https://facebook.com/tikeo',
  'https://instagram.com/tikeo',
  'https://tiktok.com/@tikeo',
  'https://linkedin.com/company/tikeo',
  'https://whatsapp.com/channel/0029Vb8vVkw2kNFnqt0cAx0c'
)
on conflict (id) do nothing;
