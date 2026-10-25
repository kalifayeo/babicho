<script setup lang="ts">
import type { EventCardData } from '~/types/database'
import { HOME_FILTERS_PRICE_MAX } from '~/composables/useHomeFilters'

const { t } = useI18n()
const { events, loading } = useEventsList()
const { filters, matchesDateRange, resetFilters, activeFilterCount, setCategory } = useHomeFilters()
const { categories: categoryList } = useCategoriesList()
const dateOptions = useHomeDateRangeOptions()
const sortOptions = dateOptions

const homeTitle = 'Babicho - La billetterie simple et intelligente pour vos événements'
const homeDescription =
  "Découvrez, achetez et gérez vos billets d'événements en Côte d'Ivoire : concerts, festivals, conférences et bien plus."
useSeoMeta({
  title: homeTitle,
  description: homeDescription,
  ogTitle: homeTitle,
  ogDescription: homeDescription,
})

// Filtrage 100% client (le volume d'événements reste modeste, cf useEventsList
// qui charge déjà jusqu'à 40 événements publiés) : catégorie, ville, période
// et prix maximum se combinent, tous branchés sur le même état partagé
// (useHomeFilters) utilisé par la barre de catégories, la recherche rapide,
// les filtres latéraux et le tiroir mobile.
const filteredEvents = computed(() => {
  return events.value.filter((event) => {
    if (filters.value.category && event.category !== filters.value.category) return false
    if (filters.value.city && event.city !== filters.value.city) return false
    if (!matchesDateRange(event.startDate, filters.value.date)) return false
    if (event.priceFrom > filters.value.priceMax) return false
    return true
  })
})

const hasAnyEvents = computed(() => events.value.length > 0)
const hasResults = computed(() => filteredEvents.value.length > 0)

// --- Structure de l'accueil ---------------------------------------------
// Sans filtre : 1) « Prochainement » (les événements les plus proches, avec
// une grande affiche), puis 2) une section par catégorie.
// Dès qu'un filtre est posé : une grille de résultats unique.
interface CategoryGroup {
  key: string
  name: string
  events: EventCardData[]
}
const groupedByCategory = computed<CategoryGroup[]>(() => {
  const groups = new Map<string, CategoryGroup>()
  for (const event of events.value) {
    const name = event.category || t('home.otherCategory')
    const key = name.toLowerCase()
    if (!groups.has(key)) groups.set(key, { key, name, events: [] })
    groups.get(key)!.events.push(event)
  }

  // Ordre = celui configuré par l'admin (/admin/categories, colonne
  // "position"). Les événements sans catégorie sont toujours en dernier.
  const orderIndex = new Map(categoryList.value.map((c, i) => [c.name.toLowerCase(), i]))
  const otherKey = t('home.otherCategory').toLowerCase()

  return Array.from(groups.values()).sort((a, b) => {
    if (a.key === otherKey) return 1
    if (b.key === otherKey) return -1
    const ia = orderIndex.has(a.key) ? orderIndex.get(a.key)! : Number.MAX_SAFE_INTEGER
    const ib = orderIndex.has(b.key) ? orderIndex.get(b.key)! : Number.MAX_SAFE_INTEGER
    return ia - ib
  })
})
const showCategorySections = computed(() => activeFilterCount.value === 0)

// Lignes de l'accueil : « Prochainement » (les 8 événements les plus proches),
// puis une ligne par catégorie. En dessous de 3 événements, « Prochainement »
// n'a pas de sens : on laisse les catégories parler.
interface HomeRow {
  key: string
  name: string
  sub: string
  events: EventCardData[]
  category: string | null
}
const rows = computed<HomeRow[]>(() => {
  const list: HomeRow[] = []
  if (events.value.length >= 3) {
    const next = [...events.value]
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 8)
    list.push({ key: '__upcoming', name: t('home.upcoming'), sub: t('home.upcomingSub'), events: next, category: null })
  }
  for (const g of groupedByCategory.value) {
    list.push({ key: g.key, name: g.name, sub: t('home.eventsCount', g.events.length), events: g.events, category: g.name })
  }
  return list
})

