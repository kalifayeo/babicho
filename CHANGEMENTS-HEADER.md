# Nouveau header + nouvelle bannière d'accueil

- `components/AppHeader.vue` : capsule flottante en verre dépoli (translucide sur la bannière, claire/sombre au défilement, se range en descendant). Recherche en fenêtre (touche `/` ou Ctrl+K), menu « Plus » (liens + langue), menu compte (avatar), tiroir mobile conservé.
- `layouts/default.vue` : la barre du haut (`AppTopBar`) n'est plus affichée ; le contenu des pages hors accueil est décalé sous le header flottant.
- `components/HeroSection.vue` : bannière épurée en deux colonnes (titre + recherche + chiffres à gauche, diaporama/vidéo + prochain événement à droite). Mêmes données admin (`home_slides`, `home_hero_content`, vidéo de présentation).
- `i18n/locales/*.json` : nouvelle clé `header.more`.
- `AppTopBar.vue` et `Hero3D.vue` restent dans le projet mais ne sont plus utilisés.

## Suite de l'accueil (sections du bas)
- `tailwind.config.ts` : nouvelle largeur `max-w-tikeo-content` (1240 px), alignée sur le header ; utilisée par le hero, les catégories, les rangées d'événements, « Pourquoi Babicho », la bannière organisateur, l'application mobile et le pied de page.
- `TrustStats.vue` : panneau arrondi, 3 engagements séparés par de fines lignes, icône qui s'illumine au survol, moyens de paiement dans une pastille, apparition en cascade.
- `OrganizerCtaBanner.vue` : carte sombre resserrée, étapes reliées par une ligne, arrivée en cascade, bouton « aimanté ».
- `AppDownloadSection.vue` : la bande orange pleine largeur devient une carte arrondie.
- `pages/index.vue` / `CategoriesRow.vue` : titres et cartes d'événements apparaissent en cascade au défilement.

## Animations (version 3)
- `TrustStats.vue` : mosaïque (bento) à 4 blocs — billet QR scanné par un laser, logos de paiement en orbite autour de « FCFA », ondes du support, chiffres RÉELS (useHomeStats) qui montent ; le bloc chiffres devient un bouton « Explorer » tant qu'ils ne sont pas chargés.
- `OrganizerCtaBanner.vue` : 3 étapes reliées par une ligne lumineuse qui se remplit pendant le défilement ; maquettes animées (saisie, interrupteurs, graphique + compteur).
- `CategoriesRow.vue` : pastilles à icône ronde colorée, apparition en cascade, survol animé.
- `pages/index.vue` : barre de progression sous chaque rangée d'événements (cartes déjà inclinées en 3D via v-tilt dans EventCard).
- `AppDownloadSection.vue` : la carte apparaît en zoom.
- Toutes les animations respectent « réduire les animations » (système ou réglage Babicho).

## Version 4 : cartes d'événements alignées sur la maquette
- `EventCard.vue` (carte standard) : grande photo avec le jour en très grand, pastille de catégorie, favori en verre sombre, titre, lieu, date, prix et flèche ronde qui devient orange au survol. Favori, abonnement, lien, cotisations et drapeau pays sont conservés.
- `pages/index.vue` : cartes de 292 px (4 par rangée sur 1240 px).
- `TrustStats.vue` : orbite de paiement entièrement visible, textes sans chevauchement.

