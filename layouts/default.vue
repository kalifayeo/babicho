<script setup lang="ts">
const route = useRoute()
const isHome = computed(() => route.path.startsWith('/e/'))
</script>

<template>
  <div class="flex min-h-screen flex-col bg-tikeo-gray-light">
    <CountryModal />
    <!-- En-tête flottant (capsule) : voir components/AppHeader.vue. Il est posé par-dessus la page ;
         hors accueil (bannière plein écran), on réserve sa place en haut du contenu. -->
    <AppHeader />
    <main class="flex-1" :class="isHome ? '' : 'pt-[4.75rem] lg:pt-[5.5rem]'">
      <slot />
    </main>
    <!-- Pied de page visible partout. Sur mobile il réserve lui-même la place
         de la barre de navigation fixe du bas (voir AppFooter.vue). -->
    <AppFooter />
    <MobileBottomNav class="md:hidden" />
    <!-- Introduction, visite guidée et pop-up : voir components/EngagementHost.vue -->
    <EngagementHost />
    <!-- Invitation à installer l'app (PWA) : voir components/InstallAppPrompt.vue -->
    <InstallAppPrompt />
    <!-- Vidéo de présentation (fenêtre) et bouton WhatsApp flottant vers la communauté -->
    <PresentationVideoModal />
    <WhatsAppFloat />
  </div>
</template>
