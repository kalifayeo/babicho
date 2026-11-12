# BABICHO web – Hero 3D & cartes interactives

Nouveaux : utils/three/heroScene.ts, utils/gfx.ts, components/Hero3D.vue
Modifiés : components/HeroSection.vue, components/EventCard.vue, plugins/reveal.ts (directive v-tilt), assets/css/main.css, package.json (three)

Après copie : `npm install --legacy-peer-deps` puis redéployer.

Performance : Three.js chargé en différé (import dynamique), aucune ressource externe, 3 niveaux (complet / allégé / aucun),
pause hors écran, dégradation automatique si FPS faible, désactivé avec « réduire les animations », économiseur de données ou 2G/3G
(repli CSS 3D léger). Aucune logique métier modifiée.
