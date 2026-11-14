<script setup lang="ts">
const { t } = useI18n()
const { stats } = useHomeStats()

// Visuel de la 1re section (photo de public en salle). Pour le changer :
// remplacer cette valeur ou le fichier public/sample-event.jpg.
const heroImage = '/sample-event.jpg'

useSeoMeta({
  title: () => `${t('aboutPage.eyebrow')} | Babicho`,
  description: () => t('aboutPage.intro'),
})

const statItems = computed(() => [
  { value: `${stats.value.events}+`, label: t('aboutPage.statsEventsLabel') },
  { value: `${stats.value.organizers}+`, label: t('aboutPage.statsOrganizersLabel') },
  { value: `${stats.value.cities}+`, label: t('aboutPage.statsCitiesLabel') },
])

const values = computed(() => [
  { title: t('aboutPage.value1Title'), text: t('aboutPage.value1Text'), icon: 'shield' },
  { title: t('aboutPage.value2Title'), text: t('aboutPage.value2Text'), icon: 'bolt' },
  { title: t('aboutPage.value3Title'), text: t('aboutPage.value3Text'), icon: 'pin' },
])

const icons: Record<string, string> = {
  shield: 'M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z',
  bolt: 'M13 2L4 14h6l-1 8 9-12h-6l1-8z',
  pin: 'M12 21s7-6.5 7-11a7 7 0 10-14 0c0 4.5 7 11 7 11zM12 13a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
}

const audiences = computed(() => [
  {
    icon: 'ticket',
    title: t('aboutPage.forBuyersTitle'),
    points: [t('aboutPage.forBuyers1'), t('aboutPage.forBuyers2'), t('aboutPage.forBuyers3')],
    to: '/',
    cta: t('aboutPage.discoverButton'),
    dark: false,
  },
  {
    icon: 'calendar-plus',
    title: t('aboutPage.forOrganizersTitle'),
    points: [t('aboutPage.forOrganizers1'), t('aboutPage.forOrganizers2'), t('aboutPage.forOrganizers3')],
    to: '/organisateur/tarifs',
    cta: t('organizerPricingPage.eyebrow'),
    dark: true,
  },
])

const payments = ['Orange Money', 'MTN MoMo', 'Moov Money', 'Wave', 'Visa', 'Mastercard']
</script>

