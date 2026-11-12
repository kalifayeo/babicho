<script setup lang="ts">
const { t, locale, locales, setLocale } = useI18n()
const { isAuthenticated, profile, signOut, user } = useAuth()
// Compteurs en direct : mis à jour tout seuls (état partagé + Supabase Realtime).
const { unreadCount } = useMyNotifications()
const { favoritesCount } = useFavorites()
const { name: brandName, onDarkOk: logoOnDarkOk } = useSiteBranding()

function badgeText(n: number) {
  return n > 99 ? '99+' : String(n)
}
const router = useRouter()
const route = useRoute()

const searchQuery = ref('')
const accountOpen = ref(false) // menu déroulant du compte (desktop)
const plusOpen = ref(false) // menu « Plus » (desktop)
const drawerOpen = ref(false) // tiroir de navigation (mobile)
const searchOpen = ref(false) // fenêtre de recherche (desktop et mobile)
const searchInput = ref<HTMLInputElement | null>(null)

// Suggestions de recherche (nom d'événement, ville, organisateur/artiste),
// triées par date la plus proche — voir composables/useEventSearch.ts.
const { results: suggestions, loading: suggestLoading, search: runSuggestSearch } = useEventSearch()
const showSuggestions = ref(false)
let suggestDebounce: ReturnType<typeof setTimeout> | null = null

watch(searchQuery, (val) => {
  if (suggestDebounce) clearTimeout(suggestDebounce)
  const term = val.trim()
  if (!term) {
    showSuggestions.value = false
    return
  }
  suggestDebounce = setTimeout(async () => {
    await runSuggestSearch(term, { sortBy: 'date_asc', limit: 6 })
    showSuggestions.value = true
  }, 250)
})

function submitSearch() {
  showSuggestions.value = false
  searchOpen.value = false
  router.push({ path: '/recherche', query: searchQuery.value ? { q: searchQuery.value } : {} })
}

function goToSuggestion(slug: string) {
  showSuggestions.value = false
  searchOpen.value = false
  searchQuery.value = ''
  router.push(`/e/${slug}`)
}

watch(searchOpen, async (open) => {
  if (!open) return
  await nextTick()
  searchInput.value?.focus()
})

// Le tiroir et la recherche mobile se referment à chaque navigation.
watch(
  () => route.fullPath,
  () => {
    drawerOpen.value = false
    searchOpen.value = false
    accountOpen.value = false
    plusOpen.value = false
    showSuggestions.value = false
    hidden.value = false
  }
)

// Le tiroir bloque le défilement de la page derrière lui.
watch(drawerOpen, (open) => {
  if (import.meta.client) document.body.style.overflow = open || searchOpen.value ? 'hidden' : ''
})

async function handleLogout() {
  drawerOpen.value = false
  accountOpen.value = false
  await signOut()
}

// --- Langue (segmenté dans le tiroir mobile) ---
const localeList = computed(() => locales.value as Array<{ code: string; name: string }>)
async function chooseLocale(code: string) {
  try {
    await setLocale(code as any)
  } catch (e) {
    console.error('[i18n] Impossible de charger la langue', code, e)
  }
}

const initials = computed(() => {
  const name = profile.value?.full_name?.trim()
  if (name) {
    return name
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }
  const email = user.value?.email
  if (email) return email.slice(0, 2).toUpperCase()
  return '??'
})

const firstName = computed(() => profile.value?.full_name?.split(' ')[0] || user.value?.email?.split('@')[0] || '')

const roleLabels = computed<Record<string, string>>(() => ({
  organizer: t('header.organizer'),
  agent: t('header.agentRole'),
  admin: t('header.adminRole'),
  buyer: '',
  visitor: '',
}))
const roleLabel = computed(() => roleLabels.value[profile.value?.role ?? ''] ?? '')

// Le lien « Tableau de bord » pointe toujours vers l'espace acheteur ; l'accès
// à l'administration ou à l'espace organisateur passe par des liens dédiés.
const dashboardPath = '/mon-espace/tableau-de-bord'
const isAdmin = computed(() => profile.value?.role === 'admin')

const accountLinks = computed(() => [
  { to: dashboardPath, label: t('header.dashboard'), icon: 'dashboard' },
  { to: '/mon-espace/mes-billets', label: t('header.myTickets'), icon: 'ticket' },
  { to: '/mon-espace/mes-favoris', label: t('header.favorites'), icon: 'heart', badge: favoritesCount.value },
  { to: '/organisateur/evenements', label: t('header.myEvents'), icon: 'calendar' },
  { to: '/mon-espace/portefeuille', label: t('header.wallet'), icon: 'wallet' },
])
const generalLinks = computed(() => [
  { to: '/evenements', label: t('footer.allEvents'), icon: 'compass' },
  { to: '/organisateur/tarifs', label: t('header.pricing'), icon: 'tag' },
  { to: '/faq', label: t('header.faq'), icon: 'help' },
  { to: '/qui-sommes-nous', label: t('header.about'), icon: 'info' },
  { to: '/blog', label: t('blog.navLabel'), icon: 'newspaper' },
  { to: '/presse', label: t('press.navLabel'), icon: 'mic' },
  { to: '/partenaires', label: t('partners.navLabel'), icon: 'handshake' },
  { to: '/contact', label: t('header.contact2'), icon: 'mail' },
])
const quickLinks = computed(() => [
  { to: '/mon-espace/mes-billets', label: t('header.myTickets'), icon: 'ticket' },
  { to: '/mon-espace/mes-favoris', label: t('header.favorites'), icon: 'heart', badge: favoritesCount.value },
  { to: '/mon-espace/portefeuille', label: t('header.wallet'), icon: 'wallet' },
  { to: '/mon-espace/notifications', label: t('header.notifications'), icon: 'bell', badge: unreadCount.value },
])

