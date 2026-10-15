<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin', adminPermission: 'press.manage' })

import type { PressItem, PressKind, PressResource, PressResourceKind } from '~/types/database'
import { PRESS_KINDS, PRESS_KIND_ICONS, PRESS_RESOURCE_KINDS, PRESS_RESOURCE_ICONS, formatPressDate } from '~/composables/usePress'
import { safeExternalUrl } from '~/composables/usePartners'

const { t, locale } = useI18n()
const { askConfirm } = useAdminConfirm()
const itemsApi = useAdminPressItems()
const resApi = useAdminPressResources()

const tab = ref<'items' | 'kit'>('items')
const search = ref('')
const kindFilter = ref<PressKind | 'all'>('all')
const message = ref('')
const errorMsg = ref('')
const saving = ref(false)
const busyId = ref<string | null>(null)

const itemDraft = ref<Partial<PressItem> | null>(null)
const resDraft = ref<Partial<PressResource> | null>(null)

const today = () => new Date().toISOString().slice(0, 10)

const stats = computed(() => [
  { icon: 'newspaper', value: itemsApi.items.value.filter((i) => i.kind !== 'release').length, label: t('adminPress.statCoverage') },
  { icon: 'file-text', value: itemsApi.items.value.filter((i) => i.kind === 'release').length, label: t('adminPress.statReleases') },
  { icon: 'download', value: resApi.items.value.length, label: t('adminPress.statKit') },
  { icon: 'eye', value: itemsApi.items.value.filter((i) => i.status === 'active').length + resApi.items.value.filter((i) => i.status === 'active').length, label: t('adminPress.statVisible') },
])

const sortedItems = computed(() => [...itemsApi.items.value].sort((a, b) => b.published_on.localeCompare(a.published_on)))
const filteredItems = computed(() => {
  const q = search.value.trim().toLowerCase()
  return sortedItems.value.filter((i) => {
    if (kindFilter.value !== 'all' && i.kind !== kindFilter.value) return false
    return !q || `${i.media_name} ${i.title} ${i.excerpt ?? ''}`.toLowerCase().includes(q)
  })
})
const filteredRes = computed(() => {
  const q = search.value.trim().toLowerCase()
  return resApi.sorted.value.filter((r) => !q || `${r.title} ${r.description ?? ''}`.toLowerCase().includes(q))
})

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
    errorMsg.value = e?.message || t('adminPress.error')
    return false
  }
}
async function run(id: string, fn: () => Promise<unknown>, ok?: string) {
  busyId.value = id
  await guarded(fn, ok)
  busyId.value = null
}
const validUrl = (u: string) => !u || /^https?:\/\//i.test(u)

// --- Retombées / communiqués ---------------------------------------------------
function openItem(i?: PressItem) {
  errorMsg.value = ''
  itemDraft.value = i
    ? { ...i, excerpt: i.excerpt || '', url: i.url || '', logo_url: i.logo_url || '' }
    : { kind: 'article', media_name: '', title: '', excerpt: '', url: '', logo_url: '', published_on: today(), is_featured: false, status: 'active' }
}
async function saveItem() {
  const d = itemDraft.value
  if (!d || !d.media_name?.trim() || !d.title?.trim()) return
  const url = d.url?.trim() || ''
  if (!validUrl(url)) {
    errorMsg.value = t('adminPress.urlError')
    return
  }
  saving.value = true
  const payload = {
    kind: d.kind || 'article',
    media_name: d.media_name.trim(),
    title: d.title.trim(),
    excerpt: d.excerpt?.trim() || null,
    url: url || null,
    logo_url: d.logo_url?.trim() || null,
    published_on: d.published_on || today(),
    is_featured: !!d.is_featured,
    status: d.status || 'inactive',
  }
  const ok = await guarded(() => (d.id ? itemsApi.update(d.id, payload) : itemsApi.create(payload)), d.id ? t('adminPress.updated') : t('adminPress.created'))
  saving.value = false
  if (ok) itemDraft.value = null
}
async function removeItem(i: PressItem) {
  const ok = await askConfirm({ title: t('adminPress.deleteTitle'), message: t('adminPress.deleteConfirm', { name: i.title }), confirmLabel: t('adminPress.delete') })
  if (ok) await run(i.id, () => itemsApi.remove(i.id), t('adminPress.deleted'))
}

