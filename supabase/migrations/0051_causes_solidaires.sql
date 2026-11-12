-- ============================================================
-- TIKEO — Causes solidaires (demandes d'aide, cotisations, etc.)
--
-- Tikeo n'est pas qu'une billetterie : la plateforme sert aussi à publier
-- des demandes d'aide (maladie, cotisations, deuil, urgence...). Une
-- catégorie a donc un « type » :
--   - 'event' : événement classique, l'acheteur reçoit un billet ;
--   - 'cause' : cause solidaire, le contributeur reçoit un message de
--     remerciement (jamais un billet).
-- Un événement est une cause quand sa catégorie est de type 'cause'.
-- ============================================================

alter table categories
  add column if not exists kind text not null default 'event';

alter table categories drop constraint if exists categories_kind_check;
alter table categories
  add constraint categories_kind_check check (kind in ('event', 'cause'));

insert into categories (name, slug, icon, kind, position) values
  ('Santé & maladie',            'sante-maladie',        'heart',       'cause', 101),
  ('Cotisations & tontines',     'cotisations',          'coins',       'cause', 102),
  ('Deuil & obsèques',           'deuil-obseques',       'flower',      'cause', 103),
  ('Éducation & bourses',        'education-bourses',    'graduation-cap', 'cause', 104),
  ('Urgence & sinistres',        'urgence-sinistres',    'life-buoy',   'cause', 105),
  ('Solidarité & entraide',      'solidarite',           'handshake',   'cause', 106),
  ('Projets communautaires',     'projets-communautaires','users',      'cause', 107)
on conflict (slug) do update
  set kind = excluded.kind,
      icon = excluded.icon;

-- Le lecteur public voit déjà `categories` (RLS « Tout le monde peut lire »),
-- la nouvelle colonne est donc lisible sans politique supplémentaire.