// Liens de navigation directs (desktop large) avec l'état « page active ».
const navLinks = computed(() => [
  { to: '/evenements', label: t('nav.explore'), tour: undefined as string | undefined },
  { to: '/organisateur/tarifs', label: t('header.pricing'), tour: 'pricing' },
  { to: '/blog', label: t('blog.navLabel'), tour: undefined },
  { to: '/faq', label: t('header.faq'), tour: undefined },
])
const moreLinks = computed(() => [
  { to: '/qui-sommes-nous', label: t('header.about'), icon: 'info' },
  { to: '/presse', label: t('press.navLabel'), icon: 'mic' },
  { to: '/partenaires', label: t('partners.navLabel'), icon: 'handshake' },
  { to: '/contact', label: t('header.contact2'), icon: 'mail' },
])
// Villes proposées en raccourci dans la fenêtre de recherche.
const quickCities = ['Abidjan', 'Bouaké', 'Yamoussoukro', 'San-Pédro']
function searchCity(city: string) {
  searchOpen.value = false
  router.push({ path: '/recherche', query: { q: city } })
}
function isActive(to: string) {
  return route.path === to || route.path.startsWith(`${to}/`)
}


// Accueil : l'en-tête est translucide sur la bannière sombre. Ailleurs (fond clair) il est toujours « plein ».
const isHome = computed(() => route.path === '/')

// --- Comportement au défilement -------------------------------------------
// Plein (verre clair/sombre) après quelques pixels ; se range en descendant, revient en remontant.
const scrolled = ref(false)
const hidden = ref(false)
const solid = computed(() => scrolled.value || !isHome.value)
let lastY = 0
function handleScroll() {
  const y = window.scrollY
  scrolled.value = y > 40
  const busy = accountOpen.value || plusOpen.value || drawerOpen.value || searchOpen.value
  if (!busy) {
    if (y > lastY + 6 && y > 260) hidden.value = true
    else if (y < lastY - 6 || y <= 260) hidden.value = false
  }
  lastY = y
}

// --- Pastille qui suit le survol dans la navigation ----------------------
const navEl = ref<HTMLElement | null>(null)
const ind = reactive({ left: 0, width: 0, show: false })
function moveInd(el: HTMLElement | null) {
  if (!el) {
    ind.show = false
    return
  }
  ind.left = el.offsetLeft
  ind.width = el.offsetWidth
  ind.show = true
}
function onNavEnter(e: Event) {
  moveInd(e.currentTarget as HTMLElement)
}
function resetInd() {
  moveInd(navEl.value?.querySelector<HTMLElement>('[data-active="true"]') ?? null)
}
watch(() => route.path, () => nextTick(resetInd))

function closePops() {
  accountOpen.value = false
  plusOpen.value = false
}
function openSearch() {
  closePops()
  drawerOpen.value = false
  searchOpen.value = true
}
function closeSearch() {
  searchOpen.value = false
  showSuggestions.value = false
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    closePops()
    closeSearch()
    return
  }
  const el = document.activeElement as HTMLElement | null
  const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
  if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
    e.preventDefault()
    openSearch()
  }
}

watch(searchOpen, (open) => {
  if (import.meta.client) document.body.style.overflow = open || drawerOpen.value ? 'hidden' : ''
})

onMounted(() => {
  lastY = window.scrollY
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('resize', resetInd)
  window.addEventListener('keydown', onKey)
  handleScroll()
  nextTick(resetInd)
  if (document.fonts?.ready) document.fonts.ready.then(resetInd)
})
onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('resize', resetInd)
  window.removeEventListener('keydown', onKey)
  if (suggestDebounce) clearTimeout(suggestDebounce)
  document.body.style.overflow = ''
})
</script>


