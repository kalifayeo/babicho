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
