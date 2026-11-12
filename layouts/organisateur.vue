<script setup lang="ts">
const { t } = useI18n()
const { profile, user, signOut } = useAuth()
const { organizer, fetchOrganizer } = useOrganizer()
const router = useRouter()
const route = useRoute()
const sidebarOpen = ref(false)
// Menu latéral masquable sur grand écran (mémorisé, Ctrl+B) : composables/useSidebarCollapse.ts
const { collapsed: sidebarCollapsed, toggle: toggleSidebar } = useSidebarCollapse('organizer')

if (!organizer.value) {
  onMounted(fetchOrganizer)
}

const navGroups = computed(() => [
  {
    label: t('organizerNav.overview'),
    items: [{ to: '/organisateur/dashboard', label: t('organizerNav.dashboard'), icon: 'grid' }],
  },
  {
    label: t('organizerNav.management'),
    items: [
      { to: '/organisateur/evenements', label: t('organizerNav.myEvents'), icon: 'calendar' },
      { to: '/organisateur/evenements/scanner', label: t('organizerNav.scanner'), icon: 'scan' },
      { to: '/organisateur/revenus', label: t('organizerNav.revenue'), icon: 'wallet' },
      { to: '/organisateur/codes-promo', label: t('promoCodes.title'), icon: 'tag' },
    ],
  },
  {
    label: t('organizerNav.account'),
    items: [{ to: '/organisateur/parametres', label: t('organizerNav.settings'), icon: 'settings' }],
  },
])

