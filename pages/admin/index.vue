<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const supabase = useSupabase()
const authStore = useAuthStore()
const loading = ref(true)
const stats = reactive({ users: 0, organizers: 0, events: 0, publishedEvents: 0 })

// RBAC (migration 0021) : le tableau de bord est la page d'atterrissage
// commune à tous les rôles admin, mais chaque carte de statistique/raccourci
// ne s'affiche que si le rôle connecté a le droit de voir la ressource
// correspondante — sinon la RLS renverrait simplement 0, ce qui donnerait
// la fausse impression d'une plateforme vide.
const canSeeUsers = computed(() => authStore.isSuperAdmin || authStore.hasPermission('users.view'))
const canSeeOrganizers = computed(() => authStore.isSuperAdmin || authStore.hasPermission('organizers.view'))
const canSeeEvents = computed(() => authStore.isSuperAdmin || authStore.hasPermission('events.view'))
const canSeeRevenue = computed(() => authStore.isSuperAdmin || authStore.hasPermission('payments.view'))

const { revenue, signups, topEvents, loading: analyticsLoading, totalRevenue, totalOrders } = useAdminAnalytics(30)

function formatFcfa(v: number) {
  return `${new Intl.NumberFormat('fr-FR').format(v)} FCFA`
}

onMounted(async () => {
  try {
    const [usersRes, organizersRes, eventsRes, publishedRes] = await Promise.all([
      canSeeUsers.value ? supabase.from('profiles').select('*', { count: 'exact', head: true }) : Promise.resolve({ count: null }),
      canSeeOrganizers.value ? supabase.from('organizers').select('*', { count: 'exact', head: true }) : Promise.resolve({ count: null }),
      canSeeEvents.value ? supabase.from('events').select('*', { count: 'exact', head: true }) : Promise.resolve({ count: null }),
      canSeeEvents.value
        ? supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'published')
        : Promise.resolve({ count: null }),
    ])
    stats.users = usersRes.count ?? 0
    stats.organizers = organizersRes.count ?? 0
    stats.events = eventsRes.count ?? 0
    stats.publishedEvents = publishedRes.count ?? 0
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
    <h1>{{ t('adminDashboard.title') }}</h1>

    <!-- Chiffres clés -->
    <div class="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
      <template v-for="(card, i) in [
        { show: canSeeUsers, label: t('adminDashboard.users'), value: stats.users, icon: 'users', tone: 'text-tikeo-black', chip: 'bg-[#0057B8]/10 text-[#0057B8]', to: '/admin/utilisateurs' },
        { show: canSeeOrganizers, label: t('adminDashboard.organizers'), value: stats.organizers, icon: 'briefcase', tone: 'text-tikeo-black', chip: 'bg-[#FF7A00]/12 text-[#E56A00]', to: '/admin/organisateurs' },
        { show: canSeeEvents, label: t('adminDashboard.events'), value: stats.events, icon: 'calendar', tone: 'text-tikeo-black', chip: 'bg-[#7C3AED]/10 text-[#7C3AED]', to: '/admin/evenements' },
        { show: canSeeEvents, label: t('adminDashboard.published'), value: stats.publishedEvents, icon: 'trending', tone: 'text-tikeo-success', chip: 'bg-tikeo-success/10 text-tikeo-success', to: '/admin/evenements' },
      ]" :key="card.label">
        <NuxtLink v-if="card.show" :to="card.to" class="org-rise org-card-hover group relative overflow-hidden rounded-2xl border border-tikeo-border bg-tikeo-surface p-4 shadow-card md:p-5" :style="`--i: ${i}`">
          <span class="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-60 blur-2xl transition-opacity duration-500 group-hover:opacity-100" :class="card.chip.split(' ')[0]" aria-hidden="true" />
          <div class="relative flex items-start justify-between gap-2">
            <span class="flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3" :class="card.chip">
              <AppIcon :name="card.icon" class="h-5 w-5" />
            </span>
            <AppIcon name="arrow-up-right" class="h-4 w-4 text-tikeo-gray-text/50 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-tikeo-orange" />
          </div>
          <p class="relative mt-4 font-display text-3xl font-extrabold leading-none md:text-4xl" :class="card.tone">
            <span v-if="loading" class="inline-block h-8 w-16 animate-pulse rounded-lg bg-tikeo-surface-alt align-middle" />
            <OrgCountUp v-else :value="card.value" />
          </p>
          <p class="relative mt-2 text-xs font-semibold text-tikeo-gray-text md:text-[13px]">{{ card.label }}</p>
        </NuxtLink>
      </template>
    </div>

    <!-- Graphiques -->
    <div v-if="canSeeRevenue || canSeeEvents" class="mt-5 grid gap-4 md:mt-6 md:grid-cols-2">
      <div v-if="canSeeRevenue" class="org-rise org-panel p-4 md:p-5" style="--i: 4">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h2 class="acc-label flex items-center gap-2"><AppIcon name="wallet" class="h-4 w-4" />{{ t('adminAnalytics.revenueTitle') }}</h2>
          <span class="acc-tag bg-tikeo-surface-alt text-tikeo-gray-text">{{ t('adminAnalytics.last30Days') }}</span>
        </div>
        <p class="mb-3 font-display text-2xl font-extrabold text-tikeo-black md:text-3xl">{{ analyticsLoading ? '—' : formatFcfa(totalRevenue) }}</p>
        <AdminLineChart v-if="!analyticsLoading && revenue.length" :values="revenue.map((p) => Number(p.revenue))" color="#FF7A00" />
        <p v-else-if="!analyticsLoading" class="py-6 text-center text-xs text-tikeo-gray-text">{{ t('adminAnalytics.noData') }}</p>
      </div>

      <div v-if="canSeeEvents" class="org-rise org-panel p-4 md:p-5" style="--i: 5">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h2 class="acc-label flex items-center gap-2"><AppIcon name="user-plus" class="h-4 w-4" />{{ t('adminAnalytics.signupsTitle') }}</h2>
          <span class="acc-tag bg-tikeo-surface-alt text-tikeo-gray-text">{{ t('adminAnalytics.last30Days') }}</span>
        </div>
        <p class="mb-3 font-display text-2xl font-extrabold text-tikeo-black md:text-3xl">
          {{ analyticsLoading ? '—' : signups.reduce((s, p) => s + Number(p.buyers) + Number(p.organizers), 0) }}
        </p>
        <AdminLineChart v-if="!analyticsLoading && signups.length" :values="signups.map((p) => Number(p.buyers) + Number(p.organizers))" color="#0057B8" />
        <p v-else-if="!analyticsLoading" class="py-6 text-center text-xs text-tikeo-gray-text">{{ t('adminAnalytics.noData') }}</p>
      </div>

      <div v-if="canSeeRevenue && topEvents.length" class="org-rise org-panel p-4 md:col-span-2 md:p-5" style="--i: 6">
        <h2 class="acc-label mb-4 flex items-center gap-2"><AppIcon name="trending" class="h-4 w-4" />{{ t('adminAnalytics.topEventsTitle') }}</h2>
        <AdminBarChart :items="topEvents.map((e) => ({ label: e.title, value: Number(e.revenue) }))" :format-value="formatFcfa" />
      </div>
    </div>

    <!-- Raccourcis -->
    <div class="mt-6 grid gap-3 md:mt-8 md:gap-4 lg:grid-cols-3">
      <template v-for="(link, i) in [
        { show: canSeeEvents, to: '/admin/evenements', icon: 'calendar', title: t('adminDashboard.manageEvents'), desc: t('adminDashboard.manageEventsDesc') },
        { show: canSeeOrganizers, to: '/admin/organisateurs', icon: 'briefcase', title: t('adminDashboard.manageOrganizers'), desc: t('adminDashboard.manageOrganizersDesc') },
        { show: canSeeUsers, to: '/admin/utilisateurs', icon: 'users', title: t('adminDashboard.manageUsers'), desc: t('adminDashboard.manageUsersDesc') },
      ]" :key="link.to">
        <NuxtLink v-if="link.show" :to="link.to" class="org-rise org-card-hover group flex items-start gap-4 rounded-2xl border border-tikeo-border bg-tikeo-surface p-4 shadow-card md:p-5" :style="`--i: ${i + 7}`">
          <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0E2240] to-[#16305A] text-[#FFB066] shadow-lg shadow-[#0E2240]/25 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"><AppIcon :name="link.icon" class="h-5 w-5" /></span>
          <div class="min-w-0 flex-1">
            <p class="font-display text-base font-extrabold text-tikeo-black">{{ link.title }}</p>
            <p class="mt-0.5 text-xs leading-relaxed text-tikeo-gray-text">{{ link.desc }}</p>
          </div>
          <AppIcon name="arrow-right" class="mt-1 h-4 w-4 shrink-0 self-center text-tikeo-gray-text transition-transform duration-300 group-hover:translate-x-1" />
        </NuxtLink>
      </template>
    </div>
  </div>
</template>
