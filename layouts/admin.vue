<script setup lang="ts">
const { t } = useI18n()
const { profile, user, signOut } = useAuth()
const authStore = useAuthStore()
const supabase = useSupabase()
const router = useRouter()
const route = useRoute()
const sidebarOpen = ref(false)
// Menu latéral masquable sur grand écran (mémorisé, Ctrl+B) : composables/useSidebarCollapse.ts
const { collapsed: sidebarCollapsed, toggle: toggleSidebar } = useSidebarCollapse('admin')
const { confirmState, answer: answerConfirm } = useAdminConfirm()
const pendingRequestsCount = ref(0)
const unreadMessagesCount = ref(0)

async function loadPendingRequestsCount() {
  if (!authStore.isSuperAdmin && !authStore.hasPermission('events.validate')) return
  const { count } = await supabase.from('event_edit_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending')
  pendingRequestsCount.value = count || 0
}
async function loadUnreadMessagesCount() {
  if (!authStore.isSuperAdmin && !authStore.hasPermission('support.view')) return
  const { count } = await supabase.from('contact_messages').select('id', { count: 'exact', head: true }).eq('status', 'new')
  unreadMessagesCount.value = count || 0
}
onMounted(loadPendingRequestsCount)
onMounted(loadUnreadMessagesCount)

// ------------------------------------------------------------
// RBAC (migration 0021) : le menu n'affiche que les sections que le rôle
// administrateur connecté est autorisé à ouvrir. Un Super Admin voit tout ;
// un Admin Finance ne voit par exemple ni "Utilisateurs" ni "Événements".
// Ce filtrage est un confort — la RLS empêche de toute façon toute donnée
// de fuiter si quelqu'un forçait l'URL directement.
// ------------------------------------------------------------
function can(...permissions: string[]) {
  return authStore.isSuperAdmin || permissions.some((p) => authStore.hasPermission(p as any))
}

const navGroups = computed(() => {
  type NavItem = { to: string; label: string; icon: string; badge?: typeof pendingRequestsCount }

  const managementItems = [
    can('marketing.manage') && { to: '/admin/accueil', label: t('adminNav.homeBanner'), icon: 'image' },
    can('onboarding.manage') && { to: '/admin/introduction', label: t('adminNav.introduction'), icon: 'sparkles' },
    can('popups.manage') && { to: '/admin/popups', label: t('adminNav.popups'), icon: 'megaphone' },
    can('partners.manage') && { to: '/admin/partenaires', label: t('adminNav.partners'), icon: 'handshake' },
    can('featured.manage') && { to: '/admin/a-la-une', label: t('adminNav.featured'), icon: 'star' },
    can('testimonials.manage') && { to: '/admin/temoignages', label: t('adminNav.testimonials'), icon: 'quote' },
    can('blog.manage') && { to: '/admin/blog', label: t('adminNav.blog'), icon: 'newspaper' },
    can('press.manage') && { to: '/admin/presse', label: t('adminNav.press'), icon: 'mic' },
    can('site.manage') && { to: '/admin/contact-reseaux', label: t('adminNav.siteSettings'), icon: 'phone' },
    can('users.view') && { to: '/admin/utilisateurs', label: t('adminNav.users'), icon: 'users' },
    can('organizers.view') && { to: '/admin/organisateurs', label: t('adminNav.organizers'), icon: 'briefcase' },
    can('events.view') && { to: '/admin/evenements', label: t('adminNav.events'), icon: 'calendar' },
    can('moderation.manage') && { to: '/admin/categories', label: t('adminNav.categories'), icon: 'tag' },
    can('moderation.manage') && { to: '/admin/avis', label: t('reviewsModeration.title'), icon: 'star' },
    can('events.validate') && { to: '/admin/demandes', label: t('adminNav.editRequests'), icon: 'edit', badge: pendingRequestsCount },
    can('support.view') && { to: '/admin/messages', label: t('adminNav.contactMessages'), icon: 'mail', badge: unreadMessagesCount },
    can('tickets.view') && { to: '/admin/billets', label: t('adminNav.tickets'), icon: 'ticket' },
    can('orders.view') && { to: '/admin/commandes', label: t('adminNav.orders'), icon: 'clipboard' },
    can('payments.view') && { to: '/admin/paiements', label: t('adminNav.payments'), icon: 'card' },
  ].filter(Boolean) as NavItem[]

  const groups: Array<{ label: string; items: NavItem[] }> = [
    {
      label: t('adminNav.overview'),
      items: [{ to: '/admin', label: t('adminNav.dashboard'), icon: 'grid' }],
    },
  ]

  if (managementItems.length) {
    groups.push({ label: t('adminNav.management'), items: managementItems })
  }

  // « Sécurité » (double authentification) est visible par TOUT admin : c'est un
  // réglage personnel, pas une permission — chaque admin protège son compte.
  const adminItems: NavItem[] = []
  if (can('admin.manage_admins', 'admin.manage_permissions')) {
    adminItems.push({ to: '/admin/administrateurs', label: t('adminNav.administrators'), icon: 'shield' })
  }
  if (can('audit.view')) adminItems.push({ to: '/admin/journal', label: t('auditLog.title'), icon: 'clock' })
  if (can('settings.manage')) adminItems.push({ to: '/admin/maintenance', label: t('adminNav.maintenance'), icon: 'wrench' })
  adminItems.push({ to: '/admin/securite', label: t('adminNav.security'), icon: 'lock' })
  groups.push({ label: t('adminNav.administration'), items: adminItems })

  return groups
})

