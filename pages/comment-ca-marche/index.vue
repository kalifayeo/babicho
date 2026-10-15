<script setup lang="ts">
const { t } = useI18n()

useSeoMeta({
  title: () => `${t('howPage.title')} | Babicho`,
  description: () => t('howPage.intro'),
})

const buyers = computed(() => [1, 2, 3, 4].map((n) => ({ title: t(`howPage.b${n}Title`), text: t(`howPage.b${n}Text`) })))
const organizers = computed(() => [1, 2, 3, 4].map((n) => ({ title: t(`howPage.o${n}Title`), text: t(`howPage.o${n}Text`) })))
</script>

<template>
  <div>
    <PageHero :eyebrow="t('howPage.eyebrow')" :title="t('howPage.title')" :subtitle="t('howPage.intro')" />

    <div class="mx-auto max-w-tikeo-container px-4 py-10 md:px-6 md:py-16">
      <div class="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <!-- Participants -->
        <section class="border border-tikeo-border bg-tikeo-surface p-6 shadow-card md:p-10">
          <span class="flex h-12 w-12 items-center justify-center bg-tikeo-ink text-white dark:bg-[#FF7A00] dark:text-tikeo-ink"><AppIcon name="ticket" class="h-6 w-6" /></span>
          <h2 class="mt-4 font-display text-2xl font-extrabold tracking-tight text-tikeo-black md:text-3xl">{{ t('howPage.buyersTitle') }}</h2>
          <p class="mt-1.5 text-sm text-tikeo-gray-text">{{ t('howPage.buyersSub') }}</p>
          <ol class="relative mt-8 space-y-7">
            <span class="absolute bottom-3 left-[17px] top-3 w-px bg-tikeo-border" aria-hidden="true" />
            <li v-for="(s, i) in buyers" :key="s.title" class="relative flex gap-5">
              <span class="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center bg-tikeo-ink font-display text-base font-extrabold text-white dark:bg-[#FF7A00] dark:text-tikeo-ink">{{ i + 1 }}</span>
              <div class="pt-0.5">
                <h3 class="font-display text-lg font-bold text-tikeo-black">{{ s.title }}</h3>
                <p class="mt-1 text-sm leading-relaxed text-tikeo-gray-text">{{ s.text }}</p>
              </div>
            </li>
          </ol>
          <NuxtLink to="/evenements" class="btn-ink mt-9">{{ t('howPage.buyersCta') }}<AppIcon name="arrow-right" class="h-4 w-4" :stroke="2.4" /></NuxtLink>
        </section>

        <!-- Organisateurs -->
        <section class="relative isolate overflow-hidden bg-tikeo-ink p-6 text-white md:p-10">
          <div class="absolute inset-x-0 top-0 h-1 bg-tikeo-brand" aria-hidden="true" />
          <span class="flex h-12 w-12 items-center justify-center bg-[#FF7A00] text-tikeo-ink"><AppIcon name="calendar-plus" class="h-6 w-6" /></span>
          <h2 class="mt-4 font-display text-2xl font-extrabold tracking-tight md:text-3xl">{{ t('howPage.orgTitle') }}</h2>
          <p class="mt-1.5 text-sm text-white/70">{{ t('howPage.orgSub') }}</p>
          <ol class="relative mt-8 space-y-7">
            <span class="absolute bottom-3 left-[17px] top-3 w-px bg-white/20" aria-hidden="true" />
            <li v-for="(s, i) in organizers" :key="s.title" class="relative flex gap-5">
              <span class="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center bg-[#FF7A00] font-display text-base font-extrabold text-tikeo-ink">{{ i + 1 }}</span>
              <div class="pt-0.5">
                <h3 class="font-display text-lg font-bold">{{ s.title }}</h3>
                <p class="mt-1 text-sm leading-relaxed text-white/70">{{ s.text }}</p>
              </div>
            </li>
          </ol>
          <div class="mt-9 flex flex-wrap gap-3">
            <NuxtLink to="/organisateur" class="btn-brand !h-11">{{ t('howPage.orgCta') }}</NuxtLink>
            <NuxtLink to="/organisateur/tarifs" class="inline-flex h-11 items-center border border-white/35 px-5 text-sm font-bold text-white transition-colors hover:border-white hover:bg-white hover:text-tikeo-ink">{{ t('header.pricing') }}</NuxtLink>
          </div>
        </section>
      </div>

      <!-- Pour aller plus loin -->
      <div class="mt-6 grid gap-4 md:grid-cols-3">
        <NuxtLink v-for="l in [
          { to: '/faq', icon: 'help', label: t('header.faq'), text: t('howPage.moreFaq') },
          { to: '/securite', icon: 'shield-check', label: t('securityPage.title'), text: t('howPage.moreSecurity') },
          { to: '/application', icon: 'phone', label: t('appPage.title'), text: t('howPage.moreApp') },
        ]" :key="l.to" :to="l.to" class="group flex items-start gap-4 border border-tikeo-border bg-tikeo-surface p-5 shadow-card transition-colors hover:border-tikeo-ink dark:hover:border-[#FF7A00]">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center bg-tikeo-surface-alt text-tikeo-black"><AppIcon :name="l.icon" class="h-6 w-6" /></span>
          <span>
            <span class="block font-display text-lg font-extrabold text-tikeo-black">{{ l.label }}</span>
            <span class="mt-0.5 block text-sm text-tikeo-gray-text">{{ l.text }}</span>
          </span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
