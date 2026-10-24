<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const { t, locale } = useI18n()
const { profile } = useAuth()
const { orders, loading: ordersLoading } = useMyOrders()
const { tickets, loading: ticketsLoading } = useMyTickets()
const { favoriteIds } = useFavorites()

const loading = computed(() => ordersLoading.value || ticketsLoading.value)
const validTicketsCount = computed(() => tickets.value.filter((tk) => tk.status === 'valid').length)

const upcomingTickets = computed(() =>
  tickets.value
    .filter((tk) => tk.status === 'valid' && tk.event && new Date(tk.event.start_date) >= new Date())
    .sort((a, b) => new Date(a.event!.start_date).getTime() - new Date(b.event!.start_date).getTime())
    .slice(0, 3)
)

const recentOrders = computed(() => orders.value.slice(0, 3))
const firstName = computed(() => (profile.value?.full_name || '').trim().split(/\s+/)[0] || '')

// Trois chiffres, chacun mène à sa page. Les raccourcis (billets, favoris,
// profil…) ne sont plus répétés ici : ils sont déjà dans la barre de navigation.
const stats = computed(() => [
  { to: '/mon-espace/mes-billets', label: t('buyerDashboard.statTickets'), value: loading.value ? '—' : validTicketsCount.value },
  { to: '/mon-espace/mes-commandes', label: t('buyerDashboard.statOrders'), value: loading.value ? '—' : orders.value.length },
  { to: '/mon-espace/mes-favoris', label: t('buyerDashboard.statFavorites'), value: favoriteIds.value.length },
])

// Talon de date (même présentation que la page événement).
function dateParts(d: string) {
  const dt = new Date(d)
  return {
    weekday: dt.toLocaleDateString(locale.value, { weekday: 'short' }).replace('.', ''),
    day: String(dt.getDate()).padStart(2, '0'),
    month: dt.toLocaleDateString(locale.value, { month: 'short' }).replace('.', ''),
  }
}

// « Aujourd'hui », « Demain » ou « Dans N jours ».
function whenLabel(d: string) {
  const start = new Date(d)
  start.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((start.getTime() - today.getTime()) / 86400000)
  if (diff <= 0) return t('account.today')
  if (diff === 1) return t('account.tomorrow')
  return t('account.inDays', { n: diff })
}