<template>
  <header class="hd" :class="{ 'hd-solid': solid, 'hd-hidden': hidden }">
    <div class="hd-pill">
      <NuxtLink to="/" class="hd-brand" :aria-label="brandName + ' — ' + t('nav.home')">
        <SiteLogo eager :on-dark="!solid && logoOnDarkOk" size-class="h-8 sm:h-9" />
      </NuxtLink>

      <!-- ============== NAVIGATION (ordinateur) ============== -->
      <nav ref="navEl" class="hd-nav" :aria-label="t('header.menu')" @mouseleave="resetInd">
        <span class="hd-ind" :style="{ left: ind.left + 'px', width: ind.width + 'px', opacity: ind.show ? 1 : 0 }" aria-hidden="true" />
        <NuxtLink
          v-for="l in navLinks"
          :key="l.to"
          :to="l.to"
          :data-tour="l.tour"
          :data-active="isActive(l.to)"
          class="hd-lnk"
          :class="{ 'hd-on': isActive(l.to) }"
          @mouseenter="onNavEnter"
          @focus="onNavEnter"
        >
          {{ l.label }}<i class="hd-dot" aria-hidden="true" />
        </NuxtLink>

        <div class="hd-plus" @mouseenter="onNavEnter">
          <button type="button" class="hd-lnk" :aria-expanded="plusOpen" aria-haspopup="true" @click="plusOpen = !plusOpen; accountOpen = false">
            {{ t('header.more') }}
            <AppIcon name="chevron-down" class="hd-chev" :class="{ 'hd-chev-up': plusOpen }" :stroke="2.2" />
          </button>
          <Transition name="hd-pop">
            <div v-if="plusOpen" class="hd-pop" role="menu">
              <NuxtLink v-for="l in moreLinks" :key="l.to" :to="l.to" class="hd-row" role="menuitem">
                <span class="hd-ri"><AppIcon :name="l.icon" class="h-[18px] w-[18px]" /></span>{{ l.label }}
              </NuxtLink>
              <div class="hd-hr" />
              <div class="hd-langs" role="group" :aria-label="t('header.languageLabel')" data-tour="language">
                <button v-for="l in localeList" :key="l.code" type="button" :aria-pressed="locale === l.code" :title="l.name" @click="chooseLocale(l.code)">{{ l.code }}</button>
              </div>
            </div>
          </Transition>
        </div>
      </nav>

      <!-- ============== ACTIONS ============== -->
      <div class="hd-actions">
        <button type="button" class="hd-srch" data-tour="search" :aria-label="t('header.search')" @click="openSearch">
          <AppIcon name="search" class="h-[18px] w-[18px]" />
          <span>{{ t('header.searchPlaceholder') }}</span>
          <kbd>/</kbd>
        </button>
        <button type="button" class="hd-ibtn hd-srch-i" data-tour="search" :aria-label="t('header.search')" @click="openSearch">
          <AppIcon name="search" class="h-[21px] w-[21px]" />
        </button>

        <span class="hidden items-center lg:inline-flex" data-tour="theme"><ThemeToggle compact class="hd-theme" /></span>

        <template v-if="isAuthenticated">
          <NuxtLink to="/mon-espace/mes-favoris" data-tour="favorites" class="hd-ibtn hd-desk" :aria-label="t('header.favorites') + (favoritesCount > 0 ? ` (${favoritesCount})` : '')" :title="t('header.favorites')">
            <AppIcon name="heart" class="h-[21px] w-[21px]" />
            <span v-if="favoritesCount > 0" :key="favoritesCount" class="hd-badge badge-pop" aria-hidden="true">{{ badgeText(favoritesCount) }}</span>
          </NuxtLink>
          <NuxtLink to="/mon-espace/notifications" data-tour="notifications" class="hd-ibtn" :aria-label="t('header.notifications') + (unreadCount > 0 ? ` (${unreadCount})` : '')" :title="t('header.notifications')">
            <AppIcon name="bell" class="h-[21px] w-[21px]" />
            <span v-if="unreadCount > 0" :key="unreadCount" class="hd-badge badge-pop" aria-hidden="true">{{ badgeText(unreadCount) }}</span>
          </NuxtLink>
        </template>

        <span class="hd-sep" aria-hidden="true" />

        <NuxtLink v-if="!isAuthenticated" to="/connexion" class="hd-login">{{ t('header.login') }}</NuxtLink>

        <NuxtLink to="/organisateur/evenements/nouveau" data-tour="publish" class="hd-cta" :aria-label="t('header.publish')">
          <AppIcon name="plus" class="h-[18px] w-[18px]" :stroke="2.4" />
          <span class="hd-cta-t">{{ t('header.publish') }}</span>
        </NuxtLink>

        <!-- Compte (ordinateur, connecté) -->
        <div v-if="isAuthenticated" class="hd-acc">
          <button type="button" data-tour="account" class="hd-avatar-btn" :aria-label="t('header.myAccount')" :aria-expanded="accountOpen" aria-haspopup="true" @click="accountOpen = !accountOpen; plusOpen = false">
            <UserAvatar :avatar-url="profile?.avatar_url" :initials="initials" size-class="h-[2.625rem] w-[2.625rem]" text-class="text-sm" />
          </button>
          <Transition name="hd-pop">
            <div v-if="accountOpen" class="hd-pop hd-pop-r" role="menu">
              <div class="hd-who">
                <UserAvatar :avatar-url="profile?.avatar_url" :initials="initials" size-class="h-11 w-11" text-class="text-sm" />
                <div class="min-w-0">
                  <b class="block truncate">{{ profile?.full_name || t('header.myAccount') }}</b>
                  <span class="block truncate">{{ user?.email }}</span>
                  <em v-if="roleLabel" class="hd-role">{{ roleLabel }}</em>
                </div>
              </div>
              <div class="hd-hr" />
              <NuxtLink v-if="isAdmin" to="/admin" class="hd-row" role="menuitem"><span class="hd-ri hd-ri-or"><AppIcon name="shield" class="h-[18px] w-[18px]" /></span>{{ t('header.administration') }}</NuxtLink>
              <NuxtLink v-for="l in accountLinks" :key="l.to" :to="l.to" class="hd-row" role="menuitem">
                <span class="hd-ri"><AppIcon :name="l.icon" class="h-[18px] w-[18px]" /></span>
                <span class="flex-1">{{ l.label }}</span>
                <span v-if="l.badge" class="hd-count">{{ badgeText(l.badge) }}</span>
              </NuxtLink>
              <div class="hd-hr" />
              <button type="button" class="hd-row hd-danger" role="menuitem" @click="handleLogout">
                <span class="hd-ri hd-ri-red"><AppIcon name="logout" class="h-[18px] w-[18px]" /></span>{{ t('header.logout') }}
              </button>
            </div>
          </Transition>
        </div>

        <!-- Menu (mobile et tablette) -->
        <button type="button" data-tour="account" class="hd-ibtn hd-burger" :aria-label="t('header.menu')" :aria-expanded="drawerOpen" aria-haspopup="dialog" @click="drawerOpen = true">
          <i /><i /><i />
        </button>
      </div>
    </div>

    <!-- Ferme les menus « Plus » / compte au clic à côté -->
    <Teleport to="body">
      <button v-if="plusOpen || accountOpen" type="button" class="fixed inset-0 z-[49] cursor-default" tabindex="-1" aria-hidden="true" @click="closePops" />
    </Teleport>

    <!-- ============== RECHERCHE (fenêtre, ordinateur et mobile) ============== -->
    <Teleport to="body">
      <Transition name="hd-fade">
        <div v-if="searchOpen" class="hd-scrim" aria-hidden="true" @click="closeSearch" />
      </Transition>
      <Transition name="hd-palette">
        <div v-if="searchOpen" class="hd-palette" role="dialog" aria-modal="true" :aria-label="t('header.search')">
          <form class="hd-p-in" @submit.prevent="submitSearch">
            <AppIcon name="search" class="h-5 w-5 shrink-0" />
            <input
              ref="searchInput"
              v-model="searchQuery"
              type="search"
              enterkeyhint="search"
              autocomplete="off"
              :placeholder="t('header.searchPlaceholder')"
              :aria-label="t('header.searchPlaceholder')"
            />
            <button type="button" class="hd-p-x" :aria-label="t('common.close')" @click="closeSearch"><AppIcon name="close" class="h-5 w-5" :stroke="2.2" /></button>
          </form>
          <div v-if="searchQuery.trim()" class="hd-p-res">
            <SearchSuggestions :suggestions="suggestions" :loading="suggestLoading" @select="goToSuggestion" @all="submitSearch" />
          </div>
          <div v-else class="hd-p-chips">
            <button v-for="c in quickCities" :key="c" type="button" @click="searchCity(c)">
              <AppIcon name="pin" class="h-4 w-4" />{{ c }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Panneau de menu (mobile ET ordinateur) : s'ouvre depuis la droite, fond clair.
         Teleport indispensable : le <header> a une transformation CSS (translate-y
         pour l'effet montre/cache au scroll), ce qui en fait un « containing block »
         pour tout descendant en position fixed. Teleport le sort jusqu'au <body>. -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200 ease-out"
        leave-active-class="transition-opacity duration-150 ease-in"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div v-if="drawerOpen" class="fixed inset-0 z-[60] bg-tikeo-ink/40 backdrop-blur-sm" aria-hidden="true" @click="drawerOpen = false" />
      </Transition>

      <Transition
        enter-active-class="transition duration-300 ease-out"
        leave-active-class="transition duration-200 ease-in"
        enter-from-class="translate-x-full opacity-0"
        leave-to-class="translate-x-full opacity-0"
      >
        <aside v-if="drawerOpen" class="fixed inset-y-0 right-0 z-[61] flex w-[92vw] max-w-[400px] flex-col overflow-hidden rounded-l-3xl bg-tikeo-surface shadow-2xl" role="dialog" aria-modal="true" :aria-label="t('header.menu')">
          <!-- Haut : logo + fermer -->
          <div class="flex shrink-0 items-center justify-between gap-3 px-5 pb-3 pt-[calc(env(safe-area-inset-top,0px)+1rem)]">
            <NuxtLink to="/" class="flex min-w-0 items-center" :aria-label="brandName + ' — ' + t('nav.home')" @click="drawerOpen = false">
              <SiteLogo />
            </NuxtLink>
            <button type="button" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tikeo-surface-alt text-tikeo-black transition-colors hover:bg-tikeo-border" :aria-label="t('header.closeMenu')" @click="drawerOpen = false">
              <AppIcon name="close" class="h-5 w-5" :stroke="2.2" />
            </button>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]">
            <!-- Identité du visiteur -->
            <div v-if="isAuthenticated" class="flex items-center gap-3.5 rounded-2xl bg-tikeo-surface-alt p-4">
              <UserAvatar :avatar-url="profile?.avatar_url" :initials="initials" size-class="h-14 w-14" text-class="text-lg" />
              <div class="min-w-0">
                <p class="truncate font-display text-base font-extrabold leading-tight text-tikeo-black">{{ profile?.full_name || t('header.myAccount') }}</p>
                <p class="truncate text-sm text-tikeo-gray-text">{{ user?.email }}</p>
                <span v-if="roleLabel" class="mt-1.5 inline-block rounded-full bg-tikeo-black/10 px-2.5 py-0.5 text-[11px] font-bold text-tikeo-black">{{ roleLabel }}</span>
              </div>
            </div>
            <div v-else class="rounded-2xl border border-tikeo-border bg-tikeo-surface-alt p-4">
              <p class="font-display text-xl font-extrabold leading-tight text-tikeo-black">{{ t('header.welcomeTitle') }}</p>
              <p class="mt-1.5 text-sm leading-relaxed text-tikeo-gray-text">{{ t('header.welcomeText') }}</p>
              <div class="mt-4 grid grid-cols-2 gap-2.5">
                <NuxtLink to="/connexion" class="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#FF7A00] text-sm font-bold text-tikeo-ink shadow-sm transition-colors hover:bg-[#FF8F26]">
                  <AppIcon name="login" class="h-[18px] w-[18px]" :stroke="2" />{{ t('header.login') }}
                </NuxtLink>
                <NuxtLink to="/inscription" class="flex h-11 items-center justify-center gap-2 rounded-xl border border-tikeo-border bg-tikeo-surface text-sm font-bold text-tikeo-black transition-colors hover:bg-tikeo-surface-alt">
                  <AppIcon name="user-plus" class="h-[18px] w-[18px]" :stroke="2" />{{ t('header.register') }}
                </NuxtLink>
              </div>
            </div>

            <!-- Accès rapide (connecté) -->
            <div v-if="isAuthenticated" class="mt-3 grid grid-cols-2 gap-2.5">
              <NuxtLink
                v-for="l in quickLinks"
                :key="l.to"
                :to="l.to"
                class="flex items-center gap-3 rounded-2xl border border-tikeo-border bg-tikeo-surface p-3 transition-colors hover:bg-tikeo-surface-alt"
              >
                <span class="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tikeo-surface-alt text-tikeo-black">
                  <AppIcon :name="l.icon" class="h-5 w-5" />
                  <span v-if="l.badge" :key="l.badge" class="badge-pop absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#FF7A00] px-1 text-[10px] font-bold leading-none text-tikeo-ink ring-2 ring-tikeo-surface">{{ badgeText(l.badge) }}</span>
                </span>
                <span class="min-w-0 text-sm font-bold leading-tight text-tikeo-black">{{ l.label }}</span>
              </NuxtLink>
            </div>

            <!-- Publier -->
            <NuxtLink to="/organisateur/evenements/nouveau" class="mt-3 flex items-center gap-3.5 rounded-2xl bg-tikeo-ink p-4 text-white shadow-sm transition-colors hover:bg-tikeo-ink-soft">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF7A00] text-tikeo-ink"><AppIcon name="plus" class="h-5 w-5" :stroke="2.4" /></span>
              <span class="min-w-0 flex-1">
                <span class="block font-display text-base font-extrabold leading-tight">{{ t('header.publish') }}</span>
                <span class="block text-xs font-medium text-white/70">{{ t('header.publishHint') }}</span>
              </span>
              <AppIcon name="arrow-right" class="h-5 w-5 shrink-0" :stroke="2.2" />
            </NuxtLink>

            <!-- Navigation -->
            <nav class="mt-4">
              <p class="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-tikeo-gray-text">{{ t('header.menuSectionGeneral') }}</p>
              <NuxtLink v-if="isAuthenticated && isAdmin" to="/admin" class="drawer-row !text-[rgb(var(--tikeo-orange-strong))]">
                <span class="drawer-icon !bg-[#FF7A00]/10 !text-[rgb(var(--tikeo-orange-strong))]"><AppIcon name="shield" class="h-5 w-5" /></span>
                <span class="flex-1">{{ t('header.administration') }}</span>
                <AppIcon name="chevron-right" class="h-4 w-4 text-tikeo-gray-text" :stroke="2.2" />
              </NuxtLink>
              <template v-if="isAuthenticated">
                <NuxtLink :to="dashboardPath" class="drawer-row">
                  <span class="drawer-icon"><AppIcon name="dashboard" class="h-5 w-5" /></span>
                  <span class="flex-1">{{ t('header.dashboard') }}</span>
                  <AppIcon name="chevron-right" class="h-4 w-4 text-tikeo-gray-text" :stroke="2.2" />
                </NuxtLink>
                <NuxtLink to="/organisateur/evenements" class="drawer-row">
                  <span class="drawer-icon"><AppIcon name="calendar" class="h-5 w-5" /></span>
                  <span class="flex-1">{{ t('header.myEvents') }}</span>
                  <AppIcon name="chevron-right" class="h-4 w-4 text-tikeo-gray-text" :stroke="2.2" />
                </NuxtLink>
              </template>
              <NuxtLink v-for="l in generalLinks" :key="l.to" :to="l.to" class="drawer-row">
                <span class="drawer-icon"><AppIcon :name="l.icon" class="h-5 w-5" /></span>
                <span class="flex-1">{{ l.label }}</span>
                <AppIcon name="chevron-right" class="h-4 w-4 text-tikeo-gray-text" :stroke="2.2" />
              </NuxtLink>
            </nav>

            <!-- Préférences : thème + langue -->
            <div class="mt-4 space-y-3 rounded-2xl border border-tikeo-border p-4">
              <div class="flex items-center justify-between gap-3">
                <p class="text-sm font-bold text-tikeo-black">{{ t('header.appearance') }}</p>
                <span class="inline-flex" data-tour="theme"><ThemeToggle /></span>
              </div>
              <div class="border-t border-tikeo-border pt-3">
                <p class="mb-2 text-sm font-bold text-tikeo-black">{{ t('header.languageLabel') }}</p>
                <div class="grid grid-cols-4 gap-1.5" role="group" :aria-label="t('header.languageLabel')" data-tour="language">
                  <button
                    v-for="l in localeList"
                    :key="l.code"
                    type="button"
                    class="h-10 rounded-xl border text-sm font-bold uppercase transition-colors"
                    :class="locale === l.code ? 'border-tikeo-ink bg-tikeo-ink text-white dark:border-[#FF7A00] dark:bg-[#FF7A00] dark:text-tikeo-ink' : 'border-tikeo-border text-tikeo-gray-text hover:bg-tikeo-surface-alt'"
                    :aria-pressed="locale === l.code"
                    :title="l.name"
                    @click="chooseLocale(l.code)"
                  >
                    {{ l.code }}
                  </button>
                </div>
              </div>
            </div>

            <button v-if="isAuthenticated" type="button" class="drawer-row mt-2 w-full text-left !text-tikeo-error" @click="handleLogout">
              <span class="drawer-icon !bg-tikeo-error/10 !text-tikeo-error"><AppIcon name="logout" class="h-5 w-5" /></span>
              <span class="flex-1">{{ t('header.logout') }}</span>
            </button>
          </div>
        </aside>
      </Transition>
    </Teleport>