// --- Kit média -----------------------------------------------------------------------
function openRes(r?: PressResource) {
  errorMsg.value = ''
  resDraft.value = r ? { ...r, description: r.description || '' } : { kind: 'logo', title: '', description: '', file_url: '', status: 'active' }
}
async function saveRes() {
  const d = resDraft.value
  if (!d || !d.title?.trim()) return
  const url = d.file_url?.trim() || ''
  if (!url || !validUrl(url)) {
    errorMsg.value = t('adminPress.fileError')
    return
  }
  saving.value = true
  const payload = {
    kind: (d.kind || 'other') as PressResourceKind,
    title: d.title.trim(),
    description: d.description?.trim() || null,
    file_url: url,
    status: d.status || 'inactive',
  }
  const ok = await guarded(() => (d.id ? resApi.update(d.id, payload) : resApi.create(payload)), d.id ? t('adminPress.updated') : t('adminPress.created'))
  saving.value = false
  if (ok) resDraft.value = null
}
async function removeRes(r: PressResource) {
  const ok = await askConfirm({ title: t('adminPress.deleteResTitle'), message: t('adminPress.deleteConfirm', { name: r.title }), confirmLabel: t('adminPress.delete') })
  if (ok) await run(r.id, () => resApi.remove(r.id), t('adminPress.deleted'))
}
const resIndex = (r: PressResource) => resApi.sorted.value.findIndex((x) => x.id === r.id)
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-8 md:px-6">
    <div class="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-tikeo-black">{{ t('adminPress.title') }}</h1>
        <p class="mt-1 max-w-xl text-sm text-tikeo-gray-text">{{ t('adminPress.subtitle') }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <NuxtLink to="/presse" target="_blank" class="acc-btn-ghost !text-[13px]"><AppIcon name="external-link" class="h-[18px] w-[18px]" />{{ t('adminPress.viewPublic') }}</NuxtLink>
        <button type="button" class="btn-ink !h-10 !px-4 !text-[13px]" @click="tab === 'items' ? openItem() : openRes()"><AppIcon name="plus" class="h-[18px] w-[18px]" :stroke="2.2" />{{ tab === 'items' ? t('adminPress.addItem') : t('adminPress.addResource') }}</button>
      </div>
    </div>

    <p v-if="errorMsg && !itemDraft && !resDraft" class="acc-alert-error mb-4">{{ errorMsg }}</p>
    <p v-if="message" class="acc-alert-success mb-4">{{ message }}</p>

    <div class="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
      <div v-for="s in stats" :key="s.label" class="org-panel flex items-center gap-3 p-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center bg-tikeo-ink text-white dark:bg-[#FF7A00] dark:text-tikeo-ink"><AppIcon :name="s.icon" class="h-5 w-5" /></span>
        <span class="min-w-0"><span class="block font-display text-2xl font-extrabold leading-none text-tikeo-black">{{ s.value }}</span><span class="mt-1 block truncate text-[11px] font-semibold text-tikeo-gray-text">{{ s.label }}</span></span>
      </div>
    </div>

    <div class="mb-4 flex border-b border-tikeo-border" role="tablist">
      <button type="button" role="tab" :aria-selected="tab === 'items'" class="-mb-px flex h-11 items-center gap-2 border-b-2 px-4 text-sm font-bold transition-colors" :class="tab === 'items' ? 'border-[#FF7A00] text-tikeo-black' : 'border-transparent text-tikeo-gray-text hover:text-tikeo-black'" @click="tab = 'items'"><AppIcon name="newspaper" class="h-4 w-4" />{{ t('adminPress.tabItems') }}</button>
      <button type="button" role="tab" :aria-selected="tab === 'kit'" class="-mb-px flex h-11 items-center gap-2 border-b-2 px-4 text-sm font-bold transition-colors" :class="tab === 'kit' ? 'border-[#FF7A00] text-tikeo-black' : 'border-transparent text-tikeo-gray-text hover:text-tikeo-black'" @click="tab = 'kit'"><AppIcon name="download" class="h-4 w-4" />{{ t('adminPress.tabKit') }}</button>
    </div>

    <div class="mb-5 flex flex-col gap-2 sm:flex-row">
      <AdminSearch v-model="search" :placeholder="t('adminPress.search')" class="sm:flex-1" />
      <select v-if="tab === 'items'" v-model="kindFilter" class="input-field sm:w-56" :aria-label="t('adminPress.fieldKind')">
        <option value="all">{{ t('press.all') }}</option>
        <option v-for="k in PRESS_KINDS" :key="k" :value="k">{{ t(`press.kinds.${k}`) }}</option>
      </select>
    </div>

    <!-- ===== Retombées & communiqués ===== -->
    <template v-if="tab === 'items'">
      <div v-if="itemsApi.loading.value" class="space-y-3"><div v-for="i in 3" :key="i" class="h-20 animate-pulse bg-tikeo-border" /></div>
      <AdminEmpty v-else-if="!itemsApi.items.value.length" icon="newspaper" :text="t('adminPress.emptyItems')"><button type="button" class="btn-ink !h-10 !px-4 !text-[13px]" @click="openItem()"><AppIcon name="plus" class="h-[18px] w-[18px]" :stroke="2.2" />{{ t('adminPress.addItem') }}</button></AdminEmpty>
      <AdminEmpty v-else-if="!filteredItems.length" icon="search" :text="t('adminPress.noResult')" />
      <ul v-else class="space-y-3">
        <li v-for="i in filteredItems" :key="i.id" class="org-panel org-card-hover flex flex-col gap-3 p-4 sm:flex-row sm:items-center" :class="i.status === 'inactive' ? 'opacity-70' : ''">
          <span class="block h-14 w-20 shrink-0 overflow-hidden border border-tikeo-border"><PartnerLogo :partner="{ name: i.media_name, logo_url: i.logo_url }" /></span>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <p class="truncate text-sm font-bold text-tikeo-black">{{ i.title }}</p>
              <StatusPill :tone="i.status === 'active' ? 'success' : 'neutral'">{{ i.status === 'active' ? t('adminPress.active') : t('adminPress.inactive') }}</StatusPill>
              <span v-if="i.is_featured" class="acc-tag bg-[#FF7A00]/15 text-tikeo-orange"><AppIcon name="star" class="mr-1 h-3 w-3" :stroke="2.4" />{{ t('adminPress.featuredTag') }}</span>
            </div>
            <p class="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs font-semibold text-tikeo-gray-text">
              <span class="flex items-center gap-1.5"><AppIcon :name="PRESS_KIND_ICONS[i.kind]" class="h-3.5 w-3.5" />{{ t(`press.kinds.${i.kind}`) }}</span>
              <span>{{ i.media_name }}</span><span>{{ formatPressDate(i.published_on, locale) }}</span>
            </p>
          </div>
          <div class="flex shrink-0 flex-wrap items-center gap-1.5">
            <a v-if="safeExternalUrl(i.url)" :href="safeExternalUrl(i.url)" target="_blank" rel="noopener noreferrer nofollow" class="org-icon-btn org-tip" :data-tip="t('adminPress.open')" :aria-label="t('adminPress.open')"><AppIcon name="external-link" class="h-[18px] w-[18px]" /></a>
            <OrgIconButton icon="star" :label="i.is_featured ? t('adminPress.unfeature') : t('adminPress.feature')" :class="i.is_featured ? '!border-[#FF7A00] !text-tikeo-orange' : ''" @click="run(i.id, () => itemsApi.update(i.id, { is_featured: !i.is_featured }))" />
            <OrgIconButton :icon="i.status === 'active' ? 'pause' : 'play'" :label="i.status === 'active' ? t('adminPress.deactivate') : t('adminPress.activate')" @click="run(i.id, () => itemsApi.update(i.id, { status: i.status === 'active' ? 'inactive' : 'active' }))" />
            <OrgIconButton icon="edit" :label="t('adminPress.edit')" @click="openItem(i)" />
            <OrgIconButton icon="trash" danger :label="t('adminPress.delete')" @click="removeItem(i)" />
          </div>
        </li>
      </ul>
    </template>

    <!-- ===== Kit média ===== -->
    <template v-else>
      <div v-if="resApi.loading.value" class="space-y-3"><div v-for="i in 3" :key="i" class="h-20 animate-pulse bg-tikeo-border" /></div>
      <AdminEmpty v-else-if="!resApi.items.value.length" icon="download" :text="t('adminPress.emptyKit')"><button type="button" class="btn-ink !h-10 !px-4 !text-[13px]" @click="openRes()"><AppIcon name="plus" class="h-[18px] w-[18px]" :stroke="2.2" />{{ t('adminPress.addResource') }}</button></AdminEmpty>
      <AdminEmpty v-else-if="!filteredRes.length" icon="search" :text="t('adminPress.noResult')" />
      <ul v-else class="space-y-3">
        <li v-for="r in filteredRes" :key="r.id" class="org-panel org-card-hover flex flex-col gap-3 p-4 sm:flex-row sm:items-center" :class="r.status === 'inactive' ? 'opacity-70' : ''">
          <span class="flex h-12 w-12 shrink-0 items-center justify-center bg-tikeo-ink text-white dark:bg-[#FF7A00] dark:text-tikeo-ink"><AppIcon :name="PRESS_RESOURCE_ICONS[r.kind]" class="h-6 w-6" /></span>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <p class="truncate text-sm font-bold text-tikeo-black">{{ r.title }}</p>
              <StatusPill :tone="r.status === 'active' ? 'success' : 'neutral'">{{ r.status === 'active' ? t('adminPress.active') : t('adminPress.inactive') }}</StatusPill>
            </div>
            <p class="mt-0.5 text-xs font-semibold text-tikeo-gray-text">{{ t(`press.resourceKinds.${r.kind}`) }}<template v-if="r.description"> · {{ r.description }}</template></p>
          </div>
          <div class="flex shrink-0 flex-wrap items-center gap-1.5">
            <OrgIconButton icon="arrow-up" :label="t('adminPress.moveUp')" :disabled="resIndex(r) === 0 || !!search" :loading="busyId === r.id" @click="run(r.id, () => resApi.move(r, -1))" />
            <OrgIconButton icon="arrow-down" :label="t('adminPress.moveDown')" :disabled="resIndex(r) === resApi.sorted.value.length - 1 || !!search" :loading="busyId === r.id" @click="run(r.id, () => resApi.move(r, 1))" />
            <a :href="safeExternalUrl(r.file_url)" target="_blank" rel="noopener noreferrer" class="org-icon-btn org-tip" :data-tip="t('adminPress.open')" :aria-label="t('adminPress.open')"><AppIcon name="download" class="h-[18px] w-[18px]" /></a>
            <OrgIconButton :icon="r.status === 'active' ? 'pause' : 'play'" :label="r.status === 'active' ? t('adminPress.deactivate') : t('adminPress.activate')" @click="run(r.id, () => resApi.update(r.id, { status: r.status === 'active' ? 'inactive' : 'active' }))" />
            <OrgIconButton icon="edit" :label="t('adminPress.edit')" @click="openRes(r)" />
            <OrgIconButton icon="trash" danger :label="t('adminPress.delete')" @click="removeRes(r)" />
          </div>
        </li>
      </ul>
    </template>

    <!-- Fenêtre : retombée / communiqué -->
    <AdminModal :open="!!itemDraft" @close="itemDraft = null">
      <template #header>
        <p class="flex items-center gap-2 font-display text-lg font-extrabold text-tikeo-black"><span class="flex h-9 w-9 items-center justify-center bg-tikeo-ink text-white dark:bg-[#FF7A00] dark:text-tikeo-ink"><AppIcon :name="itemDraft?.id ? 'edit' : 'plus'" class="h-5 w-5" /></span>{{ itemDraft?.id ? t('adminPress.editItem') : t('adminPress.newItem') }}</p>
      </template>
      <form v-if="itemDraft" id="press-item-form" class="grid gap-4 sm:grid-cols-2" @submit.prevent="saveItem">
        <p v-if="errorMsg" class="acc-alert-error sm:col-span-2">{{ errorMsg }}</p>
        <div class="sm:col-span-2"><MediaInput :model-value="itemDraft.logo_url || ''" folder="press" compact :label="t('adminPress.fieldLogo')" @update:model-value="itemDraft!.logo_url = $event" /><p class="mt-1 text-[11px] text-tikeo-gray-text">{{ t('adminPress.logoHint') }}</p></div>
        <div><label class="mb-1 block text-xs font-medium text-tikeo-gray-text" for="p-kind">{{ t('adminPress.fieldKind') }}</label><select id="p-kind" v-model="itemDraft.kind" class="input-field w-full"><option v-for="k in PRESS_KINDS" :key="k" :value="k">{{ t(`press.kinds.${k}`) }}</option></select></div>
        <div><label class="mb-1 block text-xs font-medium text-tikeo-gray-text" for="p-media">{{ t('adminPress.fieldMedia') }} *</label><input id="p-media" v-model="itemDraft.media_name" type="text" maxlength="80" required class="input-field w-full" :placeholder="t('adminPress.mediaPlaceholder')" /></div>
        <div class="sm:col-span-2"><label class="mb-1 block text-xs font-medium text-tikeo-gray-text" for="p-title">{{ t('adminPress.fieldTitle') }} *</label><input id="p-title" v-model="itemDraft.title" type="text" maxlength="160" required class="input-field w-full" /></div>
        <div><label class="mb-1 block text-xs font-medium text-tikeo-gray-text" for="p-date">{{ t('adminPress.fieldDate') }}</label><input id="p-date" v-model="itemDraft.published_on" type="date" class="input-field w-full" /></div>
        <div><label class="mb-1 block text-xs font-medium text-tikeo-gray-text" for="p-url">{{ t('adminPress.fieldUrl') }}</label><input id="p-url" v-model="itemDraft.url" type="url" maxlength="400" class="input-field w-full" placeholder="https://" /></div>
        <div class="sm:col-span-2"><label class="mb-1 block text-xs font-medium text-tikeo-gray-text" for="p-excerpt">{{ t('adminPress.fieldExcerpt') }}</label><textarea id="p-excerpt" v-model="itemDraft.excerpt" rows="3" maxlength="300" class="input-field w-full" /><p class="mt-1 text-right text-[11px] text-tikeo-gray-text">{{ (itemDraft.excerpt || '').length }}/300</p></div>
        <label class="flex items-center justify-between gap-3 border border-tikeo-border p-3"><span><span class="flex items-center gap-1.5 text-sm font-bold text-tikeo-black"><AppIcon name="star" class="h-4 w-4 text-tikeo-orange" />{{ t('adminPress.fieldFeatured') }}</span><span class="mt-0.5 block text-[11px] text-tikeo-gray-text">{{ t('adminPress.featuredHint') }}</span></span><ToggleSwitch :model-value="!!itemDraft.is_featured" :aria-label="t('adminPress.fieldFeatured')" @update:model-value="itemDraft!.is_featured = $event" /></label>
        <label class="flex items-center justify-between gap-3 border border-tikeo-border p-3"><span><span class="flex items-center gap-1.5 text-sm font-bold text-tikeo-black"><AppIcon name="eye" class="h-4 w-4 text-tikeo-orange" />{{ t('adminPress.fieldVisible') }}</span><span class="mt-0.5 block text-[11px] text-tikeo-gray-text">{{ t('adminPress.visibleHint') }}</span></span><ToggleSwitch :model-value="itemDraft.status === 'active'" :aria-label="t('adminPress.fieldVisible')" @update:model-value="itemDraft!.status = $event ? 'active' : 'inactive'" /></label>
      </form>
      <template #footer>
        <div class="flex flex-wrap justify-end gap-2">
          <button type="button" class="acc-btn-ghost !text-[13px]" @click="itemDraft = null"><AppIcon name="close" class="h-[18px] w-[18px]" />{{ t('adminPress.cancel') }}</button>
          <button type="submit" form="press-item-form" class="btn-ink !h-10 !px-4 !text-[13px]" :disabled="saving || !itemDraft?.media_name?.trim() || !itemDraft?.title?.trim()"><AppIcon name="save" class="h-[18px] w-[18px]" />{{ saving ? t('adminPress.saving') : t('adminPress.save') }}</button>
        </div>
      </template>
    </AdminModal>

    <!-- Fenêtre : élément du kit média -->
    <AdminModal :open="!!resDraft" @close="resDraft = null">
      <template #header>
        <p class="flex items-center gap-2 font-display text-lg font-extrabold text-tikeo-black"><span class="flex h-9 w-9 items-center justify-center bg-tikeo-ink text-white dark:bg-[#FF7A00] dark:text-tikeo-ink"><AppIcon :name="resDraft?.id ? 'edit' : 'plus'" class="h-5 w-5" /></span>{{ resDraft?.id ? t('adminPress.editResource') : t('adminPress.newResource') }}</p>
      </template>
      <form v-if="resDraft" id="press-res-form" class="grid gap-4 sm:grid-cols-2" @submit.prevent="saveRes">
        <p v-if="errorMsg" class="acc-alert-error sm:col-span-2">{{ errorMsg }}</p>
        <div><label class="mb-1 block text-xs font-medium text-tikeo-gray-text" for="r-kind">{{ t('adminPress.fieldResKind') }}</label><select id="r-kind" v-model="resDraft.kind" class="input-field w-full"><option v-for="k in PRESS_RESOURCE_KINDS" :key="k" :value="k">{{ t(`press.resourceKinds.${k}`) }}</option></select></div>
        <div><label class="mb-1 block text-xs font-medium text-tikeo-gray-text" for="r-title">{{ t('adminPress.fieldTitle') }} *</label><input id="r-title" v-model="resDraft.title" type="text" maxlength="80" required class="input-field w-full" :placeholder="t('adminPress.resTitlePlaceholder')" /></div>
        <div class="sm:col-span-2"><label class="mb-1 block text-xs font-medium text-tikeo-gray-text" for="r-desc">{{ t('adminPress.fieldDescription') }}</label><input id="r-desc" v-model="resDraft.description" type="text" maxlength="200" class="input-field w-full" /></div>
        <div class="sm:col-span-2"><MediaInput :model-value="resDraft.file_url || ''" folder="press" allow-pdf :label="t('adminPress.fieldFile')" @update:model-value="resDraft!.file_url = $event" /><p class="mt-1 text-[11px] text-tikeo-gray-text">{{ t('adminPress.fileHint') }}</p></div>
        <label class="flex items-center justify-between gap-3 border border-tikeo-border p-3 sm:col-span-2"><span><span class="flex items-center gap-1.5 text-sm font-bold text-tikeo-black"><AppIcon name="eye" class="h-4 w-4 text-tikeo-orange" />{{ t('adminPress.fieldVisible') }}</span><span class="mt-0.5 block text-[11px] text-tikeo-gray-text">{{ t('adminPress.visibleHint') }}</span></span><ToggleSwitch :model-value="resDraft.status === 'active'" :aria-label="t('adminPress.fieldVisible')" @update:model-value="resDraft!.status = $event ? 'active' : 'inactive'" /></label>
      </form>
      <template #footer>
        <div class="flex flex-wrap justify-end gap-2">
          <button type="button" class="acc-btn-ghost !text-[13px]" @click="resDraft = null"><AppIcon name="close" class="h-[18px] w-[18px]" />{{ t('adminPress.cancel') }}</button>
          <button type="submit" form="press-res-form" class="btn-ink !h-10 !px-4 !text-[13px]" :disabled="saving || !resDraft?.title?.trim() || !resDraft?.file_url?.trim()"><AppIcon name="save" class="h-[18px] w-[18px]" />{{ saving ? t('adminPress.saving') : t('adminPress.save') }}</button>
        </div>
      </template>
    </AdminModal>
  </div>
</template>