## Version 5 : page détail événement (`pages/e/[slug].vue`)
- Nouveau hero : fond flouté de la couverture, affiche en 3D (pivote vers la souris, flotte, 2 cartes en profondeur), pastilles flottantes (date, favori, prix « à partir de »), titre XXL, cartes date/lieu, bouton « Choisir mes billets » + partage.
- Billets en vrais tickets (encoches, séparation pointillée, bordure orange quand sélectionné, animation de quantité).
- Cartes arrondies, titres de section modernisés, apparition au scroll, récapitulatif plus riche.
- `layouts/default.vue` : les pages `/e/…` passent sous le header flottant. `components/SimilarEvents.vue` : largeur alignée.
- Toutes les fonctions (favoris, partage, promo, réservation, avis, liste d'attente) sont conservées.

## Version 6 : tableau de bord « Mon espace »
- `components/AccountNav.vue` : barre latérale en groupes clairs (Mes achats / Mon compte), icône + courte explication par entrée ; pastilles arrondies sur mobile.
- `components/AccountShell.vue` : bandeau arrondi, barre latérale à gauche + contenu à droite (toutes les pages Mon espace en profitent).
- `pages/mon-espace/tableau-de-bord/index.vue` : 3 cartes chiffres animées, grande carte « Votre prochain événement » (3D), prochains billets, dernières commandes, état vide engageant.
- `assets/css/main.css` : briques `acc-*` arrondies. `i18n/locales/*.json` : nouveaux textes (fr/en/es/pt).

## Version 7 : pied de page allégé + loader 3D
- `components/AppFooter.vue` : bandeau d'engagements supprimé, liens sans icônes (4 colonnes courtes), contact réduit, bas de page sur une ligne, fond bleu nuit arrondi.
- `components/Loader3D.vue` (nouveau) : cube 3D orange/bleu qui tourne et flotte, avec satellite en orbite.
- `components/NavigationLoader.vue` : le logo Babicho est remplacé par ce loader pendant les changements de page.

## Version 8 : première section (hero) de l'accueil
- `components/HeroSection.vue` : le hero n'est plus plein écran mais une carte arrondie centrée (largeur du contenu), plus basse et plus compacte ; titre/recherche resserrés.
- Cadre visuel : arrière-plan flouté + image affichée en entier (plus jamais rognée, comme l'affiche « Paiement simplifié ») ; inclinaison 3D au survol ; la carte « Prochain événement » est sortie de l'image et posée dessous.
- `components/AppHeader.vue` : la capsule du header est toujours claire (le hero n'est plus sombre derrière). `layouts/default.vue` : l'accueil réserve la place du header.

## Version 9 : hero rapproché du header
- `components/HeroSection.vue` : suppression du double espacement (le gabarit réserve déjà la place du header) ; la carte est maintenant à ~18 px sous la capsule.

## Version 10 : page Tarifs + Blog
- `components/PageHero.vue` : bandeau arrondi centré (halo, trame, apparition animée) — repris automatiquement par toutes les pages qui l'utilisent (Tarifs, FAQ, Contact, À propos…).
- `components/SectionHeading.vue` (props `text` et `center` enfin pris en charge), `components/FaqItem.vue` (bouton rond qui pivote).
- `pages/organisateur/tarifs/index.vue` : paliers en cartes 3D arrondies (palier actuel en bleu nuit), cartes « qui paie », simulateur avec curseurs + barre de répartition, étapes, bloc « sur mesure » et CTA arrondis.
- `components/BlogCard.vue`, `pages/blog/index.vue`, `pages/blog/[slug].vue` : cartes arrondies avec pastille de catégorie, filtres en pastilles, recherche arrondie, en-tête d'article en carte.

## Version 11 : FAQ, Qui sommes-nous, Contact
- `pages/faq/index.vue` : recherche en pilule, catégories en carte latérale arrondie (pastilles sur mobile), accordéons arrondis, bloc « Une question sans réponse ? » lumineux.
- `pages/qui-sommes-nous/index.vue` : hero en carte arrondie avec photo, chiffres en carte flottante, billet « paiements » incliné en 3D, valeurs et « Pour qui ? » arrondis.
- `pages/contact/index.vue` : formulaire arrondi (champs, sujets rapides en pastilles, bouton pilule), colonne d'infos en cartes, réseaux en boutons ronds.

## Version 12 : Presse + Partenaires
- `pages/presse/index.vue` : bandeau `PageHero`, « Babicho en bref » en carte avec chiffres en tuiles, article à la une avec halo et bouton, cartes et kit média arrondis (icônes qui pivotent), bloc contact lumineux.
- `pages/partenaires/index.vue` : bandeau `PageHero` avec compteur, filtres en pastilles, cartes « à la une » et logos arrondis, avantages en cartes qui se soulèvent.

## Version 13 — Images d'événements cassées + corrections

- `plugins/img-fallback.client.ts` (NOUVEAU) : si l'image de couverture d'un événement ne charge pas (URL morte, 404…), elle est remplacée automatiquement par `/sample-event.jpg`. Plus de zones bleues vides.
- Attribut `data-img-fallback` ajouté sur les images de couverture : SearchSuggestions, FeaturedEventsBand, HeroSection, EventCard, admin/a-la-une, mes-billets, tableau-de-bord, organisateur/evenements, commande/[id], e/[slug], transfert/[token].
- i18n en/es/pt : ajout de `event.almostGone` et `event.limitedPlaces`.
- `supabase/seed/seed_demo_presentation.sql` : testé sur PostgreSQL 16 (exécutable 2 fois sans erreur).

## Version 14 — Filtres de prix + couverture obligatoire

- `components/FiltersPanel.vue` : raccourcis de prix (Gratuit, ≤ 1 000 F, ≤ 5 000 F, Tous) et curseur au pas de 500 F (avant 5 000 F, inadapté aux billets à 2 F ou 10 F). Utilisé par la sidebar desktop et le tiroir mobile.
- `pages/organisateur/evenements/nouveau.vue` : publication refusée sans affiche (le brouillon reste possible) ; l'aperçu étape 3 affiche un message si l'affiche manque, et utilise le fallback d'image.
- i18n fr/en/es/pt : `filters.priceFree/priceUnder/priceAll`, `eventWizard.coverRequiredError/coverMissingHint`.

## Version 15 — Défilement automatique du hero (accueil)

- `components/HeroSection.vue` : le diaporama ne s'arrête plus (1) quand la souris est sur le texte (seul le survol du cadre image met en pause), (2) quand « réduire les animations » est actif (le défilement continue, seuls l'effet Ken Burns et la lecture vidéo auto sont coupés), (3) quand la vidéo de présentation ne démarre pas (on n'attend sa fin que si elle joue réellement, sinon on avance après 9 s).
- Ajout d'un bouton pause/lecture à côté des pastilles.

## Version 16 — Admin : contrôle des images

- `composables/useCoverCheck.ts` (NOUVEAU) : teste dans le navigateur si l'affiche de chaque événement se charge (6 en parallèle, 8 s max) → états Sans image / Image cassée / OK.
- `pages/admin/evenements/index.vue` : colonne miniature, badge « Sans image » / « Image cassée », filtre « Images à corriger (n) », bouton « Vérifier les images » (contrôle automatique des événements publiés à l'ouverture).
- `pages/admin/a-la-une/index.vue` : avertissement rouge si l'événement épinglé (ou proposé dans le sélecteur) n'a pas d'affiche.
- i18n fr/en/es/pt : clés `adminEvents.colImage/imageMissing/imageBroken/imageOk/imagesToFix/checkImages/checking`, `adminFeatured.noCoverWarn`.
