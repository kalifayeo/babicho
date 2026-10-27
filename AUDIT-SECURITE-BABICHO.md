# Audit de sécurité — Babicho (Nuxt 3 + Supabase + Vercel + Jèko)

Date : 27 octobre 2026 · Périmètre : code source du zip `babicho` (serveur Nitro, composables, pages, migrations SQL 0001→0060) · Méthode : revue de code statique + `npm audit`.

## Ce que cet audit n'a PAS couvert (à faire de votre côté)

- **Le site en production** (`babicho.vercel.app`) : je n'ai pas pu l'interroger (accès automatisé refusé par le site). Les en-têtes et la configuration réelle sont donc à vérifier avec les commandes de la section 6.
- **La base Supabase réelle** : je n'ai vu que les migrations. Il faut vérifier qu'elles sont toutes appliquées et lancer `supabase/security/audit_rls.sql` (requêtes A→K).
- **Les correctifs fournis n'ont pas été exécutés** (pas de `node_modules` ni d'accès à votre base). Ils sont courts et relus, mais testez-les en préproduction avant de déployer.

---

## 1. Points critiques — à traiter AVANT toute mise en ligne

### C1. Clés secrètes réelles présentes dans le zip

Le fichier `.env` **et** le build `.nuxt/dev/index.mjs` (+ sa `.map`) contiennent en clair :
la clé **`SUPABASE_SERVICE_ROLE_KEY`** (accès total à la base, contourne toute la RLS), la clé API **Brevo**, la clé API **Jèko** (`JEKO_API_KEY`, `JEKO_API_KEY_ID`) et le **secret de webhook Jèko**. Toute personne ayant reçu ce zip (ou un chat/e-mail/cloud où il a transité) peut les utiliser.

Je n'ai ni affiché ni recopié ces valeurs. Actions, dans cet ordre :

1. **Supabase** → Project Settings → API Keys : créer une nouvelle clé secrète, révoquer l'ancienne, mettre à jour Vercel.
2. **Jèko** → Dashboard → API & Webhooks : régénérer la clé API **et** le secret de webhook (mettre à jour Vercel + l'URL de webhook si elle change).
3. **Brevo** : supprimer la clé API (`xkeysib-…`) et en créer une nouvelle ; changer aussi la clé SMTP si elle a été saisie dans Supabase Auth. L'identifiant SMTP apparaît dans un commentaire du `.env`.
4. Vérifier qu'aucun `.env` n'a été poussé dans l'historique Git (`git log --all -- .env`). S'il y est : considérer les clés comme brûlées (déjà fait ci-dessus) et purger l'historique.
5. Ne plus jamais zipper le dossier avec `.env` / `.nuxt` / `.output` : partager une archive `git archive HEAD` à la place.
6. Après rotation, relire **Admin → Journal** et les logs Supabase/Jèko pour repérer une utilisation anormale des anciennes clés.

---

## 2. Failles et faiblesses trouvées

Légende : ✅ corrigé dans le paquet fourni · 🔧 action de configuration de votre côté · 📝 recommandation.

### Élevé

| # | Constat | Statut |
|---|---|---|
| E1 | **Anti-robots Cloudflare Turnstile désactivé** (`TURNSTILE_SECRET_KEY` et `NUXT_PUBLIC_TURNSTILE_SITE_KEY` vides). Inscription, connexion, code par e-mail, mot de passe oublié, contact, avis et liste d'attente sont ouverts aux scripts : création de comptes en masse, envoi d'e-mails de connexion à des tiers (bombardement), spam. | 🔧 Créer le widget Turnstile, renseigner les 2 clés dans Vercel **et** activer « CAPTCHA protection » dans Supabase → Authentication → Attack Protection. |
| E2 | **Fuite des chiffres d'affaires des organisateurs**. `organizer_paid_sales(uuid)` et `commission_rate_for(uuid)` (SECURITY DEFINER) n'ont jamais été retirées au rôle `PUBLIC` : un visiteur non connecté peut les appeler via `/rest/v1/rpc/…` avec l'UUID (public) d'un organisateur et lire ses ventes cumulées et son taux de commission négocié. De plus `event_card_stats` renvoie `raised` (somme des ventes) pour **tous** les événements publiés, pas seulement les causes. | ✅ `0061_security_hardening_2.sql` §1 et §3 |
| E3 | **SSRF via les notifications push**. `/api/push/subscribe` acceptait n'importe quelle URL `https://` comme « endpoint » ; le serveur y envoie ensuite une requête POST (cron). Un compte quelconque pouvait faire émettre des requêtes depuis votre serveur vers l'hôte de son choix. L'upsert permettait aussi de « reprendre » l'abonnement d'un autre compte. | ✅ `server/api/push/subscribe.post.ts` (liste blanche des services push des navigateurs + refus si l'endpoint appartient à un autre compte) |
| E4 | **Dépendances vulnérables** (`npm audit` : 18 alertes, dont 4 critiques, 9 hautes). Celles qui touchent la production : `jspdf` (critique : DoS/ReDoS, utilisé pour les billets PDF côté serveur **et** navigateur), `sharp` (haute : libvips/libheif, traite des images côté serveur), `node-forge` (haute : signature Apple Wallet), `devalue` (haute : DoS, utilisé par Nuxt), `nuxt` (modérée). Les critiques `simple-git`, `shell-quote`, `launch-editor`, `@nuxt/devtools` ne concernent que l'outillage de développement. | 🔧 Voir section 5. Non appliqué : `jspdf` 2→4 est un changement majeur à tester sur la génération de billets. |

