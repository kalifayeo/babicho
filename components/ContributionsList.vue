<script setup lang="ts">
/**
 * Liste publique des contributions d'une cause solidaire (collecte, cotisation).
 * Les noms arrivent DÉJÀ masqués du serveur (« K***** ») : voir
 * server/api/causes/[slug]/contributions.get.ts. Aucun numéro n'est exposé.
 */
interface Contribution {
  maskedName: string | null
  amount: number
  paidAt: string
  note: string | null
}
interface ContributionsResponse {
  count: number
  totalAmount: number
  hasMore: boolean
  items: Contribution[]
}

const props = defineProps<{ slug: string }>()
const { t, locale } = useI18n()

const PAGE_SIZE = 20
const limit = ref(PAGE_SIZE)
const data = ref<ContributionsResponse | null>(null)
const loading = ref(true)
const failed = ref(false)

async function load() {
  loading.value = true
  failed.value = false
  try {
    data.value = await $fetch<ContributionsResponse>(`/api/causes/${encodeURIComponent(props.slug)}/contributions`, {
      query: { limit: limit.value },
    })
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(limit, load)

function formatAmount(n: number) {
  return `${n.toLocaleString('fr-FR')} FCFA`
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(locale.value, { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Abidjan' })
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Abidjan' })
}
</script>

<template>
  <div>
    <p v-if="loading && !data" class="border border-dashed border-tikeo-border bg-tikeo-surface p-8 text-center text-sm text-tikeo-gray-text">
      {{ t('event.contributionsLoading') }}
    </p>
    <p v-else-if="failed && !data" class="border border-dashed border-tikeo-border bg-tikeo-surface p-8 text-center text-sm text-tikeo-gray-text">
      {{ t('event.contributionsError') }}
    </p>

    <template v-else-if="data">
      <div v-if="data.count" class="mb-4 flex flex-wrap items-baseline gap-x-6 gap-y-1 border border-tikeo-border bg-tikeo-surface p-5 shadow-card">
        <p>
          <span class="font-display text-2xl font-extrabold text-tikeo-black">{{ formatAmount(data.totalAmount) }}</span>
          <span class="ml-2 text-sm text-tikeo-gray-text">{{ t('event.contributionsRaised') }}</span>
        </p>
        <p class="text-sm text-tikeo-gray-text">{{ t('event.contributionsCount', { n: data.count }) }}</p>
      </div>

      <p v-if="!data.count" class="border border-dashed border-tikeo-border bg-tikeo-surface p-8 text-center text-sm text-tikeo-gray-text">
        {{ t('event.contributionsEmpty') }}
      </p>

      <ul v-else class="divide-y divide-tikeo-border border border-tikeo-border bg-tikeo-surface shadow-card">
        <li v-for="(c, i) in data.items" :key="`${c.paidAt}-${i}`" class="flex items-center justify-between gap-4 px-5 py-3.5">
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-tikeo-black">{{ c.maskedName ?? t('event.contributionsAnonymous') }}</p>
            <p class="mt-0.5 text-xs text-tikeo-gray-text">{{ formatDate(c.paidAt) }} · {{ formatTime(c.paidAt) }}</p>
            <p v-if="c.note" class="mt-1.5 break-words text-sm italic text-tikeo-gray-text">« {{ c.note }} »</p>
          </div>
          <p class="shrink-0 font-display text-base font-extrabold text-tikeo-black">{{ formatAmount(c.amount) }}</p>
        </li>
      </ul>

      <button v-if="data.hasMore" type="button" class="btn-ink mt-4" :disabled="loading" @click="limit += PAGE_SIZE">
        {{ loading ? t('event.contributionsLoading') : t('event.contributionsMore') }}
      </button>

      <p v-if="data.count" class="mt-3 text-xs text-tikeo-gray-text">{{ t('event.contributionsPrivacy') }}</p>
    </template>
  </div>
</template>
