<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const { events, loading } = useEventsList()
const { filters, matchesDateRange, resetFilters, activeFilterCount, setCategory } = useHomeFilters()

// Arrivée depuis un lien "Voir tout" d'une catégorie sur l'accueil
// (?category=Nom) : on applique le filtre correspondant à l'ouverture.
onMounted(() => {
  const category = route.query.category
  if (typeof category === 'string' && category) setCategory(category)
})

const filteredEvents = computed(() => {
  return events.value.filter((event) => {
    if (filters.value.category && event.category !== filters.value.category) return false
    if (filters.value.city && event.city !== filters.value.city) return false
    if (!matchesDateRange(event.startDate, filters.value.date)) return false
    if (event.priceFrom > filters.value.priceMax) return false
    return true
  })
})

const pageTitle = computed(() => filters.value.category || t('home.eventsSection'))
const hasResults = computed(() => filteredEvents.value.length > 0)

useSeoMeta({
  title: () => `${pageTitle.value} — Babicho`,
  description: "Tous les événements publiés sur Babicho, filtrables par catégorie, ville, date et prix.",
  ogTitle: () => `${pageTitle.value} — Babicho`,
  ogDescription: "Tous les événements publiés sur Babicho, filtrables par catégorie, ville, date et prix.",
})
</script>

<template>
  <div>
    <CategoriesRow class="mt-3 md:mt-5" />

    <section class="mx-auto max-w-tikeo-container gap-6 px-4 pt-3 md:grid md:grid-cols-[1fr_300px] md:px-6 md:pt-6">
      <div>
        <div class="mb-5 flex items-end justify-between gap-3">
          <div class="min-w-0">
            <h1 class="truncate font-display text-2xl font-extrabold capitalize leading-tight tracking-tight text-tikeo-black md:text-[1.75rem]">{{ pageTitle }}</h1>
            <p v-if="!loading" class="mt-1 text-sm font-medium text-tikeo-gray-text">{{ t('home.eventsCount', filteredEvents.length) }}</p>
          </div>
          <MobileFiltersDrawer class="md:hidden" />
        </div>

        <div v-if="loading" class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-1 md:gap-5 lg:grid-cols-2 xl:grid-cols-3">
          <div v-for="i in 6" :key="i" class="h-[26rem] animate-pulse rounded-2xl bg-tikeo-surface-alt" />
        </div>
        <div v-else-if="!hasResults" class="rounded-2xl border border-dashed border-tikeo-border bg-tikeo-surface p-10 text-center">
          <p class="text-sm text-tikeo-gray-text">
            Aucun événement ne correspond à ces filtres{{ activeFilterCount ? ` (${activeFilterCount} actif${activeFilterCount > 1 ? 's' : ''})` : '' }}.
          </p>
          <button type="button" class="mt-4 inline-flex h-11 items-center rounded-full bg-[#FF7A00] px-6 text-sm font-extrabold text-tikeo-ink transition-colors hover:bg-[#F06F00]" @click="resetFilters">
            Réinitialiser les filtres
          </button>
        </div>
        <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-1 md:gap-5 lg:grid-cols-2 xl:grid-cols-3">
          <EventCard v-for="event in filteredEvents" :key="event.id" :event="event" variant="grid" />
        </div>
      </div>

      <SidebarFilters class="hidden md:block" />
    </section>
  </div>
</template>