### Moyen

| # | Constat | Statut |
|---|---|---|
| M1 | **Politique d'INSERT sur `profiles`** : `with check (auth.uid() = user_id)` sans contrainte sur `role`/`status`. Le verrou de privilèges (0016) ne couvre que les UPDATE. Aujourd'hui le trigger d'inscription crée toujours le profil, donc non exploitable, mais si une ligne `profiles` disparaît un jour, son propriétaire pourrait s'en recréer une avec `role = 'admin'`. | ✅ 0061 §4 |
| M2 | **Notifications vers les admins** : la politique « Organisateur notifie les administrateurs » ne vérifie pas que l'expéditeur est organisateur. N'importe quel compte peut injecter des notifications (titre, message, lien libres) chez les admins : phishing interne, spam. | ✅ 0061 §5 (+ bornes de taille et lien interne uniquement) |
| M3 | **`can_review_event(p_user_id, …)`** accordée à `authenticated` avec un UUID libre : permet de savoir si n'importe quel utilisateur a un billet pour un événement donné (atteinte à la vie privée). | ✅ 0061 §2 |
| M4 | **Limitation de débit** : basée uniquement sur l'IP (beaucoup d'utilisateurs mobiles partagent la même IP en Côte d'Ivoire → faux positifs ; contournable avec plusieurs IP) et **fail-open** (si le compteur SQL tombe, plus aucune limite). L'IP vient de `X-Forwarded-For` : fiable sur Vercel, falsifiable sur un hébergement sans proxy de confiance. | ✅ Option `failClosed` (activée sur code promo, contact, avis) et option `subject` (limite par compte) dans `rateLimit.ts`. 📝 Utiliser `subject: userId` sur `/api/tickets/[id]/transfer` et `/api/orders/[id]/pay`. |
| M5 | **Envoi d'e-mails depuis votre domaine par un utilisateur** : `/api/tickets/[id]/transfer` envoie un e-mail officiel avec un message libre (300 car.) et le nom de l'expéditeur choisi par lui, à n'importe quelle adresse (10/h/IP). Risque de spam/phishing « signé Babicho ». | 📝 Limite par compte, nom d'expéditeur normalisé, gabarit sans texte libre en en-tête. |
| M6 | **Stockage public `media` ouvert à tout compte connecté** : PDF et GIF jusqu'à 10 Mo, aucun quota. Un simple acheteur peut héberger des fichiers (phishing, contenu illicite, coût de stockage). | 📝 Réserver `event-covers`/`seating-plans`/`organizer-logos` aux organisateurs et admins, retirer `application/pdf` si inutile, passer à 5 Mo, ajouter un quota par compte. |
| M7 | **Devenir organisateur sans validation** (`/api/account/become-organizer` : rôle `organizer` immédiat, `status` « pending » purement informatif). N'importe qui peut publier des événements et encaisser des paiements via votre compte Jèko : **risque de fraude** (faux événements). | 📝 Décision produit : valider l'organisateur (`status = 'approved'`) avant publication/versement, ou au minimum avant tout reversement. |
| M8 | **CSP** : `script-src 'unsafe-inline'`, `img-src https:`, `media-src https:` — la politique bloque le gros des attaques mais n'arrête pas une XSS par script inline. Le risque est faible aujourd'hui (rendu Markdown et JSON-LD correctement échappés, pas de `v-html` sur données utilisateur). | 📝 À terme : `nuxt-security` avec nonces. |
| M9 | **Tâche planifiée** : `/api/cron/tick` n'accepte que `POST` ; Vercel Cron envoie des requêtes `GET`, et il n'y a pas de `vercel.json` dans le projet. `CRON_SECRET` est aussi absent du `.env`. Rappels d'événements, expirations de listes d'attente/transferts et envoi des notifications ne tournent probablement pas. | 🔧 Définir `CRON_SECRET`, planifier l'appel (attention : le plan Hobby de Vercel limite les crons à 1/jour ; sinon utiliser un ordonnanceur externe qui envoie `POST` + `Authorization: Bearer`). |

