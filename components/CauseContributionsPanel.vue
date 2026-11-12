<script setup lang="ts">
/**
 * Détail des contributions d'une cause — pour l'ORGANISATEUR et l'ADMIN
 * (pages statistiques de l'événement). Ne s'affiche que pour une cause.
 * Données : GET /api/events/:id/cause-details (accès vérifié côté serveur).
 */
interface Item { name: string | null; orderNumber: string; amount: number; paidAt: string; note: string | null }
interface Details {
  isCause: boolean
  goalAmount?: number | null
  showGoalPublic?: boolean
  showContributionsPublic?: boolean
  totalAmount?: number
  count?: number
  averageAmount?: number
  remaining?: number | null
  percent?: number | null
  hasMore?: boolean
  items?: Item[]
}

const props = defineProps<{ eventId: string }>()
const { t, locale } = useI18n()

const PAGE = 50
const limit = ref(PAGE)
const data = ref<Details | null>(null)
const loading = ref(true)
const failed = ref(false)

async function load() {
  loading.value = true
  failed.value = false
  try {
    const { data: { session } } = await useSupabase().auth.getSession()
    data.value = await $fetch<Details>(`/api/events/${encodeURIComponent(props.eventId)}/cause-details`, {
      query: { limit: limit.value },
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    })
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(limit, load)

const fmt = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`
const dateFmt = (iso: string) => new Date(iso).toLocaleDateString(locale.value, { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Abidjan' })
const timeFmt = (iso: string) => new Date(iso).toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Abidjan' })
</script>

<template>
  <section v-if="data?.isCause" class="mb-8 space-y-4">
    <h2 class="font-display text-lg font-extrabold text-tikeo-black">{{ t('causeAdmin.title') }}</h2>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div class="border border-tikeo-border bg-tikeo-surface p-4">
        <p class="text-xs font-semibold text-tikeo-gray-text">{{ t('causeAdmin.collected') }}</p>
        <p class="mt-1 font-display text-xl font-extrabold text-tikeo-black">{{ fmt(data.totalAmount ?? 0) }}</p>
      </div>
      <div class="border border-tikeo-border bg-tikeo-surface p-4">
        <p class="text-xs font-semibold text-tikeo-gray-text">{{ t('causeAdmin.goal') }}</p>
        <p class="mt-1 font-display text-xl font-extrabold text-tikeo-black">{{ data.goalAmount ? fmt(data.goalAmount) : t('causeAdmin.noGoal') }}</p>
      </div>
      <div class="border border-tikeo-border bg-tikeo-surface p-4">
        <p class="text-xs font-semibold text-tikeo-gray-text">{{ t('causeAdmin.remaining') }}</p>
        <p class="mt-1 font-display text-xl font-extrabold text-tikeo-black">{{ data.remaining != null ? fmt(data.remaining) : '—' }}</p>
      </div>
      <div class="border border-tikeo-border bg-tikeo-surface p-4">
        <p class="text-xs font-semibold text-tikeo-gray-text">{{ t('causeAdmin.contributions') }}</p>
        <p class="mt-1 font-display text-xl font-extrabold text-tikeo-black">{{ data.count ?? 0 }}</p>
        <p class="text-xs text-tikeo-gray-text">{{ t('causeAdmin.average', { amount: fmt(data.averageAmount ?? 0) }) }}</p>
      </div>
    </div>

    <div v-if="data.percent != null" class="border border-tikeo-border bg-tikeo-surface p-4">
      <div class="mb-2 flex items-center justify-between text-xs font-semibold text-tikeo-gray-text">
        <span>{{ t('causeAdmin.progress') }}</span><span class="text-tikeo-black">{{ data.percent }}%</span>
      </div>
      <div class="h-2.5 w-full overflow-hidden bg-tikeo-border"><div class="h-full bg-[#FF7A00]" :style="{ width: `${data.percent}%` }" /></div>
    </div>

    <p class="text-xs text-tikeo-gray-text">
      {{ data.showGoalPublic && data.goalAmount ? t('causeAdmin.goalPublicOn') : t('causeAdmin.goalPublicOff') }} ·
      {{ data.showContributionsPublic ? t('causeAdmin.listPublicOn') : t('causeAdmin.listPublicOff') }}
    </p>

    <p v-if="!data.items?.length" class="border border-dashed border-tikeo-border bg-tikeo-surface p-6 text-center text-sm text-tikeo-gray-text">{{ t('causeAdmin.empty') }}</p>
    <div v-else class="overflow-x-auto border border-tikeo-border bg-tikeo-surface">
      <table class="w-full min-w-[560px] text-left text-sm">
        <thead class="border-b border-tikeo-border bg-tikeo-surface-alt text-xs text-tikeo-gray-text">
          <tr>
            <th class="px-4 py-2.5 font-semibold">{{ t('causeAdmin.colContributor') }}</th>
            <th class="px-4 py-2.5 font-semibold">{{ t('causeAdmin.colDate') }}</th>
            <th class="px-4 py-2.5 text-right font-semibold">{{ t('causeAdmin.colAmount') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-tikeo-border">
          <tr v-for="it in data.items" :key="it.orderNumber">
            <td class="px-4 py-3 align-top">
              <p class="font-semibold text-tikeo-black">{{ it.name ?? t('event.contributionsAnonymous') }}</p>
              <p class="text-xs text-tikeo-gray-text">{{ it.orderNumber }}</p>
              <p v-if="it.note" class="mt-1 break-words text-xs italic text-tikeo-gray-text">« {{ it.note }} »</p>
            </td>
            <td class="whitespace-nowrap px-4 py-3 align-top text-tikeo-gray-text">{{ dateFmt(it.paidAt) }} · {{ timeFmt(it.paidAt) }}</td>
            <td class="whitespace-nowrap px-4 py-3 text-right align-top font-bold text-tikeo-black">{{ fmt(it.amount) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <button v-if="data.hasMore" type="button" class="btn-ink" :disabled="loading" @click="limit += PAGE">{{ t('event.contributionsMore') }}</button>
  </section>
  <p v-else-if="failed" class="sr-only">{{ t('event.contributionsError') }}</p>
</template>
