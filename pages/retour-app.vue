<script setup lang="ts">
/**
 * Page publique de retour de paiement pour l'application mobile Babicho.
 *
 * Après le paiement chez l'opérateur (Wave, Orange Money, Djamo…), le navigateur du téléphone arrive ici ;
 * la page rouvre l'application via son lien `babicho:///checkout/<commande>/result`. Aucune donnée n'est
 * lue ni affichée : le navigateur n'est pas connecté, et c'est l'application (connectée) qui relit la
 * commande auprès du serveur. Le paiement n'est jamais validé par cette page.
 */
useHead({ title: 'Retour à l’application Babicho', meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const route = useRoute()
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const rawOrder = String(route.query.order ?? '')
const orderId = UUID_RE.test(rawOrder) ? rawOrder : ''
const failed = route.query.status === 'error'

const ANDROID_PACKAGE = 'com.example.babicho_mobile'
const path = orderId ? `checkout/${orderId}/result${failed ? '?error=1' : ''}` : 'home'

function appUrl() {
  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)
  // Android : lien « intent » (Chrome ouvre l'application installée) ; iPhone : lien direct.
  return isAndroid ? `intent:///${path}#Intent;scheme=babicho;package=${ANDROID_PACKAGE};end` : `babicho:///${path}`
}

function openApp() {
  window.location.href = appUrl()
}

onMounted(() => {
  // Tentative automatique ; le bouton ci-dessous prend le relais si le navigateur la bloque.
  setTimeout(openApp, 400)
})
</script>

<template>
  <div class="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 py-16 text-center">
    <span class="flex h-16 w-16 items-center justify-center" :class="failed ? 'bg-tikeo-error text-white' : 'bg-tikeo-success text-white'">
      <AppIcon :name="failed ? 'info' : 'check'" class="h-8 w-8" :stroke="2.4" />
    </span>
    <h1 class="mt-6 font-display text-2xl font-extrabold tracking-tight text-tikeo-black">
      {{ failed ? 'Le paiement n’a pas abouti' : 'Retour à l’application' }}
    </h1>
    <p class="mt-3 text-[15px] leading-relaxed text-tikeo-gray-text">
      {{ failed ? 'Retournez dans l’application Babicho pour réessayer.' : 'Nous vous ramenons dans l’application Babicho pour confirmer votre paiement et afficher vos billets.' }}
    </p>
    <button type="button" class="btn-primary mt-8" @click="openApp">Ouvrir l’application Babicho</button>
    <p class="mt-4 text-xs text-tikeo-gray-text">Si rien ne se passe, ouvrez simplement l’application Babicho : votre commande s’y met à jour toute seule.</p>
  </div>
</template>
