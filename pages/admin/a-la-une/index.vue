<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin', adminPermission: 'featured.manage' })

import type { EventCardData } from '~/types/database'
import { mapEventRow } from '~/composables/useFeaturedEvents'

const { t, locale } = useI18n()
const { askConfirm } = useAdminConfirm()
const api = useAdminFeaturedEvents()

const message = ref('')
const errorMsg = ref('')
const busyId = ref<string | null>(null)

function flash(msg: string) {
  errorMsg.value = ''
  message.value = msg
  setTimeout(() => (message.value = ''), 2500)
}
async function guarded(fn: () => Promise<unknown>, ok?: string) {
  errorMsg.value = ''
  try {
    await fn()
    if (ok) flash(ok)
    return true
  } catch (e: any) {
    errorMsg.value = e?.message || t('adminFeatured.error')
    return false
  }
}
async function run(id: string, fn: () => Promise<unknown>, ok?: string) {
  busyId.value = id
  await guarded(fn, ok)
  busyId.value = null
}

const rows = computed(() => api.sorted.value.map((r) => ({ ...r, card: r.event ? mapEventRow(r.event) : null })))
const dateText = (iso: string) => new Date(iso).toLocaleDateString(locale.value, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
const isPast = (c: EventCardData | null) => !!c && isEventPast(c.startDate, c.endDate, Date.now())

// --- Sélecteur d'événement --------------------------------------------------
const pickerOpen = ref(false)
const pickerQuery = ref('')
const pickerResults = ref<EventCardData[]>([])
const pickerLoading = ref(false)
let pickerTimer: ReturnType<typeof setTimeout> | null = null

async function loadPicker() {
  pickerLoading.value = true
  try {
    pickerResults.value = await api.searchEvents(pickerQuery.value)
  } catch (e: any) {
    errorMsg.value = e?.message || t('adminFeatured.error')
  } finally {
    pickerLoading.value = false
  }
}
function openPicker() {
  pickerQuery.value = ''
  pickerOpen.value = true
  loadPicker()
}
watch(pickerQuery, () => {
  if (pickerTimer) clearTimeout(pickerTimer)
  pickerTimer = setTimeout(loadPicker, 300)
})
async function addEvent(e: EventCardData) {
  const ok = await guarded(() => api.create({ event_id: e.id, status: 'active' }), t('adminFeatured.added'))
  if (ok) pickerResults.value = pickerResults.value.filter((x) => x.id !== e.id)
}

// --- Badge ----------------------------------------------------------------------
const badgeDraft = ref<{ id: string; value: string } | null>(null)
async function saveBadge() {
  const d = badgeDraft.value
  if (!d) return
  const ok = await guarded(() => api.update(d.id, { badge_label: d.value.trim() || null }), t('adminFeatured.badgeSaved'))
  if (ok) badgeDraft.value = null
}

async function remove(id: string, title: string) {
  const ok = await askConfirm({ title: t('adminFeatured.removeTitle'), message: t('adminFeatured.removeConfirm', { name: title }), confirmLabel: t('adminFeatured.remove') })
  if (ok) await run(id, () => api.remove(id), t('adminFeatured.removed'))
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-8 md:px-6">
    <div class="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-tikeo-black">{{ t('adminFeatured.title') }}</h1>
        <p class="mt-1 max-w-xl text-sm text-tikeo-gray-text">{{ t('adminFeatured.subtitle') }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <NuxtLink to="/" target="_blank" class="acc-btn-ghost !text-[13px]"><AppIcon name="external-link" class="h-[18px] w-[18px]" />{{ t('adminFeatured.viewHome') }}</NuxtLink>
        <button type="button" class="btn-ink !h-10 !px-4 !text-[13px]" @click="openPicker"><AppIcon name="plus" class="h-[18px] w-[18px]" :stroke="2.2" />{{ t('adminFeatured.add') }}</button>
      </div>
    </div>

    <p v-if="errorMsg && !pickerOpen" class="acc-alert-error mb-4">{{ errorMsg }}</p>
    <p v-if="message" class="acc-alert-success mb-4">{{ message }}</p>
    <p class="acc-alert-info mb-5 text-xs">{{ t('adminFeatured.hint') }}</p>

    <div v-if="api.loading.value" class="space-y-3"><div v-for="i in 3" :key="i" class="h-24 animate-pulse bg-tikeo-border" /></div>
    <AdminEmpty v-else-if="!rows.length" icon="star" :text="t('adminFeatured.empty')">
      <button type="button" class="btn-ink !h-10 !px-4 !text-[13px]" @click="openPicker"><AppIcon name="plus" class="h-[18px] w-[18px]" :stroke="2.2" />{{ t('adminFeatured.addFirst') }}</button>
    </AdminEmpty>

    <ol v-else class="space-y-3">
      <li v-for="(r, i) in rows" :key="r.id" class="org-panel org-card-hover flex flex-col gap-3 p-4 sm:flex-row sm:items-center" :class="r.status === 'inactive' || !r.card || isPast(r.card) ? 'opacity-70' : ''">
        <span class="flex h-8 w-8 shrink-0 items-center justify-center bg-tikeo-ink font-display text-sm font-extrabold text-white dark:bg-[#FF7A00] dark:text-tikeo-ink">{{ i + 1 }}</span>
        <img v-if="r.card" :src="r.card.coverImage" alt="" class="h-20 w-32 shrink-0 object-cover" />
        <span v-else class="flex h-20 w-32 shrink-0 items-center justify-center bg-tikeo-surface-alt text-tikeo-gray-text"><AppIcon name="alert" class="h-7 w-7" /></span>

        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <p class="truncate text-sm font-bold text-tikeo-black">{{ r.card?.title || t('adminFeatured.eventGone') }}</p>
            <StatusPill :tone="r.status === 'active' && r.card && !isPast(r.card) ? 'success' : 'neutral'">
              {{ !r.card ? t('adminFeatured.stateUnpublished') : isPast(r.card) ? t('adminFeatured.statePast') : r.status === 'active' ? t('adminFeatured.stateLive') : t('adminFeatured.stateHidden') }}
            </StatusPill>
          </div>
          <p v-if="r.card" class="mt-0.5 text-xs text-tikeo-gray-text">{{ dateText(r.card.startDate) }}<template v-if="r.card.city"> · {{ r.card.city }}</template></p>

          <form v-if="badgeDraft?.id === r.id" class="mt-2 flex max-w-sm gap-2" @submit.prevent="saveBadge">
            <input v-model="badgeDraft.value" type="text" maxlength="30" class="input-field !h-9 flex-1 text-sm" :placeholder="t('adminFeatured.badgePlaceholder')" :aria-label="t('adminFeatured.badge')" autofocus />
            <button type="submit" class="btn-ink !h-9 !px-3 !text-[12px]"><AppIcon name="check" class="h-4 w-4" :stroke="2.4" /></button>
            <button type="button" class="acc-btn-ghost !h-9 !px-3" :aria-label="t('adminFeatured.cancel')" @click="badgeDraft = null"><AppIcon name="close" class="h-4 w-4" :stroke="2.4" /></button>
          </form>
          <p v-else class="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-tikeo-gray-text">
            <AppIcon name="tag" class="h-3.5 w-3.5" />{{ t('adminFeatured.badge') }} : <span class="text-tikeo-black">{{ r.badge_label || t('adminFeatured.badgeDefault') }}</span>
          </p>
        </div>

        <div class="flex shrink-0 flex-wrap items-center gap-1.5">
          <OrgIconButton icon="arrow-up" :label="t('adminFeatured.moveUp')" :disabled="i === 0" :loading="busyId === r.id" @click="run(r.id, () => api.move(r, -1))" />
          <OrgIconButton icon="arrow-down" :label="t('adminFeatured.moveDown')" :disabled="i === rows.length - 1" :loading="busyId === r.id" @click="run(r.id, () => api.move(r, 1))" />
          <OrgIconButton v-if="r.card" icon="eye" :label="t('adminFeatured.viewEvent')" :to="`/e/${r.card.slug}`" />
          <OrgIconButton icon="tag" :label="t('adminFeatured.editBadge')" @click="badgeDraft = { id: r.id, value: r.badge_label || '' }" />
          <OrgIconButton :icon="r.status === 'active' ? 'pause' : 'play'" :label="r.status === 'active' ? t('adminFeatured.hide') : t('adminFeatured.show')" @click="run(r.id, () => api.update(r.id, { status: r.status === 'active' ? 'inactive' : 'active' }))" />
          <OrgIconButton icon="trash" danger :label="t('adminFeatured.remove')" @click="remove(r.id, r.card?.title || '')" />
        </div>
      </li>
    </ol>

    <!-- Sélecteur d'événement -->
    <AdminModal :open="pickerOpen" @close="pickerOpen = false">
      <template #header>
        <p class="flex items-center gap-2 font-display text-lg font-extrabold text-tikeo-black">
          <span class="flex h-9 w-9 items-center justify-center bg-tikeo-ink text-white dark:bg-[#FF7A00] dark:text-tikeo-ink"><AppIcon name="star" class="h-5 w-5" /></span>{{ t('adminFeatured.pickTitle') }}
        </p>
      </template>
      <p v-if="errorMsg" class="acc-alert-error mb-3">{{ errorMsg }}</p>
      <AdminSearch v-model="pickerQuery" :placeholder="t('adminFeatured.pickSearch')" class="mb-4" />
      <div v-if="pickerLoading" class="space-y-2"><div v-for="i in 3" :key="i" class="h-16 animate-pulse bg-tikeo-border" /></div>
      <AdminEmpty v-else-if="!pickerResults.length" icon="calendar" :text="t('adminFeatured.pickEmpty')" />
      <ul v-else class="space-y-2">
        <li v-for="e in pickerResults" :key="e.id" class="flex items-center gap-3 border border-tikeo-border p-2.5">
          <img :src="e.coverImage" alt="" class="h-14 w-20 shrink-0 object-cover" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-bold text-tikeo-black">{{ e.title }}</p>
            <p class="truncate text-xs text-tikeo-gray-text">{{ dateText(e.startDate) }}<template v-if="e.city"> · {{ e.city }}</template></p>
          </div>
          <button type="button" class="btn-ink !h-9 !px-3 !text-[12px]" @click="addEvent(e)"><AppIcon name="plus" class="h-4 w-4" :stroke="2.4" />{{ t('adminFeatured.pick') }}</button>
        </li>
      </ul>
    </AdminModal>
  </div>
</template>