### Faible / information

| # | Constat | Statut |
|---|---|---|
| F1 | Redirection post-connexion : contrôle `startsWith('/')` seulement (`//hote` accepté). Non exploitable aujourd'hui (vue-router reste interne) mais incohérent avec `auth/callback`. | ✅ `utils/safeRedirect.ts` appliqué aux 5 pages |
| F2 | Rendu Markdown du blog : un lien `/\hote.com` était accepté (les navigateurs lisent `\` comme `/`). Réservé aux admins. | ✅ `utils/markdown.ts` |
| F3 | `scan/validate`, `scan/stats`, `notify-waitlist` : `eventId` non validé comme UUID ; recherche manuelle `ilike` ne neutralisait pas `\`, `,`, `(`, `)`. | ✅ |
| F4 | `contact.post.ts` sans limite de longueur (message illimité jusqu'à la limite du serveur) ; aucune borne en base. | ✅ API + contraintes SQL (0061 §6) |
| F5 | `confirm-payment` : `provider` libre (texte quelconque dans la comptabilité). | ✅ borné (`[a-z0-9_-]{1,40}`) |
| F6 | Pas de `Cache-Control: no-store` sur les réponses d'API privées (commandes, billets, compte, admin, scan, transferts). | ✅ `nuxt.config.ts` |
| F7 | CSP sans `form-action` ; pas de `X-Permitted-Cross-Domain-Policies`. | ✅ `nuxt.config.ts` |
| F8 | Pas de limitation de débit sur `reviews/[id]/reply` et `transfers/[id]/cancel` (accès authentifié, impact faible). | 📝 |
| F9 | Routes admin : le corps de la requête est lu avant la vérification des droits (`admin/users`, `admin/reply`). Sans conséquence grave, mais mieux vaut authentifier d'abord. | 📝 |

---

## 3. Ce qui est bien fait (à conserver)

- **Webhook Jèko** : signature HMAC-SHA256 sur le corps brut, comparaison à temps constant, **relecture du paiement chez Jèko** avec vos clés, contrôle du montant exact et de la devise, idempotence, une seule fonction SQL (`confirm_order_payment`) pour valider une commande.
- **Prix, stock, codes promo calculés en base** (`create_order`), jamais fournis par le navigateur ; fonctions sensibles réservées à `service_role` (0017/0033/0034/0043).
- **Identité toujours issue du jeton Supabase** (`requireUser`), statut du compte relu à chaque appel, sessions révoquées à la suspension.
- **Admin** : RBAC par permission, contrôle `aal2` (2FA) **côté serveur**, CSRF double-submit, journal d'audit.
- **RLS** activée sur toutes les tables créées par les migrations ; verrous de colonnes sensibles (`role`, `status`) ; SVG interdits dans le stockage.
- **Clé `service_role` isolée dans `server/`** (aucune référence côté client), conteneur Docker non-root, `.env` exclu de Git et de l'image Docker.
- Échappement HTML systématique dans les e-mails, `safeHttpUrl` / `safeInternalPath`, JSON-LD échappé, HSTS, `nosniff`, `frame-ancestors 'self'`, `object-src 'none'`.

---

## 4. Contenu du paquet de correctifs

Décompresser **par-dessus** le projet (mêmes chemins). Fichiers :

```
supabase/migrations/0061_security_hardening_2.sql   (NOUVEAU — à exécuter dans le SQL Editor Supabase)
utils/safeRedirect.ts                               (NOUVEAU)
nuxt.config.ts
server/utils/rateLimit.ts
server/api/push/subscribe.post.ts
server/api/contact.post.ts
server/api/feedback.post.ts
server/api/promo/validate.post.ts
server/api/scan/validate.post.ts
server/api/scan/stats.get.ts
server/api/events/[id]/notify-waitlist.post.ts
server/api/orders/[id]/confirm-payment.post.ts
utils/markdown.ts
pages/connexion/index.vue
pages/inscription/index.vue
pages/devenir-organisateur/index.vue
pages/admin/securite/index.vue
pages/admin/verification-2fa/index.vue
```

Ordre conseillé : (1) rotation des clés, (2) exécuter la migration 0061 sur un projet de test puis en production, (3) déployer le code, (4) refaire les tests de la section 6.

---

## 5. Dépendances — commandes

```bash
npm audit fix                       # corrige ce qui ne casse rien (devalue, vite, brace-expansion…)
npm install jspdf@^4.2.1            # CRITIQUE ; tester : billet PDF (serveur + « mes billets » + paramètres)
npm install sharp@^0.35.5           # tester : génération du PDF de billet (logo/QR)
npm install node-forge@latest       # tester : bouton Apple Wallet
npm audit --omit=dev                # doit ne plus rien signaler de critique/haut en production
```
Les alertes `simple-git`, `shell-quote`, `launch-editor`, `@nuxt/devtools` sont des outils de développement : ne pas les installer en production (`npm ci --omit=dev`) et garder les devtools désactivés (déjà le cas).

---

## 6. Vérifications à faire vous-même après correction

**En-têtes du site** (remplacer par votre domaine final) :
```bash
curl -sI https://babicho.vercel.app | grep -i -E "strict-transport|content-security|x-frame|x-content-type|referrer|permissions|cache-control"
curl -sI https://babicho.vercel.app/api/csrf-token | grep -i cache-control        # → private, no-store
```

**Les fonctions ne doivent plus répondre aux visiteurs** (avec votre URL Supabase et votre clé `anon`) :
```bash
curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/organizer_paid_sales" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"p_organizer_id":"00000000-0000-0000-0000-000000000000"}'
# attendu : erreur « permission denied for function » (et non un nombre)
```

**Dans Supabase → SQL Editor** : exécuter `supabase/security/audit_rls.sql` ; chaque requête doit renvoyer 0 ligne (sauf C : uniquement les fonctions listées ; J : 2 lignes), et la requête de la fin de `0061` doit renvoyer 0 ligne.

**Supabase → Authentication** (réglages à contrôler) :
- CAPTCHA activé (Turnstile) ; confirmation d'e-mail obligatoire ; inscriptions anonymes désactivées.
- Mot de passe : longueur minimale ≥ 10, protection contre les mots de passe compromis activée.
- Code à usage unique : expiration ≤ 10 min ; limites de débit e-mail/SMS conservées par défaut ou plus strictes.
- URL Configuration : **Site URL** = votre domaine final ; **Redirect URLs** = liste exacte (pas de `*` large, pas de `localhost` en production).
- Tous les comptes admin ont un facteur MFA vérifié (requête K de l'audit).

**Vercel** :
- Variables d'environnement sensibles uniquement sur l'environnement *Production* (pas Preview), marquées « Sensitive ».
- Deployment Protection activée sur les déploiements de prévisualisation.
- Activer le pare-feu Vercel (WAF) avec une règle de limitation de débit sur `/api/*` et sur `/auth`.
- Domaine personnalisé en HTTPS ; HSTS déjà envoyé par l'application (ne passer en « preload » qu'une fois sûr de ne jamais revenir en HTTP).

**Jèko** : l'URL de webhook doit être `https://<domaine>/api/payments/jeko/webhook`, avec le nouveau secret ; faire un paiement test de petit montant, puis vérifier qu'un appel avec une fausse signature renvoie 401 :
```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://<domaine>/api/payments/jeko/webhook \
  -H "jeko-signature: 00" -d '{}'          # attendu : 401
```

---

## 7. Plan de priorités

1. **Aujourd'hui** : C1 (rotation des clés), E1 (Turnstile).
2. **Avant le lancement** : migration 0061, déploiement du code, E4 (dépendances), M9 (cron), vérifications de la section 6.
3. **Première semaine** : M5/M6/M7 (e-mails de transfert, stockage, validation des organisateurs — surtout avant tout reversement d'argent).
4. **Ensuite** : M8 (CSP à nonces), tests d'intrusion externes sur la version finale, sauvegardes Supabase (PITR) et plan de réponse à incident.
