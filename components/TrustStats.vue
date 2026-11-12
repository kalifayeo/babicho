<script setup lang="ts">
// « Pourquoi Babicho » : 3 engagements + moyens de paiement acceptés.
// (Les chiffres clés sont dans la bannière d'accueil.)
const { t } = useI18n()

const badges = computed(() => [
  {
    title: t('trustStats.badgePaymentTitle'),
    text: t('trustStats.badgePaymentText'),
    icon: 'M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zM3 10h18M16 15h2',
  },
  {
    title: t('trustStats.badgeQrTitle'),
    text: t('trustStats.badgeQrText'),
    icon: 'M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 2h2v2h-2v-2zm4 0h2v2h-2v-2zm-4 4h2v2h-2v-2zm4 0h2v2h-2v-2zm0-8h2v2h-2v-2z',
  },
  {
    title: t('trustStats.badgeSupportTitle'),
    text: t('trustStats.badgeSupportText'),
    icon: 'M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  },
])

// Logos réellement utilisés au paiement (public/paiement/*).
const payments = [
  { name: 'Orange Money', src: '/paiement/orange-money.png' },
  { name: 'MTN MoMo', src: '/paiement/mtn.png' },
  { name: 'Moov Money', src: '/paiement/moov.png' },
  { name: 'Wave', src: '/paiement/wave.png' },
  { name: 'Djamo', src: '/paiement/djamo.png' },
  { name: 'Carte bancaire', src: '/paiement/carte.png' },
]
</script>

<template>
  <section class="mx-auto max-w-tikeo-content px-4 pt-16 md:px-6 md:pt-24" :aria-label="t('trustStats.title')">
    <div class="relative isolate overflow-hidden rounded-[2rem] border border-tikeo-border bg-tikeo-surface px-5 py-10 shadow-card md:px-12 md:py-14">
      <!-- Décor : deux halos très doux aux couleurs de la marque -->
      <div class="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div v-parallax="0.08" class="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-[#FF7A00]/[0.12] blur-3xl" />
        <div v-parallax="-0.08" class="absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-[#0057B8]/[0.10] blur-3xl" />
      </div>

      <div class="mx-auto max-w-xl text-center">
        <span v-reveal:pop class="mx-auto mb-4 flex w-fit items-center gap-1.5" aria-hidden="true">
          <span class="h-1.5 w-8 rounded-full bg-[#FF7A00]" /><span class="h-1.5 w-1.5 rounded-full bg-[#0057B8]" />
        </span>
        <h2 v-reveal:up class="sec-title">{{ t('trustStats.title') }}</h2>
        <p v-reveal:up="100" class="sec-sub mt-3">{{ t('trustStats.subtitle') }}</p>
      </div>

      <ul v-stagger:up="{ step: 110, delay: 120 }" class="mt-10 grid gap-8 md:mt-12 md:grid-cols-3 md:gap-0 md:divide-x md:divide-tikeo-border">
        <li v-for="badge in badges" :key="badge.title" class="trust-item group flex flex-col items-center text-center md:px-8">
          <span class="trust-ico relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FF7A00]/10 text-[rgb(var(--tikeo-orange-strong))] ring-1 ring-[#FF7A00]/20 transition-all duration-300 group-hover:-translate-y-1 group-hover:bg-[#FF7A00] group-hover:text-tikeo-ink group-hover:shadow-[0_14px_30px_-12px_rgba(255,122,0,0.8)]">
            <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" :d="badge.icon" />
            </svg>
          </span>
          <h3 class="mt-5 text-lg font-bold tracking-[-0.015em] text-tikeo-black md:text-xl">{{ badge.title }}</h3>
          <p class="tx-body mt-2 max-w-[17rem]">{{ badge.text }}</p>
        </li>
      </ul>

      <!-- Moyens de paiement : une pastille unique, logos en cascade -->
      <div v-reveal:up="200" class="mx-auto mt-10 flex w-fit max-w-full flex-col items-center gap-3 rounded-3xl border border-tikeo-border bg-tikeo-surface-alt px-5 py-4 sm:flex-row sm:gap-5 sm:rounded-full sm:py-3 sm:pl-6 sm:pr-4 md:mt-12">
        <p class="text-sm font-semibold text-tikeo-gray-text">{{ t('trustStats.payWith') }}</p>
        <ul v-stagger:pop="{ step: 70, delay: 300 }" class="flex flex-wrap items-center justify-center gap-2">
          <li v-for="p in payments" :key="p.name">
            <img :src="p.src" :alt="p.name" :title="p.name" width="44" height="44" loading="lazy" class="h-11 w-11 rounded-full border border-tikeo-border bg-white object-contain p-1.5 shadow-sm transition-transform duration-300 hover:-translate-y-0.5 hover:scale-105" />
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
