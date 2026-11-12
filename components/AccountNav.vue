<script setup lang="ts">
/**
 * Navigation de « Mon espace ».
 *  - Ordinateur : barre latérale en 3 groupes aux titres clairs (Mes achats /
 *    Mon compte), chaque entrée avec une icône et une courte explication.
 *  - Mobile : rangée de pastilles arrondies, défilable, qui se centre sur la page active.
 * Rendue par AccountShell.
 */
const { t } = useI18n()
const route = useRoute()
const { unreadCount } = useMyNotifications()

const groups = computed(() => [
  {
    key: 'home',
    title: '',
    items: [{ to: '/mon-espace/tableau-de-bord', label: t('header.dashboard'), hint: t('account.hintDashboard'), icon: 'dashboard' }],
  },
  {
    key: 'purchases',
    title: t('account.groupPurchases'),
    items: [
      { to: '/mon-espace/mes-billets', label: t('header.myTickets'), hint: t('account.hintTickets'), icon: 'ticket' },
      { to: '/mon-espace/mes-commandes', label: t('placeholderPages.myOrders'), hint: t('account.hintOrders'), icon: 'receipt' },
      { to: '/mon-espace/liste-attente', label: t('waitlistPage.title'), hint: t('account.hintWaitlist'), icon: 'clock' },
    ],
  },
  {
    key: 'account',
    title: t('account.groupAccount'),
    items: [
      { to: '/mon-espace/mes-favoris', label: t('header.favorites'), hint: t('account.hintFavorites'), icon: 'heart' },
      { to: '/mon-espace/notifications', label: t('header.notifications'), hint: t('account.hintNotifications'), icon: 'bell', badge: unreadCount.value || null },
      { to: '/mon-espace/portefeuille', label: t('header.wallet'), hint: t('account.hintWallet'), icon: 'wallet' },
      { to: '/mon-espace/profil', label: t('header.profile'), hint: t('account.hintProfile'), icon: 'user' },
      { to: '/mon-espace/parametres', label: t('header.settings'), hint: t('account.hintSettings'), icon: 'settings' },
    ],
  },
])
const flat = computed(() => groups.value.flatMap((g) => g.items))
const isActive = (to: string) => route.path === to

const listRef = ref<HTMLElement | null>(null)
onMounted(() => {
  nextTick(() => {
    listRef.value?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'center' })
  })
})
</script>

<template>
  <div>
    <!-- ===== Ordinateur : barre latérale ===== -->
    <nav class="hidden lg:block" :aria-label="t('account.navLabel')">
      <div class="acn-side sticky top-28 space-y-5 rounded-[1.75rem] border border-tikeo-border bg-tikeo-surface p-3 shadow-card">
        <div v-for="g in groups" :key="g.key">
          <p v-if="g.title" class="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-tikeo-gray-text">{{ g.title }}</p>
          <ul class="space-y-1">
            <li v-for="l in g.items" :key="l.to">
              <NuxtLink
                :to="l.to"
                :aria-current="isActive(l.to) ? 'page' : undefined"
                class="acn-item group flex items-center gap-3 rounded-2xl px-2.5 py-2.5 transition-all duration-200"
                :class="isActive(l.to) ? 'bg-tikeo-ink text-white shadow-[0_14px_26px_-14px_rgba(14,34,64,0.7)] dark:bg-[#FF7A00]/15' : 'text-tikeo-black hover:bg-tikeo-surface-alt'"
              >
                <span
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200 group-hover:scale-105"
                  :class="isActive(l.to) ? 'bg-[#FF7A00] text-tikeo-ink' : 'bg-tikeo-surface-alt text-tikeo-black group-hover:bg-[#FF7A00]/15'"
                >
                  <AppIcon :name="l.icon" class="h-5 w-5" />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-[15px] font-bold leading-tight">{{ l.label }}</span>
                  <span class="mt-0.5 block truncate text-xs" :class="isActive(l.to) ? 'text-white/65' : 'text-tikeo-gray-text'">{{ l.hint }}</span>
                </span>
                <span v-if="l.badge" class="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF7A00] px-1.5 text-[11px] font-bold text-tikeo-ink">{{ l.badge }}</span>
              </NuxtLink>
            </li>
          </ul>
        </div>
      </div>
    </nav>

    <!-- ===== Mobile : pastilles ===== -->
    <nav class="lg:hidden" :aria-label="t('account.navLabel')">
      <ul ref="listRef" class="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <li v-for="l in flat" :key="l.to" class="shrink-0">
          <NuxtLink
            :to="l.to"
            :aria-current="isActive(l.to) ? 'page' : undefined"
            class="flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-all duration-200 active:scale-95"
            :class="isActive(l.to) ? 'border-tikeo-ink bg-tikeo-ink text-white dark:border-[#FF7A00] dark:bg-[#FF7A00] dark:text-tikeo-ink' : 'border-tikeo-border bg-tikeo-surface text-tikeo-black'"
          >
            <AppIcon :name="l.icon" class="h-[18px] w-[18px]" />
            {{ l.label }}
            <span v-if="l.badge" class="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF7A00] px-1.5 text-[11px] font-bold text-tikeo-ink">{{ l.badge }}</span>
          </NuxtLink>
        </li>
      </ul>
    </nav>
  </div>
</template>
