<script setup lang="ts">
import type { PartnerCategory } from '~/types/database'
import { PARTNER_CATEGORIES, PARTNER_CATEGORY_ICONS, safeExternalUrl } from '~/composables/usePartners'

const { t } = useI18n()
const { partners, featured, loading, loaded } = usePartners()

useSeoMeta({
  title: () => `${t('partners.pageTitle')} | Babicho`,
  description: () => t('partners.pageIntro'),
  ogTitle: () => `${t('partners.pageTitle')} | Babicho`,
  ogDescription: () => t('partners.pageIntro'),
})

// Filtre par catégorie : seules les catégories réellement utilisées sont proposées.
const activeCategory = ref<PartnerCategory | 'all'>('all')
const categoriesInUse = computed(() => PARTNER_CATEGORIES.filter((c) => partners.value.some((p) => p.category === c)))
const visible = computed(() => (activeCategory.value === 'all' ? partners.value : partners.value.filter((p) => p.category === activeCategory.value)))
const visibleFeatured = computed(() => visible.value.filter((p) => p.is_featured))
const visibleRegular = computed(() => visible.value.filter((p) => !p.is_featured))
const showSkeleton = computed(() => loading.value || !loaded.value)

const benefits = computed(() => [
  { icon: 'users', title: t('partners.benefit1Title'), text: t('partners.benefit1Text') },
  { icon: 'megaphone', title: t('partners.benefit2Title'), text: t('partners.benefit2Text') },
  { icon: 'sparkles', title: t('partners.benefit3Title'), text: t('partners.benefit3Text') },
])
</script>

