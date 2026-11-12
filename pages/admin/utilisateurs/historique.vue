<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin', adminPermission: 'users.view' })

/**
 * Historique des comptes : qui a été supprimé, créé, suspendu, réactivé ou a
 * changé de rôle, quand, et par quel administrateur. Les comptes supprimés ne
 * figurent plus dans la liste « Utilisateurs » : leur trace est ici.
 * Données : GET /api/admin/users/history (lecture de audit_logs).
 */
interface HistoryRow {
  id: string
  action: string
  createdAt: string
  accountId: string | null
  accountName: string | null
  accountEmail: string | null
  legacy: boolean
  fromRole: string | null
  toRole: string | null
  byName: string | null
}

const { t, locale } = useI18n()
const supabase = useSupabase()

const PAGE = 30
const rows = ref<HistoryRow[]>([])
const counts = reactive<Record<string, number>>({ deleted: 0, created: 0, suspensions: 0, roles: 0 })
const kind = ref<'all' | 'deleted' | 'created' | 'suspensions' | 'roles'>('all')
const search = ref('')
const loading = ref(true)
const hasMore = ref(false)
const errorMessage = ref('')

async function load(reset = true) {
  loading.value = true
  errorMessage.value = ''
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) throw new Error('Session expirée, reconnectez-vous.')
    const res = await $fetch<{ rows: HistoryRow[]; hasMore: boolean; counts: Record<string, number> }>('/api/admin/users/history', {
      headers: { Authorization: `Bearer ${session.access_token}` },
      query: { kind: kind.value, limit: PAGE, offset: reset ? 0 : rows.value.length },
    })
    rows.value = reset ? res.rows : [...rows.value, ...res.rows]
    hasMore.value = res.hasMore
    Object.assign(counts, res.counts)
  } catch (e: any) {
    errorMessage.value = e?.data?.statusMessage || e?.message || t('accountHistory.errorLoad')
  } finally {
    loading.value = false
  }
}

watch(kind, () => load(true))
onMounted(() => load(true))

const chips = computed(() => [
  { value: 'all', label: t('accountHistory.filterAll'), count: counts.deleted + counts.created + counts.suspensions + counts.roles },
  { value: 'deleted', label: t('accountHistory.filterDeleted'), count: counts.deleted },
  { value: 'created', label: t('accountHistory.filterCreated'), count: counts.created },
  { value: 'suspensions', label: t('accountHistory.filterSuspensions'), count: counts.suspensions },
  { value: 'roles', label: t('accountHistory.filterRoles'), count: counts.roles },
])

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return rows.value
  return rows.value.filter((r) => [r.accountName, r.accountEmail, r.byName].some((v) => (v || '').toLowerCase().includes(q)))
})

const META: Record<string, { icon: string; tone: 'success' | 'error' | 'warning' | 'info'; label: string }> = {
  ADMIN_USER_DELETED: { icon: 'trash', tone: 'error', label: 'accountHistory.actionDeleted' },
  ADMIN_USER_CREATED: { icon: 'plus', tone: 'success', label: 'accountHistory.actionCreated' },
  USER_SUSPENDED: { icon: 'ban', tone: 'warning', label: 'accountHistory.actionSuspended' },
  USER_REACTIVATED: { icon: 'user-check', tone: 'success', label: 'accountHistory.actionReactivated' },
  USER_ROLE_CHANGED: { icon: 'key', tone: 'info', label: 'accountHistory.actionRole' },
}
const meta = (a: string) => META[a] ?? { icon: 'activity', tone: 'info' as const, label: a }

const roleName = (r: string | null) => {
  const map: Record<string, string> = { buyer: 'roleBuyer', organizer: 'roleOrganizer', agent: 'roleAgent', admin: 'roleAdmin' }
  return r && map[r] ? t(`adminUsers.${map[r]}`) : r || '—'
}