const orderTag: Record<string, string> = {
  pending: 'bg-[#FF7A00]/15 text-tikeo-orange',
  paid: 'bg-tikeo-success/10 text-tikeo-success',
  failed: 'bg-tikeo-error/10 text-tikeo-error',
  cancelled: 'bg-tikeo-surface-alt text-tikeo-gray-text',
  refunded: 'bg-tikeo-blue/10 text-tikeo-blue',
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(locale.value, { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<template>
  <AccountShell :title="t('buyerDashboard.welcome', { name: firstName })" :subtitle="t('buyerDashboard.subtitle')" width="full" identity>
    <template #actions>
      <NuxtLink to="/evenements" class="btn-brand !h-11 hover:!bg-white max-sm:w-full">
        {{ t('common.browseEvents') }}
        <AppIcon name="arrow-right" class="h-4 w-4" :stroke="2.4" />
      </NuxtLink>
    </template>

    <!-- Trois chiffres clés -->
    <div class="acc-panel grid grid-cols-3 divide-x divide-tikeo-border">
      <NuxtLink
        v-for="s in stats"
        :key="s.to"
        :to="s.to"
        class="group px-3 py-4 text-center transition-colors hover:bg-tikeo-surface-alt md:px-6 md:py-5 md:text-left"
      >
        <p class="tx-number text-2xl md:text-4xl">{{ s.value }}</p>
        <p class="tx-meta mt-1 truncate">{{ s.label }}</p>
      </NuxtLink>
    </div>

    <div class="mt-10 grid gap-10 md:mt-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-12">
      <!-- ============ Prochains billets ============ -->
      <section class="min-w-0">
        <div class="mb-4 flex items-baseline justify-between gap-3">
          <h2 class="acc-h2">{{ t('buyerDashboard.upcomingTitle') }}</h2>
          <NuxtLink to="/mon-espace/mes-billets" class="acc-link shrink-0">{{ t('home.seeAll') }}</NuxtLink>
        </div>

        <div v-if="loading" class="space-y-3">
          <div v-for="i in 2" :key="i" class="h-24 animate-pulse bg-tikeo-border" />
        </div>

        <div v-else-if="upcomingTickets.length === 0" class="acc-empty">
          <span class="flex h-12 w-12 items-center justify-center bg-tikeo-ink text-white dark:bg-[#FF7A00] dark:text-tikeo-ink">
            <AppIcon name="ticket" class="h-6 w-6" />
          </span>
          <p class="tx-body">{{ t('buyerDashboard.noUpcoming') }}</p>
          <NuxtLink to="/evenements" class="btn-ink">{{ t('common.browseEvents') }}</NuxtLink>
        </div>

        <ul v-else class="space-y-3">
          <li v-for="tk in upcomingTickets" :key="tk.id">
            <!-- Toute la carte est cliquable : un seul geste pour ouvrir le billet -->
            <NuxtLink
              to="/mon-espace/mes-billets"
              class="group flex items-stretch bg-tikeo-surface shadow-card transition-shadow duration-200 hover:shadow-card-hover"
            >
              <div class="flex w-20 shrink-0 flex-col items-center justify-center bg-tikeo-ink px-2 py-4 text-white md:w-24">
                <span class="text-xs font-medium capitalize text-white/70">{{ dateParts(tk.event!.start_date).weekday }}</span>
                <span class="tx-number mt-1 text-3xl">{{ dateParts(tk.event!.start_date).day }}</span>
                <span class="mt-0.5 text-xs font-medium capitalize text-white/70">{{ dateParts(tk.event!.start_date).month }}</span>
              </div>

              <div class="min-w-0 flex-1 px-4 py-3.5 md:px-5">
                <p class="tx-eyebrow">{{ whenLabel(tk.event!.start_date) }}</p>
                <h3 class="tx-h3 mt-0.5 truncate">{{ tk.event?.title }}</h3>
                <p class="tx-meta mt-1 flex items-center gap-1.5">
                  <AppIcon name="pin" class="h-3.5 w-3.5 shrink-0" />
                  <span class="truncate">{{ tk.event?.city }}<template v-if="tk.ticket_type?.name"> · {{ tk.ticket_type.name }}</template></span>
                </p>
              </div>

              <span class="flex shrink-0 items-center gap-2 pr-4 text-sm font-semibold text-tikeo-black md:pr-5">
                <span class="hidden sm:inline">{{ t('account.viewTicket') }}</span>
                <AppIcon name="chevron-right" class="h-4 w-4 transition-transform group-hover:translate-x-0.5" :stroke="2.4" />
              </span>
            </NuxtLink>
          </li>
        </ul>
      </section>

      <!-- ============ Dernières commandes ============ -->
      <aside class="min-w-0">
        <div class="mb-4 flex items-baseline justify-between gap-3">
          <h2 class="acc-h2">{{ t('buyerDashboard.recentOrdersTitle') }}</h2>
          <NuxtLink to="/mon-espace/mes-commandes" class="acc-link shrink-0">{{ t('home.seeAll') }}</NuxtLink>
        </div>

        <div v-if="loading" class="h-24 animate-pulse bg-tikeo-border" />
        <p v-else-if="recentOrders.length === 0" class="acc-empty tx-body !py-8">
          {{ t('buyerDashboard.noOrders') }}
        </p>
        <ul v-else class="acc-panel divide-y divide-tikeo-border">
          <li v-for="order in recentOrders" :key="order.id" class="flex items-center gap-3 px-4 py-3.5">
            <div class="min-w-0 flex-1">
              <p class="truncate text-[15px] font-semibold text-tikeo-black">{{ order.event?.title || order.order_number }}</p>
              <p class="tx-meta mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>{{ formatDate(order.created_at) }}</span>
                <span class="acc-tag" :class="orderTag[order.status]">{{ t(`orderStatus.${order.status}`) }}</span>
              </p>
            </div>
            <p class="tx-number shrink-0 text-right text-[15px]">
              {{ order.total.toLocaleString('fr-FR') }} <span class="text-xs font-medium text-tikeo-gray-text">FCFA</span>
            </p>
          </li>
        </ul>
      </aside>
    </div>
  </AccountShell>
</template>