<template>
  <div>
    <PageHero :eyebrow="t('partners.eyebrow')" :title="t('partners.pageTitle')" :subtitle="t('partners.pageIntro')">
      <div class="flex flex-wrap items-center gap-3">
        <NuxtLink to="/contact?sujet=partenaire" class="btn-brand !h-12 !rounded-full !px-7"><AppIcon name="handshake" class="h-5 w-5" :stroke="2" />{{ t('partners.ctaButton') }}</NuxtLink>
        <a href="#partners-list" class="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/30 px-7 text-sm font-bold text-white transition-colors hover:border-white hover:bg-white hover:text-tikeo-ink">{{ t('partners.discover') }}</a>
        <p v-if="partners.length" class="ml-2 flex items-baseline gap-2.5">
          <span class="font-display text-4xl font-extrabold text-[#FF8A1A]">{{ partners.length }}</span>
          <span class="text-sm font-semibold text-white/70">{{ t('partners.countLabel', partners.length) }}</span>
        </p>
      </div>
    </PageHero>

    <section id="partners-list" class="mx-auto max-w-tikeo-content scroll-mt-24 px-4 py-12 md:px-6 md:py-16">
      <!-- Filtres par catégorie -->
      <div v-if="categoriesInUse.length > 1" class="no-scrollbar -mx-4 mb-8 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0" role="tablist" :aria-label="t('partners.filterLabel')">
        <button
          type="button"
          role="tab"
          :aria-selected="activeCategory === 'all'"
          class="flex h-11 shrink-0 items-center gap-2 rounded-full border px-5 text-sm font-bold transition-all active:scale-95"
          :class="activeCategory === 'all' ? 'border-tikeo-ink bg-tikeo-ink text-white dark:border-[#FF7A00] dark:bg-[#FF7A00] dark:text-tikeo-ink' : 'border-tikeo-border bg-tikeo-surface text-tikeo-black hover:border-tikeo-ink dark:hover:border-[#FF7A00]'"
          @click="activeCategory = 'all'"
        >
          {{ t('partners.all') }}
        </button>
        <button
          v-for="c in categoriesInUse"
          :key="c"
          type="button"
          role="tab"
          :aria-selected="activeCategory === c"
          class="flex h-11 shrink-0 items-center gap-2 rounded-full border px-5 text-sm font-bold transition-all active:scale-95"
          :class="activeCategory === c ? 'border-tikeo-ink bg-tikeo-ink text-white dark:border-[#FF7A00] dark:bg-[#FF7A00] dark:text-tikeo-ink' : 'border-tikeo-border bg-tikeo-surface text-tikeo-black hover:border-tikeo-ink dark:hover:border-[#FF7A00]'"
          @click="activeCategory = c"
        >
          <AppIcon :name="PARTNER_CATEGORY_ICONS[c]" class="h-4 w-4" />{{ t(`partners.categories.${c}`) }}
        </button>
      </div>

      <!-- Chargement -->
      <div v-if="showSkeleton" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="i in 3" :key="i" class="h-52 animate-pulse rounded-[1.75rem] bg-tikeo-border" />
      </div>

      <!-- Aucun partenaire -->
      <AdminEmpty v-else-if="!partners.length" icon="handshake" :text="t('partners.empty')" />

      <template v-else>
        <!-- Mis en avant -->
        <div v-if="visibleFeatured.length" class="mb-12">
          <h2 class="mb-5 flex items-center gap-3 font-display text-2xl font-extrabold tracking-[-0.03em] text-tikeo-black md:text-[1.9rem]">
            <span class="h-1.5 w-7 rounded-full bg-[#FF7A00]" aria-hidden="true" />{{ t('partners.featuredTitle') }}
          </h2>
          <ul v-stagger:up="{ step: 90 }" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <li v-for="p in visibleFeatured" :key="p.id" class="org-panel org-card-hover group relative flex flex-col !rounded-[1.75rem] p-6">
              <span class="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-[#FF7A00] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-tikeo-ink">
                <AppIcon name="star" class="h-3 w-3" :stroke="2.4" />{{ t('partners.featuredBadge') }}
              </span>
              <div class="flex items-center gap-4">
                <span class="block h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-tikeo-border"><PartnerLogo :partner="p" /></span>
                <div class="min-w-0">
                  <h3 class="font-display text-xl font-extrabold leading-tight text-tikeo-black">{{ p.name }}</h3>
                  <p class="mt-1 flex items-center gap-1.5 text-xs font-semibold text-tikeo-gray-text">
                    <AppIcon :name="PARTNER_CATEGORY_ICONS[p.category]" class="h-3.5 w-3.5 text-tikeo-orange" />{{ t(`partners.categories.${p.category}`) }}
                  </p>
                </div>
              </div>
              <p v-if="p.description" class="mt-4 text-sm leading-relaxed text-tikeo-gray-text">{{ p.description }}</p>
              <a
                v-if="safeExternalUrl(p.website_url)"
                :href="safeExternalUrl(p.website_url)"
                target="_blank"
                rel="noopener noreferrer nofollow"
                class="acc-link mt-auto inline-flex items-center gap-1.5 self-start pt-5"
              >
                {{ t('partners.visit') }}<AppIcon name="arrow-up-right" class="h-4 w-4" :stroke="2.2" />
              </a>
            </li>
          </ul>
        </div>

        <!-- Tous les autres -->
        <div v-if="visibleRegular.length">
          <h2 v-if="visibleFeatured.length" class="mb-5 flex items-center gap-3 font-display text-2xl font-extrabold tracking-[-0.03em] text-tikeo-black md:text-[1.9rem]">
            <span class="h-1.5 w-7 rounded-full bg-tikeo-blue" aria-hidden="true" />{{ t('partners.othersTitle') }}
          </h2>
          <ul v-stagger:up="{ step: 50 }" class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <li v-for="p in visibleRegular" :key="p.id">
              <component
                :is="safeExternalUrl(p.website_url) ? 'a' : 'div'"
                v-bind="safeExternalUrl(p.website_url) ? { href: safeExternalUrl(p.website_url), target: '_blank', rel: 'noopener noreferrer nofollow' } : {}"
                class="org-panel org-card-hover group flex h-full flex-col overflow-hidden !rounded-[1.5rem]"
              >
                <span class="block h-28 border-b border-tikeo-border"><PartnerLogo :partner="p" /></span>
                <span class="flex flex-1 flex-col p-3">
                  <span class="truncate text-sm font-bold text-tikeo-black">{{ p.name }}</span>
                  <span class="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-tikeo-gray-text">
                    <AppIcon :name="PARTNER_CATEGORY_ICONS[p.category]" class="h-3 w-3 text-tikeo-orange" />{{ t(`partners.categories.${p.category}`) }}
                  </span>
                  <span v-if="p.description" class="mt-2 line-clamp-2 text-xs leading-relaxed text-tikeo-gray-text">{{ p.description }}</span>
                </span>
              </component>
            </li>
          </ul>
        </div>
      </template>
    </section>

    <!-- Pourquoi devenir partenaire -->
    <section class="mx-auto max-w-tikeo-content px-4 pb-10 md:px-6 md:pb-14">
      <div class="rounded-[2rem] bg-tikeo-surface-alt px-5 py-10 md:rounded-[2.5rem] md:px-10 md:py-14">
        <SectionHeading :eyebrow="t('partners.whyEyebrow')" :title="t('partners.whyTitle')" :text="t('partners.whyText')" />
        <ul v-stagger:up="{ step: 100 }" class="mt-8 grid gap-5 md:grid-cols-3">
          <li v-for="b in benefits" :key="b.title" class="group flex gap-4 rounded-[1.75rem] border border-tikeo-border bg-tikeo-surface p-6 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:border-[#FF7A00]/50 md:flex-col md:gap-3">
            <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-tikeo-ink text-white transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 dark:bg-tikeo-orange dark:text-tikeo-ink"><AppIcon :name="b.icon" class="h-5 w-5" /></span>
            <div>
              <h3 class="font-display text-base font-bold text-tikeo-black">{{ b.title }}</h3>
              <p class="mt-1 text-sm leading-relaxed text-tikeo-gray-text">{{ b.text }}</p>
            </div>
          </li>
        </ul>
        <div class="mt-10">
          <NuxtLink to="/contact?sujet=partenaire" class="btn-ink !h-12 !rounded-full !px-7">{{ t('partners.ctaButton') }}<AppIcon name="arrow-right" class="h-4 w-4" :stroke="2.2" /></NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>
