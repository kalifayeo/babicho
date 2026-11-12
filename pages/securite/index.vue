<script setup lang="ts">
const { t } = useI18n()

useSeoMeta({
  title: () => `${t('securityPage.title')} | Babicho`,
  description: () => t('securityPage.intro'),
})

const items = computed(() => [
  { icon: 'card', title: t('securityPage.c1Title'), text: t('securityPage.c1Text') },
  { icon: 'qr', title: t('securityPage.c2Title'), text: t('securityPage.c2Text') },
  { icon: 'lock', title: t('securityPage.c3Title'), text: t('securityPage.c3Text') },
  { icon: 'database', title: t('securityPage.c4Title'), text: t('securityPage.c4Text') },
  { icon: 'key', title: t('securityPage.c5Title'), text: t('securityPage.c5Text') },
  { icon: 'headset', title: t('securityPage.c6Title'), text: t('securityPage.c6Text') },
])

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
  <div>
    <PageHero :eyebrow="t('securityPage.eyebrow')" :title="t('securityPage.title')" :subtitle="t('securityPage.intro')" />

    <div class="mx-auto max-w-tikeo-container px-4 py-10 md:px-6 md:py-16">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
        <article v-for="it in items" :key="it.title" class="group border border-tikeo-border bg-tikeo-surface p-6 shadow-card md:p-7">
          <span class="flex h-12 w-12 items-center justify-center bg-tikeo-ink text-white transition-colors duration-200 group-hover:bg-[#FF7A00] group-hover:text-tikeo-ink dark:bg-[#FF7A00] dark:text-tikeo-ink">
            <AppIcon :name="it.icon" class="h-6 w-6" />
          </span>
          <h2 class="mt-5 font-display text-xl font-extrabold leading-tight text-tikeo-black">{{ it.title }}</h2>
          <p class="mt-2 text-sm leading-relaxed text-tikeo-gray-text">{{ it.text }}</p>
        </article>
      </div>

      <!-- Moyens de paiement -->
      <section class="mt-6 flex flex-col gap-5 border border-tikeo-border bg-tikeo-surface p-6 shadow-card md:flex-row md:items-center md:justify-between md:p-8">
        <div class="max-w-md">
          <h2 class="font-display text-xl font-extrabold text-tikeo-black md:text-2xl">{{ t('securityPage.payTitle') }}</h2>
          <p class="mt-1.5 text-sm text-tikeo-gray-text">{{ t('securityPage.payText') }}</p>
        </div>
        <ul class="flex flex-wrap gap-2">
          <li v-for="p in payments" :key="p.name">
            <img :src="p.src" :alt="p.name" :title="p.name" width="52" height="52" loading="lazy" class="h-12 w-12 border border-tikeo-border bg-white object-contain p-1.5 md:h-14 md:w-14" />
          </li>
        </ul>
      </section>

      <!-- Signalement -->
      <section class="relative isolate mt-6 overflow-hidden bg-tikeo-ink p-6 text-white md:p-10">
        <div class="absolute inset-x-0 top-0 h-1 bg-tikeo-brand" aria-hidden="true" />
        <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div class="max-w-xl">
            <h2 class="font-display text-2xl font-extrabold md:text-3xl">{{ t('securityPage.reportTitle') }}</h2>
            <p class="mt-2 text-white/75">{{ t('securityPage.reportText') }}</p>
          </div>
          <div class="flex flex-wrap gap-3">
            <NuxtLink to="/contact" class="btn-brand">{{ t('legalPage.contactButton') }}</NuxtLink>
            <NuxtLink to="/confidentialite" class="inline-flex h-12 items-center border border-white/35 px-6 text-sm font-bold text-white transition-colors hover:border-white hover:bg-white hover:text-tikeo-ink">{{ t('privacyPage.title') }}</NuxtLink>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