function title(r: HistoryRow) {
  if (r.accountName && r.accountName !== 'Compte supprimé') return r.accountName
  return r.legacy ? t('accountHistory.legacyAccount') : t('accountHistory.unknownAccount')
}

function detail(r: HistoryRow) {
  if (r.action === 'USER_ROLE_CHANGED') return `${roleName(r.fromRole)} → ${roleName(r.toRole)}`
  if (r.action === 'ADMIN_USER_CREATED' && r.toRole) return roleName(r.toRole)
  if (r.action === 'ADMIN_USER_DELETED' && r.fromRole) return roleName(r.fromRole)
  return ''
}

const bcp47 = computed(() => (locale.value === 'en' ? 'en-GB' : locale.value === 'es' ? 'es-ES' : locale.value === 'pt' ? 'pt-PT' : 'fr-FR'))
const formatDate = (d: string) => new Date(d).toLocaleString(bcp47.value, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8 md:px-6">
    <NuxtLink to="/admin/utilisateurs" class="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-tikeo-gray-text transition-colors hover:text-tikeo-black">
      <AppIcon name="arrow-left" class="h-4 w-4" />{{ t('accountHistory.back') }}
    </NuxtLink>

    <div class="mb-6 flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-tikeo-black">{{ t('accountHistory.title') }}</h1>
        <p class="mt-1 text-sm text-tikeo-gray-text">{{ t('accountHistory.subtitle') }}</p>
      </div>
      <OrgIconButton icon="refresh" :label="t('accountHistory.refresh')" :loading="loading" @click="load(true)" />
    </div>

    <p v-if="errorMessage" class="acc-alert-error mb-4">{{ errorMessage }}</p>

    <div class="admin-toolbar">
      <AdminSearch v-model="search" :placeholder="t('accountHistory.search')" />
      <div class="flex flex-wrap gap-2">
        <button v-for="c in chips" :key="c.value" type="button" class="admin-chip" :class="kind === c.value ? 'is-active' : ''" @click="kind = c.value as any">
          {{ c.label }} <span class="opacity-60">{{ c.count }}</span>
        </button>
      </div>
    </div>

    <div v-if="loading && !rows.length" class="space-y-2">
      <div v-for="i in 5" :key="i" class="h-16 animate-pulse border border-tikeo-border bg-tikeo-surface-alt" />
    </div>

    <AdminEmpty v-else-if="!filtered.length" icon="clock" :text="search ? t('adminCommon.noResults') : t('accountHistory.empty')" />

    <ul v-else class="flex flex-col gap-2" :class="loading ? 'opacity-60 transition-opacity' : ''">
      <li v-for="r in filtered" :key="r.id" class="org-panel flex items-start gap-3 p-3 sm:items-center sm:p-4">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center" :class="`pill-${meta(r.action).tone}`">
          <AppIcon :name="meta(r.action).icon" class="h-5 w-5" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-bold text-tikeo-black">{{ title(r) }}</p>
          <p v-if="r.accountEmail" class="truncate text-xs text-tikeo-gray-text">{{ r.accountEmail }}</p>
          <p class="mt-0.5 text-xs text-tikeo-gray-text">
            {{ r.byName ? t('accountHistory.by', { name: r.byName }) : t('accountHistory.bySystem') }}
            <span v-if="detail(r)"> · {{ detail(r) }}</span>
          </p>
        </div>
        <div class="flex shrink-0 flex-col items-end gap-1 text-right">
          <StatusPill :tone="meta(r.action).tone">{{ t(meta(r.action).label) }}</StatusPill>
          <span class="text-[11px] text-tikeo-gray-text">{{ formatDate(r.createdAt) }}</span>
        </div>
      </li>
    </ul>

    <div v-if="hasMore && !search" class="mt-4 flex justify-center">
      <button type="button" class="acc-btn-ghost !h-10 !text-[13px] disabled:opacity-60" :disabled="loading" @click="load(false)">{{ t('accountHistory.loadMore') }}</button>
    </div>
  </div>
</template>