// Pastilles des filtres actifs (cliquer = retirer ce filtre).
const activeChips = computed(() => {
  const chips: { key: string; label: string; remove: () => void }[] = []
  if (filters.value.category) chips.push({ key: 'category', label: filters.value.category, remove: () => setCategory(null) })
  if (filters.value.city) chips.push({ key: 'city', label: filters.value.city, remove: () => (filters.value = { ...filters.value, city: null }) })
  if (filters.value.date !== 'all') {
    const label = dateOptions.value.find((o) => o.value === filters.value.date)?.label ?? ''
    chips.push({ key: 'date', label, remove: () => (filters.value = { ...filters.value, date: 'all' }) })
  }
  if (filters.value.priceMax < HOME_FILTERS_PRICE_MAX) {
    chips.push({
      key: 'price',
      label: `≤ ${filters.value.priceMax.toLocaleString('fr-FR')} FCFA`,
      remove: () => (filters.value = { ...filters.value, priceMax: HOME_FILTERS_PRICE_MAX }),
    })
  }
  return chips
})

const rowRefs = ref<Record<string, HTMLElement | null>>({})
function setRowRef(key: string, el: unknown) {
  rowRefs.value[key] = (el as HTMLElement) ?? null
}
function scrollRow(key: string, dir: 1 | -1) {
  rowRefs.value[key]?.scrollBy({ left: dir * 360, behavior: 'smooth' })
}

function seeAll(category: string | null) {
  if (category) setCategory(category)
}
</script>

