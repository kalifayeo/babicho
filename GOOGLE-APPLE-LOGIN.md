# Connexion avec Google et Apple (iCloud)

Les boutons « Continuer avec Google / Apple » sont sur `/inscription` et `/connexion`
(`components/OAuthButtons.vue`). Le code est prêt ; **il reste à activer les deux
fournisseurs dans Supabase** — aucune variable d'environnement à ajouter dans Babicho.

> « iCloud » = **Apple** : l'identifiant Apple (Apple ID) est le compte iCloud.
> Il n'existe pas de bouton « iCloud » séparé.

## 0. À faire dans tous les cas (Supabase)

1. SQL Editor : exécuter `supabase/migrations/0053_oauth_signup_profile.sql`
   (nom + photo du profil pour les comptes Google/Apple).
2. Authentication > URL Configuration :
   - **Site URL** : `https://babicho.com`
   - **Redirect URLs** : `https://babicho.com/auth/callback`,
     `http://localhost:3000/auth/callback` (et l'URL Vercel de test si besoin).
   Sans cela, Supabase refuse le retour sur `/auth/callback`.

L'URL de retour **Supabase** (à donner à Google et Apple) est :
`https://<ref-du-projet>.supabase.co/auth/v1/callback`
(visible en haut de la page du fournisseur dans Authentication > Sign In / Providers).

## 1. Google (gratuit)

1. https://console.cloud.google.com > créer un projet > **APIs & Services** >
   **OAuth consent screen** (nom « Babicho », logo, email de support, domaine babicho.com).
2. **Credentials** > Create credentials > **OAuth client ID** > type **Web application** :
   - Authorized JavaScript origins : `https://babicho.com` (+ `http://localhost:3000` pour tester)
   - Authorized redirect URIs : l'URL de retour Supabase ci-dessus
3. Copier **Client ID** et **Client secret** dans Supabase > Authentication >
   Sign In / Providers > **Google** > Enable.
4. Tant que l'écran de consentement est en mode « Test », seuls les comptes testeurs
   peuvent se connecter : passer en **Production** avant le lancement.

## 2. Apple (compte Apple Developer payant, 99 $/an)

> Le bouton Apple est **grisé** (« Bientôt ») tant qu'Apple n'est pas configuré. Une fois Apple
> activé dans Supabase, passer `APPLE_ENABLED` à `true` dans `components/OAuthButtons.vue`.

1. https://developer.apple.com > Certificates, Identifiers & Profiles :
   - **App ID** avec la capacité « Sign in with Apple »
   - **Services ID** (c'est lui le « Client ID » web) : activer « Sign in with Apple » >
     Configure : domaine `<ref>.supabase.co` et Return URL = l'URL de retour Supabase
   - **Key** (.p8) avec « Sign in with Apple » : noter le Key ID, télécharger le .p8 (une seule fois)
2. Supabase > Providers > **Apple** : renseigner le Services ID et le **secret** (un JWT
   généré à partir de la clé .p8, du Team ID et du Key ID — voir le générateur indiqué
   dans la doc Supabase « Login with Apple »).
3. ⚠️ **Le secret Apple expire au bout de 6 mois maximum** : prévoir un rappel pour le
   régénérer, sinon le bouton Apple cessera de fonctionner d'un coup.

## Comportements à connaître

- Un compte Google dont l'email est déjà inscrit chez Babicho est rattaché au même compte
  (Supabase relie les identités ayant le même email vérifié).
- Apple propose « Masquer mon e-mail » : l'utilisateur obtient une adresse relais
  (`…@privaterelay.appleid.com`) ; c'est alors un compte distinct d'un éventuel compte
  créé avec sa vraie adresse. Les emails Babicho (billets…) doivent pouvoir joindre ce relais :
  déclarer le domaine d'envoi dans Apple Developer > Sign in with Apple > Email Sources.
- Apple ne transmet le nom qu'à la toute première connexion ; sinon le profil s'appelle
  « Membre Babicho » et se modifie dans l'espace membre.
- CGU : à l'inscription la case est exigée avant d'aller chez Google/Apple ; sur
  `/connexion` une mention « En continuant… vous acceptez » est affichée. Dans les deux cas
  `terms_accepted_at` est enregistré au retour (`pages/auth/callback.vue`).
- Le 2FA admin continue de s'appliquer : se connecter avec Google ne dispense pas un
  administrateur de la vérification demandée en entrant dans `/admin`.

## Test rapide

1. `npm run dev`, ouvrir `/inscription`, cocher les CGU, cliquer « Continuer avec Google ».
2. Retour sur `/auth/callback` puis `/mon-espace/tableau-de-bord`, nom + photo dans le header.
3. Cliquer sans cocher les CGU → message d'erreur, aucune redirection.
4. Annuler chez Google → page « La connexion n'a pas abouti » avec bouton de retour.
