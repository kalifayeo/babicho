-- ============================================================
-- BABICHO — Événements de démonstration pour une présentation
-- ============================================================
-- 13 éléments publiés, avec de vraies photos (Unsplash) :
--   * 8 événements payants à petits prix (2 F, 10 F, 30 F, 50 F, 100 F) pour
--     pouvoir tester un vrai paiement Mobile Money sans se ruiner ;
--   * 2 événements 100 % gratuits ;
--   * 3 causes solidaires (cotisation, don santé, bourses) avec montants
--     libres et barre d'objectif.
-- Certains types de billets sont « épuisés » pour montrer la liste d'attente.
--
-- À exécuter UNE fois dans Supabase > SQL Editor.
-- Remplace l'e-mail ci-dessous par celui de ton compte organisateur/admin.
-- Le script peut être relancé : il remplace l'ancienne démo. Préfixe de slug « demo- ».
-- Pour tout retirer ensuite :
--   delete from events where slug like 'demo-%';
-- (impossible si une vraie commande existe déjà sur l'un d'eux.)
-- ============================================================
do $$
declare
  v_email text := 'kalifayeo11@gmail.com'; -- <-- adapte si besoin
  v_user_id uuid;
  v_org_id uuid;
  v_event_id uuid;
  v_cat_cotis uuid;
  v_cat_sante uuid;
  v_cat_educ uuid;