const statusMeta = computed<Record<string, { label: string; class: string }>>(() => ({
  pending: { label: t('organizerNav.statusPending'), class: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30' },
  approved: { label: t('organizerNav.statusApproved'), class: 'bg-tikeo-success/10 text-tikeo-success border-tikeo-success/30' },
  suspended: { label: t('organizerNav.statusSuspended'), class: 'bg-tikeo-error/10 text-tikeo-error border-tikeo-error/30' },
}))
const currentStatus = computed(() => (organizer.value ? statusMeta.value[organizer.value.status] : null))

const initials = computed(() => {
  const name = profile.value?.full_name?.trim()
  if (name) return name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  return user.value?.email?.slice(0, 2).toUpperCase() || 'OR'
})

function isActive(to: string) {
  if (route.path === to) return true
  // « Mes événements » reste actif sur ses sous-pages (modifier, nouveau, statistiques…),
  // sauf pour le scanner qui a sa propre entrée dans le menu.
  if (to === '/organisateur/evenements') return route.path.startsWith(to + '/') && !route.path.startsWith('/organisateur/evenements/scanner')
  return route.path.startsWith(to + '/')
}

async function handleLogout() {
  await signOut()
  router.push('/connexion')
}

// Barre du bas (mobile) : les 4 accès les plus fréquents + « Créer » au centre
const bottomItems = computed(() => [
  { to: '/organisateur/dashboard', label: t('organizerNav.dashboard'), icon: 'grid' },
  { to: '/organisateur/evenements', label: t('organizerNav.myEvents'), icon: 'calendar' },
  { to: '/organisateur/evenements/scanner', label: t('organizerNav.scanner'), icon: 'scan' },
  { to: '/organisateur/revenus', label: t('organizerNav.revenue'), icon: 'wallet' },
])

// Ferme le tiroir à chaque changement de page et bloque le défilement derrière lui
watch(() => route.path, () => { sidebarOpen.value = false })
watch(sidebarOpen, (open) => {
  if (typeof document !== 'undefined') document.body.style.overflow = open ? 'hidden' : ''
})
onBeforeUnmount(() => {
  if (typeof document !== 'undefined') document.body.style.overflow = ''
})
</script>

<template>
  <div class="admin-shell relative flex min-h-screen bg-tikeo-gray-light">
    <!-- ============ Menu latéral flottant (desktop) ============ -->
    <aside
      class="sticky top-0 z-20 hidden h-screen shrink-0 overflow-hidden transition-[width,padding] duration-300 ease-out md:block"
      :class="sidebarCollapsed ? 'md:w-0 md:p-0' : 'md:w-[18rem] md:p-3'"
      :aria-hidden="sidebarCollapsed ? 'true' : undefined"
      :inert="sidebarCollapsed || undefined"
    >
      <div class="admin-side flex h-full w-[16.5rem] flex-col overflow-hidden rounded-3xl text-white">
        <NuxtLink to="/organisateur/dashboard" class="group flex items-center gap-3 px-4 pb-4 pt-5">
          <span class="flex h-11 items-center rounded-2xl bg-white px-3 shadow-lg shadow-black/20 transition-transform duration-300 group-hover:scale-[1.03]">
            <img src="/logo-babicho.png" alt="Babicho" class="h-7 w-auto" />
          </span>
          <span class="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#FFB066] ring-1 ring-white/15">{{ t('organizerNav.badge') }}</span>
        </NuxtLink>

        <div class="px-3 pb-4">
          <NuxtLink to="/organisateur/evenements/nouveau" class="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FF7A00] to-[#FF9A3D] text-sm font-bold text-[#0E2240] shadow-[0_12px_24px_-12px_rgba(255,122,0,0.9)] transition hover:brightness-105 active:scale-[0.98]">
            <AppIcon name="plus" class="h-[18px] w-[18px] transition-transform duration-300 group-hover:rotate-90" :stroke="2.6" />
            {{ t('organizerNav.createEvent') }}
          </NuxtLink>
        </div>

        <AdminNavList :groups="navGroups" :active-fn="isActive" />

        <div class="space-y-2 p-3">
          <NuxtLink to="/" class="group flex h-10 items-center gap-2.5 rounded-xl px-3 text-xs font-bold uppercase tracking-wider text-white/60 transition-colors hover:bg-white/10 hover:text-white">
            <AppIcon name="arrow-left" class="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
            {{ t('organizerNav.backToSite').replace('← ', '') }}
          </NuxtLink>
          <div class="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-2.5 ring-1 ring-white/10">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF7A00] to-[#FF9A3D] text-sm font-bold text-[#0E2240]">{{ initials }}</span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-[13px] font-bold">{{ organizer?.name || t('organizerNav.fallbackTitle') }}</p>
              <p v-if="currentStatus" class="truncate text-[11px] text-white/50">{{ currentStatus.label }}</p>
            </div>
            <button type="button" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-tikeo-error hover:text-white" :aria-label="t('organizerNav.logout')" :title="t('organizerNav.logout')" @click="handleLogout">
              <AppIcon name="logout" class="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </div>
    </aside>

    <!-- ============ Tiroir (mobile) ============ -->
    <Transition name="org-fade">
      <button v-if="sidebarOpen" type="button" class="fixed inset-0 z-40 bg-[#050d1c]/70 backdrop-blur-sm md:hidden" :aria-label="t('organizerNav.closeMenu')" @click="sidebarOpen = false" />
    </Transition>
    <Transition
      enter-active-class="transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
      leave-active-class="transition-transform duration-200 ease-in"
      enter-from-class="-translate-x-[110%]"
      leave-to-class="-translate-x-[110%]"
    >
      <aside v-if="sidebarOpen" class="admin-side fixed inset-y-3 left-3 z-50 flex w-80 max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-3xl text-white shadow-2xl md:hidden">
        <div class="flex items-center justify-between px-4 pb-3 pt-4">
          <span class="flex h-10 items-center rounded-2xl bg-white px-3">
            <img src="/logo-babicho.png" alt="Babicho" class="h-6 w-auto" />
          </span>
          <button type="button" class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition-colors active:bg-white/20" :aria-label="t('organizerNav.closeMenu')" @click="sidebarOpen = false">
            <AppIcon name="close" class="h-5 w-5" />
          </button>
        </div>

        <div class="mx-3 mb-3 flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF7A00] to-[#FF9A3D] text-sm font-bold text-[#0E2240]">{{ initials }}</span>
          <div class="min-w-0">
            <p class="truncate text-sm font-bold">{{ organizer?.name || t('organizerNav.fallbackTitle') }}</p>
            <p v-if="currentStatus" class="truncate text-xs text-white/50">{{ currentStatus.label }}</p>
          </div>
        </div>

        <div class="px-3 pb-3">
          <NuxtLink to="/organisateur/evenements/nouveau" class="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FF7A00] to-[#FF9A3D] text-[15px] font-bold text-[#0E2240] shadow-[0_12px_24px_-12px_rgba(255,122,0,0.9)] active:scale-[0.98]">
            <AppIcon name="plus" class="h-[18px] w-[18px]" :stroke="2.6" />
            {{ t('organizerNav.createEvent') }}
          </NuxtLink>
        </div>

        <AdminNavList :groups="navGroups" :active-fn="isActive" large />

        <div class="grid grid-cols-2 gap-2 p-3">
          <NuxtLink to="/" class="flex h-11 items-center justify-center gap-2 rounded-xl bg-white/10 text-sm font-semibold transition-colors active:bg-white/20">
            <AppIcon name="home" class="h-[18px] w-[18px]" />{{ t('organizerNav.backToSite').replace('← ', '') }}
          </NuxtLink>
          <button type="button" class="flex h-11 items-center justify-center gap-2 rounded-xl bg-tikeo-error/20 text-sm font-semibold text-[#FFB4B4] transition-colors active:bg-tikeo-error/40" @click="handleLogout">
            <AppIcon name="logout" class="h-[18px] w-[18px]" />{{ t('organizerNav.logout') }}
          </button>
        </div>
      </aside>
    </Transition>

    <!-- ============ Colonne principale ============ -->
    <div class="relative z-10 flex min-w-0 flex-1 flex-col">
      <header class="admin-header sticky top-0 z-30 px-3 pt-3 md:px-6 md:pt-4">
        <div class="flex items-center justify-between gap-3 rounded-2xl border border-tikeo-border bg-tikeo-surface/80 px-2.5 py-2 shadow-[0_8px_30px_-12px_rgba(14,34,64,0.25)] backdrop-blur-xl md:px-3">
          <div class="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              class="org-icon-btn hidden md:flex"
              :aria-label="sidebarCollapsed ? t('organizerNav.showSidebar') : t('organizerNav.hideSidebar')"
              :title="(sidebarCollapsed ? t('organizerNav.showSidebar') : t('organizerNav.hideSidebar')) + ' (Ctrl+B)'"
              :aria-pressed="sidebarCollapsed"
              @click="toggleSidebar"
            >
              <AppIcon :name="sidebarCollapsed ? 'menu' : 'chevron-left'" class="h-5 w-5" :stroke="2.2" />
            </button>
            <button type="button" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0E2240] text-white shadow-md transition-transform active:scale-95 md:hidden" :aria-label="t('organizerNav.openMenu')" @click="sidebarOpen = true">
              <AppIcon name="menu" class="h-5 w-5" />
            </button>
            <NuxtLink to="/organisateur/dashboard" class="flex min-w-0 items-center gap-2" :class="sidebarCollapsed ? '' : 'md:hidden'" aria-label="Babicho">
              <img src="/logo-babicho.png" alt="Babicho" class="h-8 w-auto" />
            </NuxtLink>
            <div class="hidden min-w-0 items-center gap-2 text-sm md:flex">
              <span class="font-semibold text-tikeo-gray-text">{{ t('organizerNav.badge') }}</span>
              <AppIcon name="chevron-right" class="h-3.5 w-3.5 shrink-0 text-tikeo-gray-text/60" />
              <span class="truncate font-display font-extrabold text-tikeo-black">{{ organizer?.name || t('organizerNav.fallbackTitle') }}</span>
            </div>
          </div>
          <div class="flex items-center gap-1.5 md:gap-2">
            <span v-if="currentStatus" class="hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold sm:inline-flex" :class="currentStatus.class">
              <AppIcon :name="organizer?.status === 'approved' ? 'shield-check' : 'clock'" class="h-3.5 w-3.5" />
              {{ currentStatus.label }}
            </span>
            <ThemeToggle compact boxed />
            <LanguageSwitcher compact boxed />
            <span class="mx-1 hidden h-6 w-px bg-tikeo-border sm:block" aria-hidden="true" />
            <span class="hidden h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF7A00] to-[#FF9A3D] text-xs font-bold text-[#0E2240] sm:flex">{{ initials }}</span>
            <button
              type="button"
              class="org-icon-btn max-lg:!w-10 lg:!w-auto lg:gap-2 lg:px-3 text-xs font-bold hover:!border-tikeo-error hover:!bg-tikeo-error hover:!text-white"
              :aria-label="t('organizerNav.logout')"
              @click="handleLogout"
            >
              <AppIcon name="logout" class="h-[18px] w-[18px]" />
              <span class="hidden lg:inline">{{ t('organizerNav.logout') }}</span>
            </button>
          </div>
        </div>
      </header>

      <!-- Bandeaux d'alerte : le compte n'est pas (ou plus) actif -->
      <div v-if="organizer?.status === 'pending' || organizer?.status === 'suspended'" class="px-3 pt-3 md:px-6">
        <div
          v-if="organizer?.status === 'pending'"
          class="flex items-start gap-3 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-800 dark:text-yellow-300"
        >
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-yellow-500/20"><AppIcon name="clock" class="h-4 w-4" /></span>
          <p class="self-center leading-relaxed">{{ t('organizerNav.bannerPending') }}</p>
        </div>
        <div v-else class="flex items-start gap-3 rounded-2xl border border-tikeo-error/30 bg-tikeo-error/10 px-4 py-3 text-xs text-tikeo-error">
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-tikeo-error/15"><AppIcon name="alert" class="h-4 w-4" /></span>
          <p class="self-center leading-relaxed">{{ t('organizerNav.bannerSuspended') }}</p>
        </div>
      </div>

      <main class="org-main flex-1 max-md:pb-28">
        <slot />
      </main>

      <footer class="px-4 pb-4 pt-2 text-center text-xs text-tikeo-gray-text max-md:mb-20 md:px-8">
        © {{ new Date().getFullYear() }} Babicho — {{ t('organizerNav.footer') }}
      </footer>
    </div>

    <!-- ============ Barre du bas (mobile) ============ -->
    <DashBottomNav
      rounded
      :items="bottomItems.map((b) => ({ ...b, active: isActive(b.to) }))"
      :center="{ to: '/organisateur/evenements/nouveau', label: t('organizerNav.createEvent'), icon: 'plus' }"
      :aria-label="t('organizerNav.badge')"
    />
  </div>
</template>