const initials = computed(() => {
  const name = profile.value?.full_name?.trim()
  if (name) return name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  return user.value?.email?.slice(0, 2).toUpperCase() || 'AD'
})

const firstName = computed(() => {
  const name = profile.value?.full_name?.trim()
  if (name) return name.split(/\s+/)[0]
  return user.value?.email?.split('@')[0] || ''
})

function isActive(to: string) {
  return to === '/admin' ? route.path === '/admin' : route.path.startsWith(to)
}

// Aperçu du site pendant une maintenance (voir server/middleware/maintenance.ts) :
// posé tant qu'un admin est connecté, retiré à la déconnexion.
const maintBypass = useCookie('tikeo_maint_bypass', { sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8, secure: !import.meta.dev })
onMounted(() => {
  maintBypass.value = '1'
})

async function handleLogout() {
  maintBypass.value = null
  await signOut()
  router.push('/connexion')
}

// Titre du bandeau : l'entrée de menu correspondant exactement à la page.
// Sur une sous-page (ex. statistiques d'un événement) il n'y a pas de bandeau :
// la page garde son propre titre.
const heroItem = computed(() => {
  for (const g of navGroups.value) {
    const hit = g.items.find((i) => i.to === route.path || (i.to === '/admin' && route.path === '/admin/'))
    if (hit) return hit
  }
  return null
})