begin
  select id into v_user_id from auth.users where email = v_email;
  if v_user_id is null then
    raise exception 'Aucun utilisateur trouvé pour %', v_email;
  end if;

  -- Relance possible : on retire d'abord l'ancienne démo (sauf si une vraie
  -- commande existe déjà dessus, auquel cas elle est conservée).
  delete from events e
  where e.slug like 'demo-%'
    and not exists (select 1 from orders o where o.event_id = e.id);
  if exists (select 1 from events where slug like 'demo-%') then
    raise exception 'Des événements demo-* ont déjà des commandes : supprime-les à la main ou change leurs slugs.';
  end if;

  -- Espace organisateur : réutilisé s'il existe, sinon créé (et approuvé).
  select id into v_org_id from organizers where user_id = v_user_id;
  if v_org_id is null then
    insert into organizers (user_id, name, slug, email, status)
    values (v_user_id, 'Babicho Live', 'babicho-live', v_email, 'approved')
    returning id into v_org_id;
  else
    update organizers set status = 'approved' where id = v_org_id;
  end if;

  -- 1) Festival — plusieurs types de billets, dont un épuisé ---------------
  insert into events (organizer_id, title, slug, description, cover_image, category_id,
                      start_date, end_date, location_name, address, city, country,
                      latitude, longitude, max_tickets_per_buyer, status)
  values (v_org_id, 'Abidjan Afro Festival 2026', 'demo-abidjan-afro-festival',
          E'Trois soirées de musique afro avec les plus grands artistes de la scène ivoirienne et africaine.\n\nMusique live, street food, village des créateurs et ambiance garantie.\n\nPortes ouvertes dès 17h.',
          'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1400&q=80',
          (select id from categories where slug = 'festival'),
          '2026-12-19 18:00:00+00', '2026-12-21 02:00:00+00',
          'Parc des Expositions d''Abidjan', 'Port-Bouët', 'Abidjan', 'Côte d''Ivoire',
          5.2547, -3.9322, 8, 'published')
  returning id into v_event_id;
  insert into ticket_types (event_id, name, description, price, quantity, sold_quantity) values
    (v_event_id, 'Early Bird',  'Tarif de lancement, accès général 1 soirée', 2,    100, 100),
    (v_event_id, 'Standard',    'Accès général, 1 soirée',                    10,   1500, 240),
    (v_event_id, 'Pass 3 jours','Accès aux 3 soirées',                        30,   600,  85),
    (v_event_id, 'VIP',         'Zone VIP, 1 boisson offerte, accès rapide',  100,  150,  22);

  -- 2) Concert ------------------------------------------------------------
  insert into events (organizer_id, title, slug, description, cover_image, category_id,
                      start_date, location_name, address, city, country, latitude, longitude, status)
  values (v_org_id, 'Nuit Zouglou & Coupé-Décalé', 'demo-nuit-zouglou',
          E'Une grande nuit de danse avec les stars du zouglou et du coupé-décalé.\n\nDJ sets, invités surprise et show live.',
          'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1400&q=80',
          (select id from categories where slug = 'concert'),
          '2026-12-12 20:00:00+00', 'Palais de la Culture', 'Treichville', 'Abidjan', 'Côte d''Ivoire',
          5.2896, -4.0077, 'published')
  returning id into v_event_id;
  insert into ticket_types (event_id, name, description, price, quantity, sold_quantity) values
    (v_event_id, 'Standard', 'Placement libre',      10,    800, 130),
    (v_event_id, 'VIP',      'Places assises, bar',  30,    120, 40);

  -- 3) Conférence ---------------------------------------------------------
  insert into events (organizer_id, title, slug, description, cover_image, category_id,
                      start_date, end_date, location_name, address, city, country, latitude, longitude, status)
  values (v_org_id, 'Abidjan Tech Summit', 'demo-abidjan-tech-summit',
          E'La rencontre annuelle des startups, développeurs et investisseurs de la tech ivoirienne.\n\nConférences, ateliers et rencontres investisseurs.',
          'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1400&q=80',
          (select id from categories where slug = 'conference'),
          '2027-01-16 08:30:00+00', '2027-01-16 18:00:00+00',
          'Sofitel Abidjan Hôtel Ivoire', 'Cocody', 'Abidjan', 'Côte d''Ivoire', 5.3369, -3.9888, 'published')
  returning id into v_event_id;
  insert into ticket_types (event_id, name, description, price, quantity, sold_quantity) values
    (v_event_id, 'Étudiant',     'Sur présentation de la carte',        2,     150, 60),
    (v_event_id, 'Participant',  'Accès conférences + déjeuner',        10,    400, 95),
    (v_event_id, 'Investisseur', 'Accès complet + soirée networking',   50,    60,  12);

  -- 4) Spectacle d'humour -------------------------------------------------
  insert into events (organizer_id, title, slug, description, cover_image, category_id,
                      start_date, location_name, address, city, country, latitude, longitude, status)
  values (v_org_id, 'La Grande Nuit du Rire', 'demo-nuit-du-rire',
          E'Les meilleurs humoristes de la sous-région réunis sur une seule scène.\n\nPrévoyez des mouchoirs : vous allez pleurer de rire.',
          'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1400&q=80',
          (select id from categories where slug = 'spectacle'),
          '2027-01-30 19:30:00+00', 'Théâtre de Cocody', 'Cocody', 'Abidjan', 'Côte d''Ivoire', 5.3600, -3.9900, 'published')
  returning id into v_event_id;
  insert into ticket_types (event_id, name, description, price, quantity, sold_quantity) values
    (v_event_id, 'Standard', 'Placement libre',        10,    500, 180),
    (v_event_id, 'Carré Or', 'Premiers rangs',         30,    80,  80);

  -- 5) Sport (autre ville) ------------------------------------------------
  insert into events (organizer_id, title, slug, description, cover_image, category_id,
                      start_date, location_name, address, city, country, latitude, longitude, status)
  values (v_org_id, 'Tournoi de Football des Quartiers', 'demo-tournoi-football',
          E'Finale du tournoi inter-quartiers de Bouaké : 16 équipes, une seule couronne.\n\nAmbiance de stade, animations et restauration sur place.',
          'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1400&q=80',
          (select id from categories where slug = 'sport'),
          '2026-12-27 15:00:00+00', 'Stade Municipal de Bouaké', 'Centre-ville', 'Bouaké', 'Côte d''Ivoire',
          7.6906, -5.0300, 'published')
  returning id into v_event_id;
  insert into ticket_types (event_id, name, description, price, quantity, sold_quantity) values
    (v_event_id, 'Populaire', 'Tribune libre',          2,    3000, 640),
    (v_event_id, 'Tribune',   'Tribune couverte',       10,   800,  210);

  -- 6) Formation ----------------------------------------------------------
  insert into events (organizer_id, title, slug, description, cover_image, category_id,
                      start_date, end_date, location_name, address, city, country, latitude, longitude, status)
  values (v_org_id, 'Masterclass Entrepreneuriat Digital', 'demo-masterclass-digital',
          E'Une journée pour apprendre à lancer et vendre votre activité en ligne : offre, réseaux sociaux, paiement mobile.\n\nCertificat de participation remis.',
          'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1400&q=80',
          (select id from categories where slug = 'formation'),
          '2027-02-06 09:00:00+00', '2027-02-06 17:00:00+00',
          'Cocody Business Center', 'Riviera 2', 'Abidjan', 'Côte d''Ivoire', 5.3490, -3.9650, 'published')
  returning id into v_event_id;
  insert into ticket_types (event_id, name, description, price, quantity, sold_quantity) values
    (v_event_id, 'Place standard', 'Journée complète + support PDF', 30,    120, 35);

  -- 7) Culture (Yamoussoukro) --------------------------------------------
  insert into events (organizer_id, title, slug, description, cover_image, category_id,
                      start_date, end_date, location_name, address, city, country, latitude, longitude, status)
  values (v_org_id, 'Festival des Arts et Traditions', 'demo-festival-arts-traditions',
          E'Danses, masques, contes et gastronomie : toute la richesse culturelle ivoirienne réunie à Yamoussoukro.',
          'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1400&q=80',
          (select id from categories where slug = 'culture'),
          '2027-02-13 10:00:00+00', '2027-02-14 22:00:00+00',
          'Place de la Paix', 'Centre-ville', 'Yamoussoukro', 'Côte d''Ivoire', 6.8276, -5.2893, 'published')
  returning id into v_event_id;
  insert into ticket_types (event_id, name, description, price, quantity, sold_quantity) values
    (v_event_id, 'Pass 1 jour', 'Accès à une journée', 2,    2000, 310),
    (v_event_id, 'Pass 2 jours','Accès aux deux jours', 10,   1500, 220);

  -- 8) Networking gratuit -------------------------------------------------
  insert into events (organizer_id, title, slug, description, cover_image, category_id,
                      start_date, location_name, address, city, country, latitude, longitude, status)
  values (v_org_id, 'Afterwork Entrepreneurs Abidjan', 'demo-afterwork-entrepreneurs',
          E'Une soirée détendue pour rencontrer d''autres entrepreneurs, partager vos idées et créer des partenariats.\n\nEntrée gratuite, inscription obligatoire.',
          'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=80',
          (select id from categories where slug = 'networking'),
          '2026-11-27 18:30:00+00', 'Rooftop Plateau', 'Plateau', 'Abidjan', 'Côte d''Ivoire', 5.3230, -4.0200, 'published')
  returning id into v_event_id;
  insert into ticket_types (event_id, name, description, price, quantity, sold_quantity) values
    (v_event_id, 'Entrée gratuite', 'Inscription obligatoire', 0, 150, 48);

  -- 9) Gratuit : cinéma en plein air --------------------------------------
  insert into events (organizer_id, title, slug, description, cover_image, category_id,
                      start_date, location_name, address, city, country, latitude, longitude, max_tickets_per_buyer, status)
  values (v_org_id, 'Cinéma en plein air — Soirée Cinéma Africain', 'demo-cinema-plein-air',
          E'Une projection gratuite sous les étoiles, avec des courts-métrages africains primés.\n\nApportez votre natte et votre bonne humeur.',
          'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1400&q=80',
          (select id from categories where slug = 'culture'),
          '2026-12-05 19:00:00+00', 'Esplanade de la Riviera', 'Riviera Golf', 'Abidjan', 'Côte d''Ivoire',
          5.3550, -3.9500, 4, 'published')
  returning id into v_event_id;
  insert into ticket_types (event_id, name, description, price, quantity, sold_quantity) values
    (v_event_id, 'Entrée gratuite', 'Réservation obligatoire', 0, 400, 120);

  -- 10) Gratuit : journée portes ouvertes --------------------------------
  insert into events (organizer_id, title, slug, description, cover_image, category_id,
                      start_date, end_date, location_name, address, city, country, latitude, longitude, status)
  values (v_org_id, 'Portes ouvertes — Orientation des jeunes', 'demo-portes-ouvertes',
          E'Rencontrez des écoles, des entreprises et des professionnels pour construire votre projet d''avenir.\n\nEntrée libre et gratuite.',
          'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1400&q=80',
          (select id from categories where slug = 'formation'),
          '2027-01-23 09:00:00+00', '2027-01-23 16:00:00+00',
          'Université Félix Houphouët-Boigny', 'Cocody', 'Abidjan', 'Côte d''Ivoire', 5.3410, -3.9810, 'published')
  returning id into v_event_id;
  insert into ticket_types (event_id, name, description, price, quantity, sold_quantity) values
    (v_event_id, 'Visiteur', 'Entrée libre', 0, 1000, 210);

  -- ===== CAUSES SOLIDAIRES : dons et cotisations ===========================
  -- Pas de billet : chaque « type » est un MONTANT proposé au contributeur
  -- (quantité illimitée = 1 000 000, comme dans l'assistant de création).
  select id into v_cat_cotis from categories where slug = 'cotisations';
  select id into v_cat_sante from categories where slug = 'sante-maladie';
  select id into v_cat_educ  from categories where slug = 'education-bourses';
  if v_cat_cotis is null or v_cat_sante is null or v_cat_educ is null then
    raise exception 'Catégories de causes introuvables : exécute d''abord la migration 0051_causes_solidaires.sql';
  end if;

  -- 11) Cotisation ---------------------------------------------------------
  insert into events (organizer_id, title, slug, description, cover_image, category_id,
                      start_date, city, country, goal_amount, show_goal_public, show_contributions_public, status)
  values (v_org_id, 'Cotisation — Mariage d''Awa & Ibrahim', 'demo-cotisation-mariage',
          E'Awa et Ibrahim se marient le mois prochain. Aidez la famille à financer la cérémonie : chaque contribution, même petite, compte.\n\nMerci du fond du cœur !',
          'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=80',
          v_cat_cotis, '2027-03-31 23:59:00+00', 'Abidjan', 'Côte d''Ivoire', 500000, true, true, 'published')
  returning id into v_event_id;
  insert into ticket_types (event_id, name, description, price, quantity, sold_quantity) values
    (v_event_id, 'Petit geste', 'Merci pour votre soutien', 100,   1000000, 38),
    (v_event_id, 'Cotisation',  'La participation habituelle', 1000,  1000000, 54),
    (v_event_id, 'Coup de pouce','Un grand merci',             5000,  1000000, 21),
    (v_event_id, 'Grand cœur',  'Pour les plus généreux',     20000, 1000000, 6);

  -- 12) Don santé ----------------------------------------------------------
  insert into events (organizer_id, title, slug, description, cover_image, category_id,
                      start_date, city, country, goal_amount, show_goal_public, show_contributions_public, status)
  values (v_org_id, 'Aidons Mamadou à se soigner', 'demo-don-sante-mamadou',
          E'Mamadou, 34 ans, doit subir une opération urgente. Sa famille a besoin de votre aide pour réunir les frais médicaux.\n\nChaque don est utilisé uniquement pour ses soins.',
          'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&w=1400&q=80',
          v_cat_sante, '2027-02-28 23:59:00+00', 'Bouaké', 'Côte d''Ivoire', 1000000, true, true, 'published')
  returning id into v_event_id;
  insert into ticket_types (event_id, name, description, price, quantity, sold_quantity) values
    (v_event_id, 'Don 2 F',     'Même 2 F comptent',          2,     1000000, 120),
    (v_event_id, 'Don 10 F',    'Un petit geste',             10,    1000000, 210),
    (v_event_id, 'Don 100 F',   'Merci de tout cœur',         100,   1000000, 95),
    (v_event_id, 'Don 1 000 F', 'Un soutien précieux',        1000,  1000000, 40),
    (v_event_id, 'Don 10 000 F','Un immense merci',           10000, 1000000, 9);

  -- 13) Bourses ------------------------------------------------------------
  insert into events (organizer_id, title, slug, description, cover_image, category_id,
                      start_date, city, country, goal_amount, show_goal_public, show_contributions_public, status)
  values (v_org_id, 'Bourses pour 20 élèves méritants', 'demo-bourses-eleves',
          E'Aidez 20 élèves brillants mais sans moyens à payer leurs frais de scolarité cette année.\n\nLes fonds sont versés directement aux établissements.',
          'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1400&q=80',
          v_cat_educ, '2027-04-30 23:59:00+00', 'Yamoussoukro', 'Côte d''Ivoire', 2000000, true, false, 'published')
  returning id into v_event_id;
  insert into ticket_types (event_id, name, description, price, quantity, sold_quantity) values
    (v_event_id, 'Un cahier',     'Fournitures d''un élève',     30,    1000000, 150),
    (v_event_id, 'Un mois',       'Un mois de scolarité',        500,   1000000, 66),
    (v_event_id, 'Un trimestre',  'Un trimestre de scolarité',   5000,  1000000, 18),
    (v_event_id, 'Une bourse',    'Une année complète',          50000, 1000000, 3);

  raise notice '13 éléments de démonstration créés pour %', v_email;
end $$;

-- Vérification : liste ce qui vient d'être créé.
select e.title, c.name as categorie, c.kind as type, e.city, e.start_date::date as date,
       count(t.id) as nb_montants_ou_billets, min(t.price) as prix_min, max(t.price) as prix_max
from events e
left join categories c on c.id = e.category_id
left join ticket_types t on t.event_id = e.id
where e.slug like 'demo-%'
group by e.title, c.name, c.kind, e.city, e.start_date
order by e.start_date;
