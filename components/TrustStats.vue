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
  <section class="mt-14 border-y border-tikeo-border bg-tikeo-surface py-14 md:mt-20 md:py-20">
    <div class="mx-auto max-w-tikeo-container px-4 md:px-6">
      <div class="mx-auto max-w-2xl text-center">
        <h2 class="sec-title">{{ t('trustStats.title') }}</h2>
        <p class="sec-sub mt-3">{{ t('trustStats.subtitle') }}</p>
      </div>

      <ul class="mt-9 grid gap-4 md:mt-12 md:grid-cols-3 md:gap-6">
        <li
          v-for="(badge, i) in badges"
          :key="badge.title"
          class="group relative flex gap-4 overflow-hidden rounded-2xl border border-tikeo-border bg-tikeo-surface-alt p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#FF7A00]/40 hover:bg-tikeo-surface hover:shadow-card-hover md:flex-col md:p-8"
        >
          <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tikeo-ink text-white md:h-14 md:w-14 dark:bg-[#FF7A00] dark:text-tikeo-ink">
            <svg class="h-6 w-6 md:h-7 md:w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" :d="badge.icon" />
            </svg>
          </span>
          <div>
            <h3 class="text-lg font-bold tracking-[-0.015em] text-tikeo-black md:text-xl">{{ badge.title }}</h3>
            <p class="tx-body mt-1.5 md:mt-2">{{ badge.text }}</p>
          </div>
          <span class="pointer-events-none absolute right-5 top-4 text-5xl font-bold leading-none tracking-tighter text-tikeo-ink/[0.05] dark:text-white/[0.06] max-md:hidden" aria-hidden="true">0{{ i + 1 }}</span>
        </li>
      </ul>

      <div class="mt-10 flex flex-col items-center gap-4 md:mt-14">
        <p class="text-sm font-semibold text-tikeo-gray-text">{{ t('trustStats.payWith') }}</p>
        <ul class="flex flex-wrap items-center justify-center gap-3">
          <li v-for="p in payments" :key="p.name">
            <img :src="p.src" :alt="p.name" :title="p.name" width="52" height="52" loading="lazy" class="h-12 w-12 rounded-xl border border-tikeo-border bg-white object-contain p-1.5 shadow-sm md:h-[3.25rem] md:w-[3.25rem]" />
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
