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
  { to: '/mon-espace/mes-billets', label: t('buyerDashboard.statTickets'), value: loading.value ? null : validTicketsCount.value, icon: 'ticket', tone: 'bg-[#FF7A00] text-tikeo-ink' },
  { to: '/mon-espace/mes-commandes', label: t('buyerDashboard.statOrders'), value: loading.value ? null : orders.value.length, icon: 'receipt', tone: 'bg-[#0057B8] text-white' },
  { to: '/mon-espace/mes-favoris', label: t('buyerDashboard.statFavorites'), value: favoriteIds.value.length, icon: 'heart', tone: 'bg-tikeo-ink text-white dark:bg-white dark:text-tikeo-ink' },
])

// Le prochain événement est mis en avant ; les suivants restent dans la liste.
const nextTicket = computed(() => upcomingTickets.value[0] ?? null)
const otherTickets = computed(() => upcomingTickets.value.slice(1))

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
      <NuxtLink to="/evenements" class="btn-brand group !h-12 !rounded-full !px-6 max-sm:w-full">
        {{ t('common.browseEvents') }}
        <AppIcon name="arrow-right" class="h-4 w-4 transition-transform group-hover:translate-x-1" :stroke="2.4" />
      </NuxtLink>
    </template>

    <!-- ============ 1. Trois chiffres, chacun mène à sa page ============ -->
    <div v-stagger:up="{ step: 90 }" class="grid grid-cols-3 gap-3 md:gap-4">
      <NuxtLink
        v-for="s in stats"
        :key="s.to"
        :to="s.to"
        class="dash-stat group relative overflow-hidden rounded-[1.5rem] border border-tikeo-border bg-tikeo-surface p-4 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-[#FF7A00]/60 hover:shadow-[0_24px_40px_-24px_rgba(14,34,64,0.45)] md:p-5"
      >
        <span class="flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 md:h-11 md:w-11" :class="s.tone">
          <AppIcon :name="s.icon" class="h-5 w-5" />
        </span>
        <p class="mt-3 font-display text-3xl font-extrabold leading-none tracking-[-0.03em] text-tikeo-black md:mt-4 md:text-[2.6rem]">
          <span v-if="s.value === null" class="inline-block h-8 w-10 animate-pulse rounded-lg bg-tikeo-border" />
          <OrgCountUp v-else :value="s.value" />
        </p>
        <p class="mt-1.5 truncate text-[13px] font-semibold text-tikeo-gray-text md:text-sm">{{ s.label }}</p>
        <AppIcon name="arrow-right" class="absolute right-4 top-4 hidden h-4 w-4 -rotate-45 text-tikeo-gray-text opacity-0 transition-all duration-300 group-hover:rotate-0 group-hover:opacity-100 md:block" :stroke="2.4" />
      </NuxtLink>
    </div>

    <!-- ============ 2. Prochain événement (grande carte 3D) ============ -->
    <section class="mt-8 md:mt-10">
      <div class="mb-4">
        <h2 class="flex items-center gap-3 font-display text-xl font-extrabold tracking-[-0.03em] text-tikeo-black md:text-2xl">
          <span class="h-1.5 w-7 rounded-full bg-[#FF7A00]" aria-hidden="true" />{{ t('buyerDashboard.nextEvent') }}
        </h2>
        <p class="mt-1 text-sm text-tikeo-gray-text">{{ t('buyerDashboard.nextEventSub') }}</p>
      </div>

      <div v-if="loading" class="h-60 animate-pulse rounded-[1.75rem] bg-tikeo-border" />

      <div v-else-if="nextTicket" v-reveal:up class="dash-stage">
        <NuxtLink
          to="/mon-espace/mes-billets"
          v-tilt
          class="dash-next group relative isolate flex min-h-[15rem] flex-col justify-end overflow-hidden rounded-[1.75rem] bg-tikeo-ink text-white shadow-[0_30px_60px_-28px_rgba(14,34,64,0.65)] md:min-h-[17rem]"
        >
          <img v-if="nextTicket.event?.cover_image" :src="nextTicket.event.cover_image" alt="" class="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div class="absolute inset-0 -z-10 bg-gradient-to-t from-[#0E2240] via-[#0E2240]/75 to-[#0E2240]/20" aria-hidden="true" />
          <span class="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-[#FF7A00] px-3.5 py-1.5 text-xs font-bold text-tikeo-ink">
            <span class="relative flex h-2 w-2"><span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-tikeo-ink/50" /><span class="relative inline-flex h-2 w-2 rounded-full bg-tikeo-ink" /></span>
            {{ whenLabel(nextTicket.event!.start_date) }}
          </span>
          <div class="absolute right-4 top-4 flex flex-col items-center rounded-2xl bg-white px-3 py-2 text-tikeo-ink shadow-lg">
            <span class="text-[11px] font-bold capitalize text-tikeo-ink/60">{{ dateParts(nextTicket.event!.start_date).weekday }}</span>
            <span class="font-display text-2xl font-extrabold leading-none">{{ dateParts(nextTicket.event!.start_date).day }}</span>
            <span class="text-[11px] font-bold uppercase text-[#E05F00]">{{ dateParts(nextTicket.event!.start_date).month }}</span>
          </div>
          <div class="flex flex-wrap items-end justify-between gap-4 p-5 md:p-7">
            <div class="min-w-0">
              <h3 class="font-display text-2xl font-extrabold leading-tight tracking-[-0.03em] md:text-[2rem]" style="text-wrap: balance">{{ nextTicket.event?.title }}</h3>
              <p class="mt-2 flex items-center gap-1.5 text-sm text-white/75">
                <AppIcon name="pin" class="h-4 w-4 shrink-0" />
                <span class="truncate">{{ nextTicket.event?.location_name || nextTicket.event?.city }}<template v-if="nextTicket.ticket_type?.name"> · {{ nextTicket.ticket_type.name }}</template></span>
              </p>
            </div>
            <span class="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-tikeo-ink transition-colors group-hover:bg-[#FF7A00]">
              {{ t('buyerDashboard.openTicket') }}
              <AppIcon name="arrow-right" class="h-4 w-4 transition-transform group-hover:translate-x-1" :stroke="2.4" />
            </span>
          </div>
        </NuxtLink>
      </div>

      <!-- Aucun billet : invitation claire -->
      <div v-else v-reveal:up class="relative isolate overflow-hidden rounded-[1.75rem] border border-dashed border-tikeo-border bg-tikeo-surface px-6 py-10 text-center md:py-12">
        <div class="pointer-events-none absolute -top-20 left-1/2 -z-10 h-48 w-48 -translate-x-1/2 rounded-full bg-[#FF7A00]/15 blur-3xl" aria-hidden="true" />
        <span class="dash-bob mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-tikeo-ink text-white dark:bg-[#FF7A00] dark:text-tikeo-ink"><AppIcon name="ticket" class="h-8 w-8" /></span>
        <h3 class="mt-4 font-display text-xl font-extrabold tracking-[-0.02em] text-tikeo-black md:text-2xl">{{ t('buyerDashboard.discoverTitle') }}</h3>
        <p class="mx-auto mt-1.5 max-w-sm text-sm text-tikeo-gray-text">{{ t('buyerDashboard.discoverSub') }}</p>
        <NuxtLink to="/evenements" class="btn-brand mt-5 !h-12 !rounded-full !px-7">{{ t('common.browseEvents') }}</NuxtLink>
      </div>
    </section>

    <!-- ============ 3. Autres billets + dernières commandes ============ -->
    <div class="mt-10 grid gap-8 md:mt-12 xl:grid-cols-2 xl:gap-8">
      <section v-if="otherTickets.length" class="min-w-0">
        <div class="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 class="acc-h2 !font-display !font-extrabold">{{ t('buyerDashboard.upcomingTitle') }}</h2>
            <p class="mt-1 text-sm text-tikeo-gray-text">{{ t('buyerDashboard.ticketsSub') }}</p>
          </div>
          <NuxtLink to="/mon-espace/mes-billets" class="acc-link shrink-0">{{ t('home.seeAll') }}</NuxtLink>
        </div>
        <ul v-stagger:up="{ step: 80 }" class="space-y-3">
          <li v-for="tk in otherTickets" :key="tk.id">
            <NuxtLink to="/mon-espace/mes-billets" class="group flex items-stretch overflow-hidden rounded-[1.5rem] border border-tikeo-border bg-tikeo-surface shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-[#FF7A00]/60">
              <div class="flex w-20 shrink-0 flex-col items-center justify-center bg-tikeo-ink px-2 py-4 text-white md:w-24">
                <span class="text-xs font-medium capitalize text-white/70">{{ dateParts(tk.event!.start_date).weekday }}</span>
                <span class="mt-1 font-display text-3xl font-extrabold leading-none">{{ dateParts(tk.event!.start_date).day }}</span>
                <span class="mt-0.5 text-xs font-medium capitalize text-white/70">{{ dateParts(tk.event!.start_date).month }}</span>
              </div>
              <div class="min-w-0 flex-1 border-l-2 border-dashed border-tikeo-border px-4 py-3.5 md:px-5">
                <p class="text-xs font-bold uppercase tracking-wide text-[#E05F00]">{{ whenLabel(tk.event!.start_date) }}</p>
                <h3 class="mt-0.5 truncate font-display text-base font-bold text-tikeo-black">{{ tk.event?.title }}</h3>
                <p class="mt-1 flex items-center gap-1.5 text-sm text-tikeo-gray-text"><AppIcon name="pin" class="h-3.5 w-3.5 shrink-0" /><span class="truncate">{{ tk.event?.city }}<template v-if="tk.ticket_type?.name"> · {{ tk.ticket_type.name }}</template></span></p>
              </div>
              <span class="flex shrink-0 items-center pr-4 text-tikeo-black"><AppIcon name="chevron-right" class="h-5 w-5 transition-transform group-hover:translate-x-1" :stroke="2.4" /></span>
            </NuxtLink>
          </li>
        </ul>
      </section>

      <section class="min-w-0" :class="otherTickets.length ? '' : 'xl:col-span-2'">
        <div class="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 class="acc-h2 !font-display !font-extrabold">{{ t('buyerDashboard.recentOrdersTitle') }}</h2>
            <p class="mt-1 text-sm text-tikeo-gray-text">{{ t('buyerDashboard.ordersSub') }}</p>
          </div>
          <NuxtLink to="/mon-espace/mes-commandes" class="acc-link shrink-0">{{ t('home.seeAll') }}</NuxtLink>
        </div>
        <div v-if="loading" class="h-24 animate-pulse rounded-[1.5rem] bg-tikeo-border" />
        <p v-else-if="recentOrders.length === 0" class="acc-empty tx-body !py-8">{{ t('buyerDashboard.noOrders') }}</p>
        <ul v-else v-stagger:up="{ step: 80 }" class="acc-panel divide-y divide-tikeo-border overflow-hidden">
          <li v-for="order in recentOrders" :key="order.id">
            <NuxtLink to="/mon-espace/mes-commandes" class="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-tikeo-surface-alt">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tikeo-surface-alt text-tikeo-black"><AppIcon name="receipt" class="h-5 w-5" /></span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-[15px] font-semibold text-tikeo-black">{{ order.event?.title || order.order_number }}</p>
                <p class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-tikeo-gray-text">
                  <span>{{ formatDate(order.created_at) }}</span>
                  <span class="acc-tag" :class="orderTag[order.status]">{{ t(`orderStatus.${order.status}`) }}</span>
                </p>
              </div>
              <p class="shrink-0 text-right font-display text-[15px] font-extrabold text-tikeo-black">{{ order.total.toLocaleString('fr-FR') }} <span class="text-xs font-medium text-tikeo-gray-text">FCFA</span></p>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </div>
  </AccountShell>
</template>

<style scoped>
.dash-stage { perspective: 1200px; }
.dash-bob { animation: dash-bob 3.2s ease-in-out infinite; }
@keyframes dash-bob { 50% { transform: translateY(-7px) rotate(-4deg); } }
@media (prefers-reduced-motion: reduce) { .dash-bob { animation: none; } }
:global(html.ui-reduce-motion) .dash-bob { animation: none; }
</style>
