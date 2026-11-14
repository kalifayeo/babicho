<script setup lang="ts">
import type { PressKind } from '~/types/database'
import { PRESS_KINDS, PRESS_KIND_ICONS, PRESS_RESOURCE_ICONS, formatPressDate } from '~/composables/usePress'
import { safeExternalUrl } from '~/composables/usePartners'

const { t, locale } = useI18n()
const { items, resources, loading, loaded } = usePress()
const { stats, fetchStats } = useHomeStats()
onMounted(fetchStats)

useSeoMeta({
  title: () => `${t('press.pageTitle')} | Babicho`,
  description: () => t('press.pageIntro'),
  ogTitle: () => `${t('press.pageTitle')} | Babicho`,
  ogDescription: () => t('press.pageIntro'),
})

const kind = ref<PressKind | 'all'>('all')
const kindsInUse = computed(() => PRESS_KINDS.filter((k) => items.value.some((i) => i.kind === k)))
const filtered = computed(() => (kind.value === 'all' ? items.value : items.value.filter((i) => i.kind === kind.value)))
const featured = computed(() => (kind.value === 'all' ? items.value.find((i) => i.is_featured) ?? null : null))
const list = computed(() => filtered.value.filter((i) => i.id !== featured.value?.id))
const showSkeleton = computed(() => loading.value || !loaded.value)

const facts = computed(() => [
  { icon: 'calendar', value: stats.value.events, label: t('aboutPage.statsEventsLabel') },
  { icon: 'briefcase', value: stats.value.organizers, label: t('aboutPage.statsOrganizersLabel') },
  { icon: 'pin', value: stats.value.cities, label: t('aboutPage.statsCitiesLabel') },
].filter((f) => stats.value.loaded && f.value > 0))

const actionLabel = (k: PressKind) => t(`press.action_${k}`)
</script>