// Barre du bas (mobile) : jusqu'à 3 accès rapides autorisés pour ce rôle + « Menu » (ouvre le tiroir).
const bottomItems = computed(() => {
  const all = navGroups.value.flatMap((g) => g.items)
  const preferred = ['/admin', '/admin/messages', '/admin/evenements', '/admin/demandes', '/admin/commandes', '/admin/utilisateurs']
  const quick = preferred
    .map((to) => all.find((i) => i.to === to))
    .filter(Boolean)
    .slice(0, 3) as typeof all
  return [
    ...quick.map((i) => ({ to: i.to, label: i.label, icon: i.icon, active: isActive(i.to), badge: i.badge?.value || null })),
    { label: t('adminNav.menu'), icon: 'menu', action: true, active: sidebarOpen.value },
  ]
})

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
        <NuxtLink to="/admin" class="group flex items-center gap-3 px-4 pb-4 pt-5">
          <span class="flex h-11 items-center rounded-2xl bg-white px-3 shadow-lg shadow-black/20 transition-transform duration-300 group-hover:scale-[1.03]">
            <img src="/logo-babicho.png" alt="Babicho" class="h-7 w-auto" />
          </span>
          <span class="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#FFB066] ring-1 ring-white/15">{{ t('adminNav.badge') }}</span>
        </NuxtLink>

        <AdminNavList :groups="navGroups" />

        <div class="space-y-2 p-3">
          <NuxtLink to="/" class="group flex h-10 items-center gap-2.5 rounded-xl px-3 text-xs font-bold uppercase tracking-wider text-white/60 transition-colors hover:bg-white/10 hover:text-white">
            <AppIcon name="arrow-left" class="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
            {{ t('adminNav.backToSite').replace('← ', '') }}
          </NuxtLink>
          <div class="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-2.5 ring-1 ring-white/10">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF7A00] to-[#FF9A3D] text-sm font-bold text-[#0E2240]">{{ initials }}</span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-[13px] font-bold">{{ profile?.full_name || user?.email }}</p>
              <p class="truncate text-[11px] text-white/50">{{ t('adminNav.badge') }}</p>
            </div>
            <button type="button" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-tikeo-error hover:text-white" :aria-label="t('adminNav.logout')" :title="t('adminNav.logout')" @click="handleLogout">
              <AppIcon name="logout" class="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </div>
    </aside>

    <!-- ============ Tiroir (mobile) ============ -->
    <Transition name="org-fade">
      <button v-if="sidebarOpen" type="button" class="fixed inset-0 z-40 bg-[#050d1c]/70 backdrop-blur-sm md:hidden" :aria-label="t('adminNav.closeMenu')" @click="sidebarOpen = false" />
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
          <button type="button" class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition-colors active:bg-white/20" :aria-label="t('adminNav.closeMenu')" @click="sidebarOpen = false"><AppIcon name="close" class="h-5 w-5" /></button>
        </div>
        <div class="mx-3 mb-3 flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF7A00] to-[#FF9A3D] text-sm font-bold text-[#0E2240]">{{ initials }}</span>
          <div class="min-w-0">
            <p class="truncate text-sm font-bold">{{ profile?.full_name || user?.email }}</p>
            <p class="truncate text-xs text-white/50">{{ t('adminNav.badge') }}</p>
          </div>
        </div>

        <AdminNavList :groups="navGroups" large />

        <div class="grid grid-cols-2 gap-2 p-3">
          <NuxtLink to="/" class="flex h-11 items-center justify-center gap-2 rounded-xl bg-white/10 text-sm font-semibold transition-colors active:bg-white/20">
            <AppIcon name="home" class="h-[18px] w-[18px]" />{{ t('adminNav.backToSite').replace('← ', '') }}
          </NuxtLink>
          <button type="button" class="flex h-11 items-center justify-center gap-2 rounded-xl bg-tikeo-error/20 text-sm font-semibold text-[#FFB4B4] transition-colors active:bg-tikeo-error/40" @click="handleLogout">
            <AppIcon name="logout" class="h-[18px] w-[18px]" />{{ t('adminNav.logout') }}
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
              :aria-label="sidebarCollapsed ? t('adminNav.showSidebar') : t('adminNav.hideSidebar')"
              :title="(sidebarCollapsed ? t('adminNav.showSidebar') : t('adminNav.hideSidebar')) + ' (Ctrl+B)'"
              :aria-pressed="sidebarCollapsed"
              @click="toggleSidebar"
            >
              <AppIcon :name="sidebarCollapsed ? 'menu' : 'chevron-left'" class="h-5 w-5" :stroke="2.2" />
            </button>
            <button type="button" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0E2240] text-white shadow-md transition-transform active:scale-95 md:hidden" :aria-label="t('adminNav.openMenu')" @click="sidebarOpen = true"><AppIcon name="menu" class="h-5 w-5" /></button>
            <NuxtLink to="/admin" class="flex min-w-0 items-center gap-2" :class="sidebarCollapsed ? '' : 'md:hidden'" aria-label="Babicho">
              <img src="/logo-babicho.png" alt="Babicho" class="h-8 w-auto" />
            </NuxtLink>
            <div class="hidden min-w-0 items-center gap-2 text-sm md:flex">
              <span class="font-semibold text-tikeo-gray-text">{{ t('adminNav.badge') }}</span>
              <template v-if="heroItem">
                <AppIcon name="chevron-right" class="h-3.5 w-3.5 shrink-0 text-tikeo-gray-text/60" />
                <span class="truncate font-display font-extrabold text-tikeo-black">{{ heroItem.label }}</span>
              </template>
            </div>
          </div>
          <div class="flex items-center gap-1.5 md:gap-2">
            <ThemeToggle compact boxed />
            <LanguageSwitcher compact boxed />
            <span class="mx-1 hidden h-6 w-px bg-tikeo-border sm:block" aria-hidden="true" />
            <span class="hidden max-w-[12rem] truncate text-sm font-semibold text-tikeo-black xl:inline">{{ profile?.full_name || user?.email }}</span>
            <span class="hidden h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF7A00] to-[#FF9A3D] text-xs font-bold text-[#0E2240] sm:flex">{{ initials }}</span>
            <button
              type="button"
              class="org-icon-btn max-lg:!w-10 lg:!w-auto lg:gap-2 lg:px-3 text-xs font-bold hover:!border-tikeo-error hover:!bg-tikeo-error hover:!text-white"
              :aria-label="t('adminNav.logout')"
              @click="handleLogout"
            >
              <AppIcon name="logout" class="h-[18px] w-[18px]" />
              <span class="hidden lg:inline">{{ t('adminNav.logout') }}</span>
            </button>
          </div>
        </div>
      </header>

      <!-- Bandeau de page : titre de la rubrique ouverte -->
      <section v-if="heroItem" :key="heroItem.to" class="px-3 pt-4 md:px-6 md:pt-5">
        <div class="admin-hero org-rise relative isolate mx-auto max-w-[76rem] overflow-hidden rounded-3xl p-5 text-white md:p-8">
          <div class="pointer-events-none absolute -right-16 -top-20 -z-10 h-64 w-64 rounded-full bg-[#FF7A00]/35 blur-3xl" aria-hidden="true" />
          <div class="pointer-events-none absolute -bottom-24 left-1/3 -z-10 h-56 w-56 rounded-full bg-[#2D8CFF]/30 blur-3xl" aria-hidden="true" />
          <div class="admin-hero-dots pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
          <div class="flex items-center gap-4 md:gap-5">
            <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-[#FFB066] ring-1 ring-white/25 backdrop-blur md:h-16 md:w-16">
              <AppIcon :name="heroItem.icon" class="h-6 w-6 md:h-8 md:w-8" :stroke="1.9" />
            </span>
            <div class="min-w-0">
              <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60 md:text-xs">
                {{ route.path === '/admin' || route.path === '/admin/' ? t('adminNav.welcome', { name: firstName }) : t('adminNav.badge') }}
              </p>
              <p class="mt-1 break-words font-display text-2xl font-extrabold leading-tight tracking-tight md:text-4xl" role="presentation">{{ heroItem.label }}</p>
            </div>
          </div>
        </div>
      </section>

      <main class="admin-main flex-1 max-md:pb-28" :class="heroItem ? 'has-hero' : ''">
        <slot />
      </main>

      <ConfirmDeleteModal :open="confirmState.open" :title="confirmState.title" :message="confirmState.message" :confirm-label="confirmState.confirmLabel" @confirm="answerConfirm(true)" @cancel="answerConfirm(false)" />

      <footer class="px-4 pb-4 pt-2 text-center text-xs text-tikeo-gray-text max-md:mb-20 md:px-8">
        © {{ new Date().getFullYear() }} Babicho — {{ t('adminNav.footer') }}
      </footer>
    </div>

    <!-- ============ Barre du bas (mobile) ============ -->
    <DashBottomNav rounded :items="bottomItems" :aria-label="t('adminNav.badge')" @action="sidebarOpen = true" />
  </div>
</template>
