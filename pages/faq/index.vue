<script setup lang="ts">
const { t } = useI18n()

useSeoMeta({
  title: () => `${t('faqPage.title')} | Babicho`,
  description: () => t('faqPage.intro'),
})

type CatKey = 'buyers' | 'payment' | 'organizers' | 'account'

const cats = computed<Array<{ key: CatKey; label: string; icon: string }>>(() => [
  { key: 'buyers', label: t('faqPage.catBuyers'), icon: 'ticket' },
  { key: 'payment', label: t('faqPage.catPayment'), icon: 'card' },
  { key: 'organizers', label: t('faqPage.catOrganizers'), icon: 'calendar-plus' },
  { key: 'account', label: t('faqPage.catAccount'), icon: 'user' },
])

const items = computed<Array<{ id: string; cat: CatKey; q: string; a: string }>>(() => [
  { id: 'q1', cat: 'buyers', q: t('faqPage.q1'), a: t('faqPage.a1') },
  { id: 'q2', cat: 'buyers', q: t('faqPage.q2'), a: t('faqPage.a2') },
  { id: 'q3', cat: 'buyers', q: t('faqPage.q3'), a: t('faqPage.a3') },
  { id: 'q9', cat: 'buyers', q: t('faqPage.q9'), a: t('faqPage.a9') },
  { id: 'q10', cat: 'buyers', q: t('faqPage.q10'), a: t('faqPage.a10') },
  { id: 'q11', cat: 'buyers', q: t('faqPage.q11'), a: t('faqPage.a11') },
  { id: 'q5', cat: 'payment', q: t('faqPage.q5'), a: t('faqPage.a5') },
  { id: 'q4', cat: 'organizers', q: t('faqPage.q4'), a: t('faqPage.a4') },
  { id: 'q6', cat: 'organizers', q: t('faqPage.q6'), a: t('faqPage.a6') },
  { id: 'q8', cat: 'organizers', q: t('faqPage.q8'), a: t('faqPage.a8') },
  { id: 'q12', cat: 'organizers', q: t('faqPage.q12'), a: t('faqPage.a12') },
  { id: 'q7', cat: 'account', q: t('faqPage.q7'), a: t('faqPage.a7') },
])

const search = ref('')
const active = ref<'all' | CatKey>('all')
const openId = ref<string | null>('q1')

function toggle(id: string) {
  openId.value = openId.value === id ? null : id
}

// Recherche insensible à la casse et aux accents.
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const filtered = computed(() => {
  const q = norm(search.value.trim())
  return items.value.filter(
    (i) => (active.value === 'all' || i.cat === active.value) && (!q || norm(`${i.q} ${i.a}`).includes(q)),
  )
})

const groups = computed(() =>
  cats.value
    .map((c) => ({ ...c, items: filtered.value.filter((i) => i.cat === c.key) }))
    .filter((g) => g.items.length > 0),
)

const countByCat = computed(() => {
  const q = norm(search.value.trim())
  const match = (i: { q: string; a: string }) => !q || norm(`${i.q} ${i.a}`).includes(q)
  const map: Record<string, number> = { all: 0 }
  for (const c of cats.value) map[c.key] = 0
  for (const i of items.value) {
    if (!match(i)) continue
    map[i.cat]++
    map.all++
  }
  return map
})

function resetSearch() {
  search.value = ''
  active.value = 'all'
}
</script>