</header>
</template>

<style scoped>
/* Capsule flottante en verre dépoli. Au sommet de l'accueil elle est translucide sur la bannière
   sombre ; dès qu'on défile (et sur toutes les autres pages) elle devient claire / sombre selon le thème. */
:global(:root) { --hd-hov: rgba(14, 34, 64, 0.07); --hd-glass: rgba(255, 255, 255, 0.86); --hd-shadow: 0 18px 40px -16px rgba(14, 34, 64, 0.35); }
:global(.dark) { --hd-hov: rgba(255, 255, 255, 0.09); --hd-glass: rgba(26, 28, 34, 0.84); --hd-shadow: 0 18px 40px -16px rgba(0, 0, 0, 0.7); }

.hd {
  --hfg: #fff;
  --hmut: rgba(255, 255, 255, 0.76);
  --hbg: rgba(14, 34, 64, 0.4);
  --hbd: rgba(255, 255, 255, 0.18);
  --hhov: rgba(255, 255, 255, 0.14);
  position: fixed;
  z-index: 50;
  left: 0;
  right: 0;
  top: calc(env(safe-area-inset-top, 0px) + 10px);
  display: flex;
  justify-content: center;
  padding-left: max(10px, env(safe-area-inset-left, 0px));
  padding-right: max(10px, env(safe-area-inset-right, 0px));
  pointer-events: none;
  transition: transform 0.4s var(--ease-tikeo);
}
.hd-solid {
  --hfg: rgb(var(--tikeo-text-primary));
  --hmut: rgb(var(--tikeo-text-secondary));
  --hbg: var(--hd-glass);
  --hbd: rgb(var(--tikeo-border));
  --hhov: var(--hd-hov);
}
.hd-hidden { transform: translateY(calc(-100% - 24px)); }
.hd-pill {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  max-width: 1240px;
  height: 56px;
  padding: 0 8px 0 16px;
  border-radius: 999px;
  color: var(--hfg);
  background: var(--hbg);
  border: 1px solid var(--hbd);
  -webkit-backdrop-filter: blur(18px) saturate(1.5);
  backdrop-filter: blur(18px) saturate(1.5);
  transition: background-color 0.3s, border-color 0.3s, box-shadow 0.3s, max-width 0.4s var(--ease-tikeo), height 0.3s;
}
.hd-solid .hd-pill { box-shadow: var(--hd-shadow); }
@media (min-width: 1024px) {
  .hd { top: calc(env(safe-area-inset-top, 0px) + 12px); }
  .hd-pill { height: 64px; padding-left: 22px; }
  .hd-solid .hd-pill { max-width: 1180px; height: 58px; }
}
.hd-brand { display: flex; align-items: center; flex: none; }