<template>
  <div>
    <!-- 1re section : carte arrondie avec la photo, texte superposé -->
    <div class="mx-auto max-w-tikeo-content px-4 pt-2 md:px-6 md:pt-4">
      <section class="relative isolate overflow-hidden rounded-[1.75rem] bg-tikeo-ink text-white md:rounded-[2.5rem]">
        <img :src="heroImage" alt="" class="absolute inset-0 -z-20 h-full w-full object-cover" fetchpriority="high" decoding="async" />
        <div class="absolute inset-0 -z-10 bg-gradient-to-r from-tikeo-ink via-tikeo-ink/85 to-tikeo-ink/25" aria-hidden="true" />
        <div class="absolute inset-0 -z-10 bg-gradient-to-t from-tikeo-ink/80 via-transparent to-transparent" aria-hidden="true" />
        <div class="pointer-events-none absolute -bottom-24 -left-24 -z-10 h-72 w-72 rounded-full bg-[#FF7A00]/30 blur-3xl" aria-hidden="true" />

        <div class="flex min-h-[26rem] flex-col justify-end px-5 pb-20 pt-14 sm:px-8 md:min-h-[32rem] md:px-12 md:pb-24 md:pt-20">
          <p v-reveal:up class="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#FFB066]">
            <span class="h-1.5 w-6 rounded-full bg-[#FF7A00]" aria-hidden="true" />
            {{ t('aboutPage.eyebrow') }}
          </p>
          <h1 v-reveal:up="80" class="mt-3 max-w-3xl font-display text-[2.2rem] font-extrabold leading-[1.04] tracking-[-0.035em] sm:text-5xl md:text-[3.6rem]" style="text-wrap: balance">
            {{ t('aboutPage.title') }}
          </h1>
          <p v-reveal:up="140" class="mt-5 max-w-xl text-base leading-relaxed text-white/80 md:text-lg">{{ t('aboutPage.intro') }}</p>
          <div v-reveal:up="200" class="mt-7 flex flex-wrap gap-3">
            <NuxtLink to="/" class="btn-brand !h-12 !rounded-full !px-7">{{ t('aboutPage.discoverButton') }}</NuxtLink>
            <NuxtLink to="/contact" class="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/40 px-7 text-sm font-bold text-white transition-colors hover:border-white hover:bg-white hover:text-tikeo-ink">
              {{ t('aboutPage.contactButton') }}
            </NuxtLink>
          </div>
        </div>
      </section>
    </div>

    <!-- Chiffres : carte qui chevauche le bas du hero -->
    <section class="relative z-10 mx-auto -mt-12 max-w-tikeo-content px-4 md:-mt-16 md:px-6">
      <dl v-reveal:up class="mx-auto grid max-w-4xl grid-cols-3 divide-x divide-tikeo-border rounded-[1.75rem] border border-tikeo-border bg-tikeo-surface shadow-[0_30px_60px_-28px_rgba(14,34,64,0.45)]">
        <div v-for="s in statItems" :key="s.label" class="px-2 py-5 text-center md:py-8">
          <dt class="sr-only">{{ s.label }}</dt>
          <dd class="font-display text-3xl font-extrabold leading-none tracking-[-0.03em] md:text-5xl"><span class="text-[#FF7A00]">{{ s.value }}</span></dd>
          <p class="mt-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-tikeo-gray-text md:text-xs">{{ s.label }}</p>
        </div>
      </dl>
    </section>

    <!-- Mission + billet des moyens de paiement -->
    <section class="mx-auto max-w-tikeo-content px-4 py-12 md:px-6 md:py-20">
      <div class="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div>
          <SectionHeading :eyebrow="t('aboutPage.eyebrow')" :title="t('aboutPage.missionTitle')" />
          <p class="mt-5 max-w-xl text-base leading-relaxed text-tikeo-gray-text md:text-lg">{{ t('aboutPage.missionText') }}</p>
        </div>

        <!-- Faux billet : encoches + perforation -->
        <div v-tilt class="relative mx-auto w-full max-w-md overflow-hidden rounded-[1.75rem] bg-tikeo-ink text-white shadow-[0_40px_70px_-30px_rgba(14,34,64,0.7)]">
          <div class="absolute inset-x-0 top-0 h-1.5 bg-tikeo-brand" aria-hidden="true" />
          <div class="flex items-center justify-between gap-4 p-6 pt-7">
            <div>
              <p class="font-display text-2xl font-extrabold tracking-tight">Babicho</p>
              <p class="mt-1 text-[11px] font-bold uppercase tracking-wider text-white/60">{{ t('aboutPage.paymentsTitle') }}</p>
            </div>
            <span class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-tikeo-ink">
              <AppIcon name="qr" class="h-9 w-9" :stroke="1.6" />
            </span>
          </div>
          <div class="relative">
            <div class="border-t-2 border-dashed border-white/25" />
            <span class="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-tikeo-surface-alt" aria-hidden="true" />
            <span class="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-tikeo-surface-alt" aria-hidden="true" />
          </div>
          <div class="p-6">
            <p class="text-sm text-white/75">{{ t('aboutPage.paymentsText') }}</p>
            <ul class="mt-4 flex flex-wrap gap-2">
              <li v-for="p in payments" :key="p" class="rounded-full border border-white/25 px-3.5 py-1.5 text-xs font-bold">{{ p }}</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- Valeurs -->
    <section class="mx-auto max-w-tikeo-content px-4 md:px-6">
      <div class="rounded-[2rem] bg-tikeo-surface-alt px-5 py-12 md:rounded-[2.5rem] md:px-10 md:py-16">
        <SectionHeading :title="t('aboutPage.valuesTitle')" center />
        <div v-stagger:up="{ step: 110 }" class="mt-10 grid gap-5 md:grid-cols-3">
          <article
            v-for="(v, i) in values"
            :key="v.title"
            class="group relative overflow-hidden rounded-[1.75rem] border border-tikeo-border bg-tikeo-surface p-6 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:border-[#FF7A00]/50 md:p-8"
          >
            <span class="absolute right-5 top-4 font-display text-6xl font-extrabold leading-none text-tikeo-surface-alt" aria-hidden="true">0{{ i + 1 }}</span>
            <span class="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-tikeo-ink text-white transition-all duration-300 group-hover:-rotate-6 group-hover:scale-110 group-hover:bg-[#FF7A00] group-hover:text-tikeo-ink dark:bg-[#FF7A00] dark:text-tikeo-ink">
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" :d="icons[v.icon]" />
              </svg>
            </span>
            <h3 class="relative mt-5 font-display text-xl font-extrabold text-tikeo-black">{{ v.title }}</h3>
            <p class="relative mt-2 text-sm leading-relaxed text-tikeo-gray-text md:text-[15px]">{{ v.text }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- Pour qui ? -->
    <section class="mx-auto max-w-tikeo-content px-4 py-12 md:px-6 md:py-20">
      <div v-stagger:up="{ step: 120 }" class="grid gap-5 md:grid-cols-2">
        <article
          v-for="a in audiences"
          :key="a.title"
          class="flex flex-col rounded-[1.75rem] border p-6 shadow-card md:p-9"
          :class="a.dark ? 'border-tikeo-ink bg-tikeo-ink text-white' : 'border-tikeo-border bg-tikeo-surface text-tikeo-black'"
        >
          <span class="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF7A00] text-tikeo-ink">
            <AppIcon :name="a.icon" class="h-6 w-6" :stroke="2" />
          </span>
          <h3 class="mt-5 font-display text-2xl font-extrabold">{{ a.title }}</h3>
          <ul class="mt-5 flex-1 space-y-3">
            <li v-for="p in a.points" :key="p" class="flex items-start gap-3 text-sm md:text-[15px]">
              <AppIcon name="check" class="mt-0.5 h-5 w-5 shrink-0 text-[#FF7A00]" :stroke="2.6" />
              <span :class="a.dark ? 'text-white/85' : 'text-tikeo-gray-text'">{{ p }}</span>
            </li>
          </ul>
          <NuxtLink
            :to="a.to"
            class="mt-7 inline-flex h-12 w-fit items-center gap-2 rounded-full px-6 text-sm font-bold transition-colors"
            :class="a.dark ? 'bg-white text-tikeo-ink hover:bg-[#FF7A00]' : 'bg-tikeo-ink text-white hover:bg-[#FF7A00] hover:text-tikeo-ink dark:bg-[#FF7A00] dark:text-tikeo-ink'"
          >
            {{ a.cta }}
            <AppIcon name="arrow-right" class="h-4 w-4" :stroke="2.4" />
          </NuxtLink>
        </article>
      </div>
    </section>

    <OrganizerCtaBanner />
  </div>
</template>
