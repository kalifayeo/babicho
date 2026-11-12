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