<template>
  <div class="type-scope bg-tikeo-surface-alt">
    <HeroSection />

    <CategoriesRow />

    <!-- ======================= SANS FILTRE ======================= -->
    <template v-if="showCategorySections">
      <!-- Chargement -->
      <section v-if="loading" class="mx-auto max-w-tikeo-container px-4 pt-6 md:px-6">
        <div class="mb-5 h-8 w-56 animate-pulse rounded-lg bg-tikeo-border" />
        <div class="no-scrollbar flex gap-4 overflow-x-auto md:gap-5">
          <div v-for="i in 4" :key="i" class="h-[26rem] w-[78vw] max-w-[300px] shrink-0 animate-pulse rounded-2xl bg-tikeo-border md:w-[17.5rem]" />
        </div>
      </section>

      <!-- Aucun événement -->
      <section v-else-if="!hasAnyEvents" data-events-anchor class="mx-auto max-w-tikeo-container px-4 py-12 md:px-6">
        <p class="rounded-2xl border border-dashed border-tikeo-border bg-tikeo-surface p-10 text-center text-sm text-tikeo-gray-text">
          {{ t('home.noEventsYet') }}
        </p>
      </section>

      <!-- Une ligne par rubrique -->
      <template v-else>
        <section
          v-for="(row, idx) in rows"
          :key="row.key"
          :data-events-anchor="idx === 0 ? '' : undefined"
          class="mx-auto max-w-tikeo-container px-4 pt-10 md:px-6 md:pt-16"
        >
          <div class="mb-4 flex items-end justify-between gap-4 md:mb-5">
            <div class="min-w-0">
              <span class="mb-2.5 block h-1 w-10 rounded-full bg-tikeo-brand" aria-hidden="true" />
              <h2 class="sec-title">{{ row.name }}</h2>
              <p class="sec-sub mt-1.5">{{ row.sub }}</p>
            </div>

            <div class="flex shrink-0 items-center gap-2">
              <template v-if="row.events.length > 4">
                <button
                  type="button"
                  :aria-label="t('home.scrollPrev')"
                  class="hidden h-10 w-10 items-center justify-center rounded-full border border-tikeo-border bg-tikeo-surface text-tikeo-black shadow-sm transition-colors hover:bg-tikeo-ink hover:text-white md:flex"
                  @click="scrollRow(row.key, -1)"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.4"><path stroke-linecap="round" stroke-linejoin="round" d="M15 5l-7 7 7 7" /></svg>
                </button>
                <button
                  type="button"
                  :aria-label="t('home.scrollNext')"
                  class="hidden h-10 w-10 items-center justify-center rounded-full border border-tikeo-border bg-tikeo-surface text-tikeo-black shadow-sm transition-colors hover:bg-tikeo-ink hover:text-white md:flex"
                  @click="scrollRow(row.key, 1)"
                >
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.4"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
                </button>
              </template>
              <NuxtLink
                to="/evenements"
                class="flex h-10 items-center gap-1.5 rounded-full border border-tikeo-border bg-tikeo-surface px-4 text-sm font-semibold text-tikeo-black transition-colors hover:border-tikeo-ink dark:hover:border-[#FF7A00]"
                @click="seeAll(row.category)"
              >
                {{ t('home.seeAll') }}
                <AppIcon name="arrow-right" class="h-4 w-4" :stroke="2.4" />
              </NuxtLink>
            </div>
          </div>

          <div :ref="(el) => setRowRef(row.key, el)" class="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:gap-5 md:px-0">
            <EventCard v-for="event in row.events" :key="event.id" :event="event" variant="full" class="snap-start md:!w-[17.5rem]" />
          </div>
        </section>
      </template>
    </template>

    <!-- ======================= AVEC FILTRE ======================= -->
    <template v-else>
      <!-- Mobile -->
      <section class="mx-auto max-w-tikeo-container px-4 pt-6 md:hidden">
        <div data-events-anchor class="mb-3 flex items-center justify-between gap-2">
          <MobileFiltersDrawer />
          <p class="shrink-0 text-sm font-semibold text-tikeo-black">{{ t('home.eventsCount', filteredEvents.length) }}</p>
        </div>

        <div v-if="activeChips.length" class="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
          <button v-for="chip in activeChips" :key="chip.key" type="button" class="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-tikeo-ink pl-3.5 pr-2.5 text-[13px] font-semibold text-white dark:bg-tikeo-orange dark:text-tikeo-ink" @click="chip.remove">
            {{ chip.label }}
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.6"><path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div v-if="!hasResults" class="rounded-2xl border border-dashed border-tikeo-border bg-tikeo-surface p-6 text-center text-sm text-tikeo-gray-text">
          {{ t('home.noResultsFilters') }}
          <button type="button" class="mt-2 block w-full font-bold text-[rgb(var(--tikeo-orange-strong))]" @click="resetFilters">{{ t('home.resetFilters') }}</button>
        </div>
        <div v-else class="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
          <EventCard v-for="event in filteredEvents" :key="event.id" :event="event" variant="grid" />
        </div>
      </section>

      <!-- Desktop : grille + filtres latéraux -->
      <section data-events-anchor class="mx-auto hidden max-w-tikeo-container gap-8 px-6 pt-8 md:grid md:grid-cols-[1fr_300px]">
        <div>
          <div class="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 class="sec-title">{{ t('home.discover') }}</h2>
              <p class="mt-1 text-sm text-tikeo-gray-text">{{ t('home.eventsCount', filteredEvents.length) }}</p>
            </div>
            <select v-model="filters.date" class="input-field w-auto rounded-xl text-sm" :aria-label="t('filters.date')">
              <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>

          <div v-if="activeChips.length" class="mb-6 flex flex-wrap gap-2">
            <button v-for="chip in activeChips" :key="chip.key" type="button" class="flex h-9 items-center gap-1.5 rounded-full bg-tikeo-ink pl-3.5 pr-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-85 dark:bg-tikeo-orange dark:text-tikeo-ink" @click="chip.remove">
              {{ chip.label }}
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.6"><path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>

          <div v-if="!hasResults" class="rounded-2xl border border-dashed border-tikeo-border bg-tikeo-surface p-10 text-center text-sm text-tikeo-gray-text">
            {{ t('home.noResultsFiltersCount', activeFilterCount) }}
            <button type="button" class="mt-2 block w-full font-bold text-[rgb(var(--tikeo-orange-strong))]" @click="resetFilters">{{ t('home.resetFilters') }}</button>
          </div>
          <div v-else class="grid grid-cols-2 gap-5 lg:grid-cols-3 2xl:grid-cols-4">
            <EventCard v-for="event in filteredEvents" :key="event.id" :event="event" variant="grid" />
          </div>
        </div>

        <SidebarFilters />
      </section>
    </template>

    <!-- Pourquoi Babicho + moyens de paiement -->
    <TrustStats />

    <!-- Appel aux organisateurs -->
    <OrganizerCtaBanner />

    <!-- Application mobile (section remise sur l'accueil) -->
    <AppDownloadSection />
  </div>
</template>