<template>
  <div>
    <PageHero :eyebrow="t('press.eyebrow')" :title="t('press.pageTitle')" :subtitle="t('press.pageIntro')">
      <div class="flex flex-wrap gap-3">
        <NuxtLink to="/contact?sujet=presse" class="btn-brand !h-12 !rounded-full !px-7"><AppIcon name="mail" class="h-5 w-5" :stroke="2" />{{ t('press.contactCta') }}</NuxtLink>
        <a href="#press-kit" class="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/30 px-7 text-sm font-bold text-white transition-colors hover:border-white hover:bg-white hover:text-tikeo-ink"><AppIcon name="download" class="h-5 w-5" />{{ t('press.kitCta') }}</a>
      </div>
    </PageHero>

    <!-- Babicho en bref -->
    <section class="mx-auto max-w-tikeo-content px-4 pt-10 md:px-6 md:pt-12">
      <div v-reveal:up class="grid gap-6 rounded-[1.75rem] border border-tikeo-border bg-tikeo-surface p-6 shadow-card md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] md:gap-10 md:p-9">
        <div>
          <h2 class="font-display text-2xl font-extrabold tracking-[-0.03em] text-tikeo-black md:text-[1.9rem]">{{ t('press.aboutTitle') }}</h2>
          <p class="mt-2 text-sm leading-relaxed text-tikeo-gray-text">{{ t('press.aboutText') }}</p>
        </div>
        <ul v-if="facts.length" class="grid grid-cols-3 gap-3 self-center">
          <li v-for="f in facts" :key="f.label" class="rounded-2xl bg-tikeo-surface-alt px-3 py-3 text-center">
            <span class="block font-display text-2xl font-extrabold leading-none text-[#E05F00]">{{ f.value }}+</span>
            <span class="mt-1 block text-[11px] font-semibold leading-tight text-tikeo-gray-text">{{ f.label }}</span>
          </li>
        </ul>
      </div>
    </section>

    <!-- Ils parlent de nous -->
    <section class="mx-auto max-w-tikeo-content px-4 pt-10 md:px-6 md:pt-12">
      <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="font-display text-2xl font-extrabold tracking-[-0.03em] text-tikeo-black md:text-[1.9rem]">{{ t('press.coverageTitle') }}</h2>
          <p class="mt-1 text-sm text-tikeo-gray-text">{{ t('press.coverageSubtitle') }}</p>
        </div>
        <div v-if="kindsInUse.length > 1" class="no-scrollbar flex gap-2 overflow-x-auto" role="tablist" :aria-label="t('press.filterLabel')">
          <button type="button" role="tab" :aria-selected="kind === 'all'" class="flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-[13px] font-bold transition-all active:scale-95" :class="kind === 'all' ? 'border-tikeo-ink bg-tikeo-ink text-white dark:border-[#FF7A00] dark:bg-[#FF7A00] dark:text-tikeo-ink' : 'border-tikeo-border bg-tikeo-surface text-tikeo-black hover:border-tikeo-ink dark:hover:border-[#FF7A00]'" @click="kind = 'all'">{{ t('press.all') }}</button>
          <button v-for="k in kindsInUse" :key="k" type="button" role="tab" :aria-selected="kind === k" class="flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-[13px] font-bold transition-all active:scale-95" :class="kind === k ? 'border-tikeo-ink bg-tikeo-ink text-white dark:border-[#FF7A00] dark:bg-[#FF7A00] dark:text-tikeo-ink' : 'border-tikeo-border bg-tikeo-surface text-tikeo-black hover:border-tikeo-ink dark:hover:border-[#FF7A00]'" @click="kind = k">
            <AppIcon :name="PRESS_KIND_ICONS[k]" class="h-4 w-4" />{{ t(`press.kinds.${k}`) }}
          </button>
        </div>
      </div>

      <div v-if="showSkeleton" class="grid gap-4 md:grid-cols-2"><div v-for="i in 2" :key="i" class="h-36 animate-pulse rounded-[1.75rem] bg-tikeo-border" /></div>
      <AdminEmpty v-else-if="!items.length" icon="newspaper" :text="t('press.empty')" />

      <template v-else>
        <!-- À la une -->
        <component :is="safeExternalUrl(featured.url) ? 'a' : 'div'" v-if="featured" v-bind="safeExternalUrl(featured.url) ? { href: safeExternalUrl(featured.url), target: '_blank', rel: 'noopener noreferrer nofollow' } : {}" class="group relative isolate mb-5 flex flex-col gap-5 overflow-hidden rounded-[1.75rem] bg-tikeo-ink p-6 text-white transition-transform duration-300 hover:-translate-y-1 sm:flex-row sm:items-center md:p-8">
          <div class="pointer-events-none absolute -right-12 -top-14 -z-10 h-48 w-48 rounded-full bg-[#FF7A00]/30 blur-3xl" aria-hidden="true" />
          <span class="block h-20 w-32 shrink-0 overflow-hidden rounded-2xl bg-white md:h-24 md:w-40"><PartnerLogo :partner="{ name: featured.media_name, logo_url: featured.logo_url }" /></span>
          <span class="min-w-0 flex-1">
            <span class="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#FF9A3D]"><AppIcon :name="PRESS_KIND_ICONS[featured.kind]" class="h-3.5 w-3.5" :stroke="2.2" />{{ featured.media_name }} · {{ formatPressDate(featured.published_on, locale) }}</span>
            <span class="mt-1.5 block font-display text-xl font-extrabold leading-tight md:text-2xl">{{ featured.title }}</span>
            <span v-if="featured.excerpt" class="mt-1.5 block line-clamp-3 text-sm leading-relaxed text-white/75">{{ featured.excerpt }}</span>
            <span v-if="safeExternalUrl(featured.url)" class="mt-4 inline-flex h-10 items-center gap-1.5 rounded-full bg-[#FF7A00] px-5 text-sm font-bold text-tikeo-ink">{{ actionLabel(featured.kind) }}<AppIcon name="arrow-up-right" class="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" :stroke="2.2" /></span>
          </span>
        </component>

        <ul v-if="list.length" v-stagger:up="{ step: 70 }" class="grid gap-4 md:grid-cols-2">
          <li v-for="it in list" :key="it.id">
            <component :is="safeExternalUrl(it.url) ? 'a' : 'div'" v-bind="safeExternalUrl(it.url) ? { href: safeExternalUrl(it.url), target: '_blank', rel: 'noopener noreferrer nofollow' } : {}" class="org-panel org-card-hover group flex h-full gap-4 !rounded-[1.5rem] p-4">
              <span class="block h-16 w-20 shrink-0 overflow-hidden rounded-2xl border border-tikeo-border"><PartnerLogo :partner="{ name: it.media_name, logo_url: it.logo_url }" /></span>
              <span class="flex min-w-0 flex-1 flex-col">
                <span class="flex flex-wrap items-center gap-x-2 text-[11px] font-bold text-tikeo-gray-text">
                  <span class="flex items-center gap-1 uppercase tracking-wide text-tikeo-orange"><AppIcon :name="PRESS_KIND_ICONS[it.kind]" class="h-3 w-3" :stroke="2.2" />{{ t(`press.kinds.${it.kind}`) }}</span>
                  <span>{{ it.media_name }}</span><span>· {{ formatPressDate(it.published_on, locale) }}</span>
                </span>
                <span class="mt-1 line-clamp-2 text-[15px] font-bold leading-snug text-tikeo-black group-hover:text-tikeo-orange">{{ it.title }}</span>
                <span v-if="it.excerpt" class="mt-1 line-clamp-2 text-xs leading-relaxed text-tikeo-gray-text">{{ it.excerpt }}</span>
                <span v-if="safeExternalUrl(it.url)" class="mt-auto inline-flex items-center gap-1 pt-2 text-[13px] font-bold text-tikeo-black">{{ actionLabel(it.kind) }}<AppIcon name="arrow-up-right" class="h-3.5 w-3.5 text-tikeo-orange" :stroke="2.2" /></span>
              </span>
            </component>
          </li>
        </ul>
      </template>
    </section>

    <!-- Kit média -->
    <section v-if="resources.length" id="press-kit" class="mx-auto max-w-tikeo-content scroll-mt-24 px-4 pt-10 md:px-6 md:pt-12">
      <h2 class="font-display text-2xl font-extrabold tracking-[-0.03em] text-tikeo-black md:text-[1.9rem]">{{ t('press.kitTitle') }}</h2>
      <p class="mt-1 text-sm text-tikeo-gray-text">{{ t('press.kitSubtitle') }}</p>
      <ul v-stagger:up="{ step: 70 }" class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="r in resources" :key="r.id">
          <a :href="safeExternalUrl(r.file_url)" target="_blank" rel="noopener noreferrer" class="org-panel org-card-hover group flex h-full items-start gap-4 !rounded-[1.5rem] p-5">
            <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-tikeo-ink text-white transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 dark:bg-[#FF7A00] dark:text-tikeo-ink"><AppIcon :name="PRESS_RESOURCE_ICONS[r.kind]" class="h-5 w-5" /></span>
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-bold text-tikeo-black group-hover:text-tikeo-orange">{{ r.title }}</span>
              <span v-if="r.description" class="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-tikeo-gray-text">{{ r.description }}</span>
              <span class="mt-2 inline-flex items-center gap-1.5 text-[12px] font-bold text-tikeo-black"><AppIcon name="download" class="h-3.5 w-3.5 text-tikeo-orange" :stroke="2.2" />{{ t('press.download') }}</span>
            </span>
          </a>
        </li>
      </ul>
    </section>

    <!-- Contact presse -->
    <section class="mx-auto max-w-tikeo-content px-4 py-10 md:px-6 md:py-12">
      <div v-reveal:up class="relative isolate flex flex-col items-start justify-between gap-5 overflow-hidden rounded-[2rem] bg-tikeo-ink p-7 text-white sm:flex-row sm:items-center md:p-10">
        <div class="pointer-events-none absolute -right-12 -top-14 -z-10 h-56 w-56 rounded-full bg-[#FF7A00]/30 blur-3xl" aria-hidden="true" />
        <div class="flex items-center gap-3">
          <span class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#FF7A00] text-tikeo-ink"><AppIcon name="headset" class="h-6 w-6" :stroke="2" /></span>
          <div>
            <p class="font-display text-lg font-extrabold">{{ t('press.contactTitle') }}</p>
            <p class="text-sm text-white/70">{{ t('press.contactText') }}</p>
          </div>
        </div>
        <NuxtLink to="/contact?sujet=presse" class="btn-brand shrink-0 !h-12 !rounded-full !px-7">{{ t('press.contactCta') }}</NuxtLink>
      </div>
    </section>
  </div>
</template>