/* Navigation */
.hd-nav { display: none; position: relative; align-items: center; gap: 2px; margin-left: 18px; }
@media (min-width: 1024px) { .hd-nav { display: flex; } }
.hd-ind {
  position: absolute; top: 50%; height: 40px; margin-top: -20px; border-radius: 999px; background: var(--hhov); pointer-events: none;
  transition: left 0.3s var(--ease-tikeo), width 0.3s var(--ease-tikeo), opacity 0.2s;
}
.hd-lnk {
  position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 6px; height: 40px; padding: 0 14px; border-radius: 999px;
  font-size: 14.5px; font-weight: 600; color: var(--hmut); transition: color 0.2s;
}
.hd-lnk:hover, .hd-lnk:focus-visible, .hd-on, .hd-lnk[aria-expanded='true'] { color: var(--hfg); }
.hd-dot { position: absolute; left: 50%; bottom: 3px; width: 4px; height: 4px; margin-left: -2px; border-radius: 50%; background: #ff7a00; opacity: 0; }
.hd-on .hd-dot { opacity: 1; }
.hd-plus { position: relative; }
.hd-chev { width: 14px; height: 14px; transition: transform 0.25s; }
.hd-chev-up { transform: rotate(180deg); }

/* Actions */
.hd-actions { margin-left: auto; display: flex; align-items: center; gap: 4px; }
.hd-ibtn {
  position: relative; display: inline-flex; align-items: center; justify-content: center; width: 42px; height: 42px; border-radius: 999px;
  color: var(--hmut); transition: background-color 0.2s, color 0.2s;
}
.hd-ibtn:hover { background: var(--hhov); color: var(--hfg); }
.hd-desk { display: none; }
@media (min-width: 1024px) { .hd-desk { display: inline-flex; } }
.hd-badge {
  position: absolute; top: 2px; right: 1px; display: grid; place-items: center; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px;
  background: #ff7a00; color: #0e2240; font-size: 10px; font-weight: 700; line-height: 1; pointer-events: none;
}
.hd-theme { --tw-ring-color: transparent; border-color: transparent !important; background: transparent !important; color: var(--hmut) !important; width: 42px !important; height: 42px !important; }
.hd-theme:hover { background: var(--hhov) !important; color: var(--hfg) !important; }
.hd-srch {
  display: none; align-items: center; gap: 10px; height: 42px; flex: 0 1 220px; min-width: 0; margin-right: 4px; padding: 0 8px 0 14px;
  border-radius: 999px; background: var(--hhov); color: var(--hmut); font-size: 14px; transition: color 0.2s;
}
.hd-srch:hover { color: var(--hfg); }
.hd-srch span { flex: 1; min-width: 0; overflow: hidden; text-align: left; text-overflow: ellipsis; white-space: nowrap; }
.hd-srch kbd { flex: none; padding: 2px 7px; border-radius: 7px; border: 1px solid var(--hbd); font: 700 11px/1.4 inherit; }
@media (min-width: 1160px) { .hd-srch { display: flex; } .hd-srch-i { display: none; } }
.hd-sep { display: none; width: 1px; height: 22px; margin: 0 6px; background: var(--hbd); }
.hd-login { display: none; align-items: center; height: 42px; padding: 0 16px; border-radius: 999px; font-size: 14.5px; font-weight: 600; color: var(--hfg); transition: background-color 0.2s; }
.hd-login:hover { background: var(--hhov); }
@media (min-width: 1024px) { .hd-sep { display: block; } .hd-login { display: inline-flex; } }
.hd-cta {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 42px; height: 42px; border-radius: 999px; white-space: nowrap;
  background: #ff7a00; color: #0e2240; font-size: 14.5px; font-weight: 700; box-shadow: 0 6px 18px -6px rgba(255, 122, 0, 0.7);
  transition: background-color 0.2s, transform 0.2s;
}
.hd-cta:hover { background: #ff8f26; transform: translateY(-1px); }
.hd-cta-t { display: none; }
@media (min-width: 1160px) { .hd-cta { width: auto; height: 44px; padding: 0 18px 0 14px; } .hd-cta-t { display: inline; } }
@media (min-width: 1024px) and (max-width: 1159px) { .hd-cta { width: 44px; height: 44px; } }
.hd-acc { position: relative; display: none; margin-left: 4px; }
@media (min-width: 1024px) { .hd-acc { display: block; } }
.hd-avatar-btn { display: block; border-radius: 999px; box-shadow: 0 0 0 2px var(--hbd); transition: box-shadow 0.2s; }
.hd-avatar-btn:hover { box-shadow: 0 0 0 2px #ff7a00; }
.hd-burger { flex-direction: column; gap: 5px; margin-left: 2px; color: var(--hfg); }
.hd-burger i { display: block; width: 18px; height: 2px; border-radius: 2px; background: currentColor; }
.hd-burger i:nth-child(2) { width: 12px; align-self: flex-end; margin-right: 12px; transition: width 0.2s, margin 0.2s; }
.hd-burger:hover i:nth-child(2) { width: 18px; margin-right: 0; }
@media (min-width: 1024px) { .hd-burger { display: none; } }

/* Menus déroulants */
.hd-pop {
  position: absolute; top: calc(100% + 12px); left: 0; z-index: 5; min-width: 270px; padding: 8px; border-radius: 22px;
  background: rgb(var(--tikeo-surface)); color: rgb(var(--tikeo-text-primary)); border: 1px solid rgb(var(--tikeo-border)); box-shadow: var(--hd-shadow);
  transform-origin: top;
}
.hd-pop-r { left: auto; right: 0; min-width: 290px; }
.hd-pop-enter-active, .hd-pop-leave-active { transition: opacity 0.2s, transform 0.25s var(--ease-tikeo); }
.hd-pop-enter-from, .hd-pop-leave-to { opacity: 0; transform: translateY(-6px) scale(0.98); }
.hd-row { display: flex; align-items: center; gap: 12px; width: 100%; padding: 9px 10px; border-radius: 14px; font-size: 14.5px; font-weight: 600; text-align: left; transition: background-color 0.15s; }
.hd-row:hover { background: var(--hd-hov); }
.hd-ri { display: grid; place-items: center; flex: none; width: 34px; height: 34px; border-radius: 11px; background: rgb(var(--tikeo-surface-alt)); color: rgb(var(--tikeo-text-secondary)); }
.hd-ri-or { background: rgba(255, 122, 0, 0.12); color: rgb(var(--tikeo-orange-strong)); }
.hd-ri-red { background: rgba(220, 38, 38, 0.1); color: #dc2626; }
.hd-danger { color: #dc2626; }
.hd-hr { height: 1px; margin: 6px 4px; background: rgb(var(--tikeo-border)); }
.hd-count { display: grid; place-items: center; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 999px; background: #ff7a00; color: #0e2240; font-size: 11px; font-weight: 700; }
.hd-who { display: flex; align-items: center; gap: 12px; padding: 10px 10px 12px; }
.hd-who b { font-family: 'Bricolage Grotesque', 'Instrument Sans', sans-serif; font-size: 15px; }
.hd-who span { font-size: 12.5px; color: rgb(var(--tikeo-text-secondary)); }
.hd-role { display: inline-block; margin-top: 4px; padding: 1px 9px; border-radius: 999px; background: var(--hd-hov); font-style: normal; font-size: 11px; font-weight: 700; }
.hd-langs { display: flex; gap: 6px; padding: 4px 6px 6px; }
.hd-langs button { flex: 1; height: 34px; border-radius: 10px; border: 1px solid rgb(var(--tikeo-border)); font-size: 12.5px; font-weight: 700; text-transform: uppercase; color: rgb(var(--tikeo-text-secondary)); transition: background-color 0.15s; }
.hd-langs button:hover { background: var(--hd-hov); }
.hd-langs button[aria-pressed='true'] { background: #0e2240; border-color: #0e2240; color: #fff; }
:global(.dark) .hd-langs button[aria-pressed='true'] { background: #ff8a1a; border-color: #ff8a1a; color: #111827; }

/* Fenêtre de recherche */
.hd-scrim { position: fixed; inset: 0; z-index: 70; background: rgba(8, 18, 36, 0.55); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
.hd-palette {
  position: fixed; z-index: 71; left: 50%; top: calc(env(safe-area-inset-top, 0px) + 10vh); width: min(640px, calc(100vw - 24px)); transform: translateX(-50%);
  overflow: hidden; border-radius: 26px; background: rgb(var(--tikeo-surface)); color: rgb(var(--tikeo-text-primary));
  border: 1px solid rgb(var(--tikeo-border)); box-shadow: var(--hd-shadow);
}
.hd-p-in { display: flex; align-items: center; gap: 12px; height: 64px; padding: 0 12px 0 20px; color: rgb(var(--tikeo-text-secondary)); }
.hd-p-in input { flex: 1; min-width: 0; height: 100%; border: 0; outline: 0; background: transparent; color: rgb(var(--tikeo-text-primary)); font-size: 17px; font-weight: 500; }
.hd-p-in input::placeholder { color: rgb(var(--tikeo-text-secondary)); }
.hd-p-in input::-webkit-search-cancel-button { display: none; }
.hd-p-x { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 999px; }
.hd-p-x:hover { background: var(--hd-hov); }
.hd-p-res { max-height: 56vh; overflow-y: auto; border-top: 1px solid rgb(var(--tikeo-border)); }
.hd-p-chips { display: flex; flex-wrap: wrap; gap: 8px; padding: 14px 18px 18px; border-top: 1px solid rgb(var(--tikeo-border)); }
.hd-p-chips button { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px; border-radius: 999px; border: 1px solid rgb(var(--tikeo-border)); font-size: 13.5px; font-weight: 600; transition: border-color 0.2s, background-color 0.2s; }
.hd-p-chips button:hover { border-color: #ff7a00; background: rgba(255, 122, 0, 0.1); }
.hd-fade-enter-active, .hd-fade-leave-active { transition: opacity 0.2s; }
.hd-fade-enter-from, .hd-fade-leave-to { opacity: 0; }
.hd-palette-enter-active, .hd-palette-leave-active { transition: opacity 0.2s, transform 0.3s var(--ease-tikeo); }
.hd-palette-enter-from, .hd-palette-leave-to { opacity: 0; transform: translate(-50%, -10px) scale(0.98); }

/* Petit « pop » à chaque changement de valeur d'un compteur. */
.badge-pop { animation: badge-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); }
@keyframes badge-pop { 0% { transform: scale(0.4); } 100% { transform: scale(1); } }
@media (prefers-reduced-motion: reduce) {
  .badge-pop, .hd, .hd-pill, .hd-ind { animation: none; transition: none; }
}
</style>