<template>
  <div>
    <PageHero :eyebrow="t('faqPage.eyebrow')" :title="t('faqPage.title')" :subtitle="t('faqPage.intro')">
      <div class="relative max-w-xl">
        <AppIcon name="search" class="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#E05F00]" />
        <input
          v-model="search"
          type="search"
          :placeholder="t('faqPage.searchPlaceholder')"
          :aria-label="t('faqPage.searchPlaceholder')"
          class="h-14 w-full rounded-full border border-transparent bg-white pl-12 pr-4 text-[15px] shadow-[0_18px_40px_-18px_rgba(0,0,0,0.6)] text-tikeo-ink placeholder:text-gray-500 focus:border-[#FF7A00] focus:outline-none focus:ring-4 focus:ring-[#FF7A00]/25"
        />
      </div>
    </PageHero>

    <div class="mx-auto max-w-tikeo-content px-4 py-8 md:px-6 md:py-12 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start lg:gap-10">
      <!-- Catégories : pastilles défilantes sur mobile, colonne collante sur desktop -->
      <nav
        :aria-label="t('faqPage.categoriesTitle')"
        class="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 lg:sticky lg:top-28 lg:mx-0 lg:mb-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:rounded-[1.75rem] lg:border lg:border-tikeo-border lg:bg-tikeo-surface lg:p-3 lg:shadow-card"
      >
        <button
          v-for="c in [{ key: 'all', label: t('faqPage.all'), icon: 'help' }, ...cats]"
          :key="c.key"
          type="button"
          class="flex h-11 shrink-0 items-center gap-2.5 rounded-full border px-5 text-sm font-semibold transition-all duration-200 active:scale-95 lg:h-12 lg:w-full lg:rounded-2xl lg:border-transparent lg:px-4"
          :class="
            active === c.key
              ? 'border-tikeo-ink bg-tikeo-ink text-white dark:border-[#FF7A00] dark:bg-[#FF7A00] dark:text-tikeo-ink'
              : 'border-tikeo-border bg-tikeo-surface text-tikeo-black hover:border-tikeo-ink dark:hover:border-[#FF7A00] lg:hover:bg-tikeo-surface-alt'
          "
          @click="active = c.key as any"
        >
          <AppIcon :name="c.icon" class="hidden h-5 w-5 shrink-0 lg:block" />
          <span class="whitespace-nowrap">{{ c.label }}</span>
          <span class="text-[11px] font-bold opacity-60 lg:ml-auto">{{ countByCat[c.key] }}</span>
        </button>
      </nav>

      <div class="min-w-0 space-y-10">
        <section v-for="g in groups" :key="g.key" v-reveal:up :aria-label="g.label">
          <div class="mb-4 flex items-center gap-3">
            <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-tikeo-ink text-white dark:bg-[#FF7A00] dark:text-tikeo-ink">
              <AppIcon :name="g.icon" class="h-5 w-5" />
            </span>
            <h2 class="font-display text-xl font-extrabold tracking-tight text-tikeo-black md:text-2xl">{{ g.label }}</h2>
            <span class="h-px flex-1 bg-tikeo-border" aria-hidden="true" />
          </div>
          <div class="divide-y divide-tikeo-border overflow-hidden rounded-[1.75rem] border border-tikeo-border bg-tikeo-surface shadow-card">
            <FaqItem
              v-for="item in g.items"
              :key="item.id"
              :question="item.q"
              :answer="item.a"
              :open="openId === item.id"
              @toggle="toggle(item.id)"
            />
          </div>
        </section>

        <div v-if="!groups.length" class="acc-empty">
          <span class="flex h-14 w-14 items-center justify-center rounded-2xl bg-tikeo-surface-alt text-tikeo-gray-text">
            <AppIcon name="search" class="h-6 w-6" />
          </span>
          <p class="font-display text-lg font-bold text-tikeo-black">{{ t('faqPage.noResults') }}</p>
          <p class="max-w-sm text-sm text-tikeo-gray-text">{{ t('faqPage.noResultsHint') }}</p>
          <button type="button" class="acc-btn-ghost" @click="resetSearch">{{ t('faqPage.resetSearch') }}</button>
        </div>

        <!-- Besoin d'aide ? -->
        <div v-reveal:up class="relative isolate overflow-hidden rounded-[2rem] bg-tikeo-ink p-7 text-white md:p-10">
          <div class="pointer-events-none absolute -right-16 -top-16 -z-10 h-64 w-64 rounded-full bg-[#FF7A00]/30 blur-3xl" aria-hidden="true" />
          <div class="pointer-events-none absolute -bottom-24 left-1/3 -z-10 h-56 w-56 rounded-full bg-[#0057B8]/35 blur-3xl" aria-hidden="true" />
          <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div class="flex items-start gap-4">
              <span class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#FF7A00] text-tikeo-ink">
                <AppIcon name="headset" class="h-6 w-6" :stroke="2" />
              </span>
              <div>
                <h2 class="font-display text-xl font-extrabold md:text-2xl">{{ t('faqPage.stillTitle') }}</h2>
                <p class="mt-1 max-w-md text-sm text-white/75">{{ t('faqPage.stillQuestion') }}</p>
              </div>
            </div>
            <NuxtLink to="/contact" class="btn-brand shrink-0 self-start !h-12 !rounded-full !px-7 md:self-auto">
              {{ t('faqPage.contactButton') }}
              <AppIcon name="arrow-right" class="h-4 w-4" :stroke="2.4" />
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
