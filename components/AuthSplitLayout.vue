<script setup lang="ts">
/**
 * Gabarit des pages connexion / inscription / mot de passe oublié.
 *
 * Une carte centrée sur un fond clair : bandeau marine (photo de concert en filigrane,
 * logo, titre et sous-titre centrés) puis le formulaire. `wide` élargit la carte pour
 * disposer les champs sur deux colonnes (inscription, connexion) et garder la page courte.
 */
defineProps<{ title: string; subtitle?: string; wide?: boolean }>()
const { t } = useI18n()
const year = new Date().getFullYear()
</script>

<template>
  <div class="relative isolate flex min-h-[calc(100vh-64px)] flex-col items-center justify-center overflow-hidden bg-tikeo-gray-light px-4 py-8 sm:py-10">
    <!-- Halos de marque très légers -->
    <div
      class="pointer-events-none absolute inset-0 -z-10"
      style="background: radial-gradient(46rem 22rem at 12% -6%, rgb(255 122 0 / 0.14), transparent 62%), radial-gradient(46rem 24rem at 100% 105%, rgb(0 87 184 / 0.14), transparent 62%)"
      aria-hidden="true"
    />

    <main class="w-full" :class="wide ? 'max-w-[40rem]' : 'max-w-[28rem]'">
      <div class="overflow-hidden bg-tikeo-surface shadow-[0_24px_60px_-24px_rgba(10,26,52,0.45)] ring-1 ring-black/5">
        <!-- Bandeau -->
        <header class="relative isolate overflow-hidden bg-tikeo-ink px-6 pb-6 pt-7 text-center text-white sm:px-10">
          <img src="/images/auth-concert.jpg" alt="" aria-hidden="true" class="absolute inset-0 -z-20 h-full w-full object-cover object-center opacity-20 blur-[2px]" decoding="async" />
          <div class="absolute inset-0 -z-10 bg-gradient-to-b from-tikeo-ink/70 via-tikeo-ink/80 to-tikeo-ink" aria-hidden="true" />
          <div class="absolute inset-x-0 top-0 h-1 bg-tikeo-brand" aria-hidden="true" />

          <NuxtLink to="/" aria-label="Babicho" class="inline-flex"><img src="/logo-babicho.png" alt="Babicho" class="h-12 w-auto drop-shadow-lg" /></NuxtLink>
          <h1 class="mt-3 font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-[1.7rem]">{{ title }}</h1>
          <p v-if="subtitle" class="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-white/75">{{ subtitle }}</p>
        </header>

        <!-- Formulaire -->
        <div class="px-6 pb-7 pt-6 sm:px-10">
          <slot />
        </div>
      </div>

      <p class="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-tikeo-gray-text">
        <AppIcon name="lock" class="h-3 w-3" :stroke="2.4" />
        {{ t('authLayout.secure') }} · © {{ year }} Babicho
      </p>
    </main>
  </div>
</template>
