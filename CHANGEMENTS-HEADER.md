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
