<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin', adminPermission: 'testimonials.manage' })

import type { Testimonial, TestimonialType } from '~/types/database'

const { t } = useI18n()
const { askConfirm } = useAdminConfirm()
const api = useAdminTestimonials()

const search = ref('')
const typeFilter = ref<'all' | TestimonialType>('all')
const statusFilter = ref<'all' | 'active' | 'inactive' | 'featured'>('all')
const draft = ref<Partial<Testimonial> | null>(null)
const saving = ref(false)
const message = ref('')
const errorMsg = ref('')
const busyId = ref<string | null>(null)

const stats = computed(() => [
  { key: 'all', icon: 'quote', value: api.items.value.length, label: t('adminTestimonials.statTotal') },
  { key: 'active', icon: 'check-circle', value: api.items.value.filter((i) => i.status === 'active').length, label: t('adminTestimonials.statActive') },
  { key: 'featured', icon: 'star', value: api.items.value.filter((i) => i.is_featured).length, label: t('adminTestimonials.statFeatured') },
  { key: 'inactive', icon: 'pause', value: api.items.value.filter((i) => i.status === 'inactive').length, label: t('adminTestimonials.statInactive') },
])
const canReorder = computed(() => !search.value.trim() && typeFilter.value === 'all' && statusFilter.value === 'all')
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return api.sorted.value.filter((i) => {
    if (typeFilter.value !== 'all' && i.author_type !== typeFilter.value) return false
    if (statusFilter.value === 'active' && i.status !== 'active') return false
    if (statusFilter.value === 'inactive' && i.status !== 'inactive') return false
    if (statusFilter.value === 'featured' && !i.is_featured) return false
    if (q && !`${i.author_name} ${i.author_role ?? ''} ${i.content}`.toLowerCase().includes(q)) return false
    return true
  })
})
const indexInAll = (i: Testimonial) => api.sorted.value.findIndex((x) => x.id === i.id)

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
    errorMsg.value = e?.message || t('adminTestimonials.error')
    return false
  }
}
async function run(i: Testimonial, fn: () => Promise<unknown>, ok?: string) {
  busyId.value = i.id
  await guarded(fn, ok)
  busyId.value = null
}

function openForm(i?: Testimonial) {
  errorMsg.value = ''
  draft.value = i
    ? { ...i, author_role: i.author_role || '', city: i.city || '', avatar_url: i.avatar_url || '' }
    : { author_name: '', author_role: '', city: '', author_type: 'attendee', content: '', rating: 5, avatar_url: '', is_featured: false, status: 'active' }
}
async function save() {
  const d = draft.value
  if (!d || !d.author_name?.trim() || !d.content?.trim()) return
  saving.value = true
  const payload = {
    author_name: d.author_name.trim(),
    author_role: d.author_role?.trim() || null,
    city: d.city?.trim() || null,
    author_type: d.author_type || 'attendee',
    content: d.content.trim(),
    rating: Math.min(5, Math.max(1, Number(d.rating) || 5)),
    avatar_url: d.avatar_url?.trim() || null,
    is_featured: !!d.is_featured,
    status: d.status || 'inactive',
  }
  const ok = await guarded(() => (d.id ? api.update(d.id, payload) : api.create(payload)), d.id ? t('adminTestimonials.updated') : t('adminTestimonials.created'))
  saving.value = false
  if (ok) draft.value = null
}
async function remove(i: Testimonial) {
  const ok = await askConfirm({ title: t('adminTestimonials.deleteTitle'), message: t('adminTestimonials.deleteConfirm', { name: i.author_name }), confirmLabel: t('adminTestimonials.delete') })
  if (ok) await run(i, () => api.remove(i.id), t('adminTestimonials.deleted'))
}
function initials(name: string) {
  return name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?'
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-8 md:px-6">
    <div class="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-tikeo-black">{{ t('adminTestimonials.title') }}</h1>
        <p class="mt-1 max-w-xl text-sm text-tikeo-gray-text">{{ t('adminTestimonials.subtitle') }}</p>
      </div>
      <button type="button" class="btn-ink !h-10 !px-4 !text-[13px]" @click="openForm()"><AppIcon name="plus" class="h-[18px] w-[18px]" :stroke="2.2" />{{ t('adminTestimonials.add') }}</button>
    </div>

    <p v-if="errorMsg && !draft" class="acc-alert-error mb-4">{{ errorMsg }}</p>
    <p v-if="message" class="acc-alert-success mb-4">{{ message }}</p>

    <div class="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
      <button v-for="s in stats" :key="s.key" type="button" class="org-panel org-card-hover flex items-center gap-3 p-3 text-left" :class="statusFilter === s.key ? '!border-tikeo-ink dark:!border-[#FF7A00]' : ''" :aria-pressed="statusFilter === s.key" @click="statusFilter = s.key as any">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center bg-tikeo-ink text-white dark:bg-[#FF7A00] dark:text-tikeo-ink"><AppIcon :name="s.icon" class="h-5 w-5" /></span>
        <span class="min-w-0"><span class="block font-display text-2xl font-extrabold leading-none text-tikeo-black">{{ s.value }}</span><span class="mt-1 block truncate text-[11px] font-semibold text-tikeo-gray-text">{{ s.label }}</span></span>
      </button>
    </div>

    <div class="mb-5 flex flex-col gap-2 sm:flex-row">
      <AdminSearch v-model="search" :placeholder="t('adminTestimonials.search')" class="sm:flex-1" />
      <select v-model="typeFilter" class="input-field sm:w-56" :aria-label="t('adminTestimonials.fieldType')">
        <option value="all">{{ t('testimonials.tabAll') }}</option>
        <option value="organizer">{{ t('testimonials.tabOrganizers') }}</option>
        <option value="attendee">{{ t('testimonials.tabAttendees') }}</option>
      </select>
    </div>

    <div v-if="api.loading.value" class="space-y-3"><div v-for="i in 3" :key="i" class="h-24 animate-pulse bg-tikeo-border" /></div>
    <AdminEmpty v-else-if="!api.items.value.length" icon="quote" :text="t('adminTestimonials.empty')">
      <button type="button" class="btn-ink !h-10 !px-4 !text-[13px]" @click="openForm()"><AppIcon name="plus" class="h-[18px] w-[18px]" :stroke="2.2" />{{ t('adminTestimonials.addFirst') }}</button>
    </AdminEmpty>
    <AdminEmpty v-else-if="!filtered.length" icon="search" :text="t('adminTestimonials.noResult')" />

    <ul v-else class="space-y-3">
      <li v-for="i in filtered" :key="i.id" class="org-panel org-card-hover flex flex-col gap-3 p-4 sm:flex-row sm:items-center" :class="i.status === 'inactive' ? 'opacity-70' : ''">
        <img v-if="i.avatar_url" :src="i.avatar_url" alt="" class="h-14 w-14 shrink-0 rounded-full border border-tikeo-border object-cover" />
        <span v-else class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-tikeo-brand font-bold text-white">{{ initials(i.author_name) }}</span>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <p class="truncate text-sm font-bold text-tikeo-black">{{ i.author_name }}</p>
            <StarRow :value="i.rating" size-class="h-3.5 w-3.5" />
            <StatusPill :tone="i.status === 'active' ? 'success' : 'neutral'">{{ i.status === 'active' ? t('adminTestimonials.active') : t('adminTestimonials.inactive') }}</StatusPill>
            <span class="acc-tag" :class="i.author_type === 'organizer' ? 'bg-tikeo-ink text-white dark:bg-[#FF7A00] dark:text-tikeo-ink' : 'bg-tikeo-blue/10 text-tikeo-blue'">{{ i.author_type === 'organizer' ? t('testimonials.organizer') : t('testimonials.attendee') }}</span>
            <span v-if="i.is_featured" class="acc-tag bg-[#FF7A00]/15 text-tikeo-orange"><AppIcon name="star" class="mr-1 h-3 w-3" :stroke="2.4" />{{ t('adminTestimonials.featuredTag') }}</span>
          </div>
          <p v-if="i.author_role || i.city" class="mt-0.5 text-xs font-semibold text-tikeo-gray-text">{{ [i.author_role, i.city].filter(Boolean).join(' · ') }}</p>
          <p class="mt-1 line-clamp-2 text-xs text-tikeo-gray-text">{{ i.content }}</p>
        </div>
        <div class="flex shrink-0 flex-wrap items-center gap-1.5">
          <template v-if="canReorder">
            <OrgIconButton icon="arrow-up" :label="t('adminTestimonials.moveUp')" :disabled="indexInAll(i) === 0" :loading="busyId === i.id" @click="run(i, () => api.move(i, -1))" />
            <OrgIconButton icon="arrow-down" :label="t('adminTestimonials.moveDown')" :disabled="indexInAll(i) === api.sorted.value.length - 1" :loading="busyId === i.id" @click="run(i, () => api.move(i, 1))" />
          </template>
          <OrgIconButton icon="star" :label="i.is_featured ? t('adminTestimonials.unfeature') : t('adminTestimonials.feature')" :class="i.is_featured ? '!border-[#FF7A00] !text-tikeo-orange' : ''" @click="run(i, () => api.update(i.id, { is_featured: !i.is_featured }))" />
          <OrgIconButton :icon="i.status === 'active' ? 'pause' : 'play'" :label="i.status === 'active' ? t('adminTestimonials.deactivate') : t('adminTestimonials.activate')" @click="run(i, () => api.update(i.id, { status: i.status === 'active' ? 'inactive' : 'active' }))" />
          <OrgIconButton icon="edit" :label="t('adminTestimonials.edit')" @click="openForm(i)" />
          <OrgIconButton icon="trash" danger :label="t('adminTestimonials.delete')" @click="remove(i)" />
        </div>
      </li>
    </ul>

    <AdminModal :open="!!draft" @close="draft = null">
      <template #header>
        <p class="flex items-center gap-2 font-display text-lg font-extrabold text-tikeo-black">
          <span class="flex h-9 w-9 items-center justify-center bg-tikeo-ink text-white dark:bg-[#FF7A00] dark:text-tikeo-ink"><AppIcon :name="draft?.id ? 'edit' : 'plus'" class="h-5 w-5" /></span>
          {{ draft?.id ? t('adminTestimonials.editTitle') : t('adminTestimonials.newTitle') }}
        </p>
      </template>
      <form v-if="draft" id="testimonial-form" class="grid gap-4 sm:grid-cols-2" @submit.prevent="save">
        <p v-if="errorMsg" class="acc-alert-error sm:col-span-2">{{ errorMsg }}</p>
        <div class="sm:col-span-2">
          <MediaInput :model-value="draft.avatar_url || ''" folder="testimonial-avatars" compact :label="t('adminTestimonials.fieldAvatar')" @update:model-value="draft!.avatar_url = $event" />
          <p class="mt-1 text-[11px] text-tikeo-gray-text">{{ t('adminTestimonials.avatarHint') }}</p>
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-tikeo-gray-text" for="t-name">{{ t('adminTestimonials.fieldName') }} *</label>
          <input id="t-name" v-model="draft.author_name" type="text" maxlength="80" required class="input-field w-full" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-tikeo-gray-text" for="t-type">{{ t('adminTestimonials.fieldType') }}</label>
          <select id="t-type" v-model="draft.author_type" class="input-field w-full">
            <option value="attendee">{{ t('testimonials.attendee') }}</option>
            <option value="organizer">{{ t('testimonials.organizer') }}</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-tikeo-gray-text" for="t-role">{{ t('adminTestimonials.fieldRole') }}</label>
          <input id="t-role" v-model="draft.author_role" type="text" maxlength="80" class="input-field w-full" :placeholder="t('adminTestimonials.rolePlaceholder')" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-tikeo-gray-text" for="t-city">{{ t('adminTestimonials.fieldCity') }}</label>
          <input id="t-city" v-model="draft.city" type="text" maxlength="60" class="input-field w-full" placeholder="Abidjan" />
        </div>
        <div class="sm:col-span-2">
          <span class="mb-1 block text-xs font-medium text-tikeo-gray-text">{{ t('adminTestimonials.fieldRating') }}</span>
          <div class="flex items-center gap-1" role="radiogroup" :aria-label="t('adminTestimonials.fieldRating')">
            <button v-for="n in 5" :key="n" type="button" role="radio" :aria-checked="draft.rating === n" :aria-label="`${n}/5`" class="p-0.5 transition-transform hover:scale-110" @click="draft!.rating = n">
              <svg class="h-7 w-7" :class="n <= (draft.rating || 0) ? 'text-[#FF7A00]' : 'text-tikeo-border'" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.6 6.1 20.7l1.2-6.6L2.5 9.5l6.6-.9L12 2.5z" /></svg>
            </button>
          </div>
        </div>
        <div class="sm:col-span-2">
          <label class="mb-1 block text-xs font-medium text-tikeo-gray-text" for="t-content">{{ t('adminTestimonials.fieldContent') }} *</label>
          <textarea id="t-content" v-model="draft.content" rows="5" maxlength="600" required class="input-field w-full" />
          <p class="mt-1 text-right text-[11px] text-tikeo-gray-text">{{ (draft.content || '').length }}/600</p>
        </div>
        <label class="flex items-center justify-between gap-3 border border-tikeo-border p-3">
          <span><span class="flex items-center gap-1.5 text-sm font-bold text-tikeo-black"><AppIcon name="star" class="h-4 w-4 text-tikeo-orange" />{{ t('adminTestimonials.fieldFeatured') }}</span><span class="mt-0.5 block text-[11px] text-tikeo-gray-text">{{ t('adminTestimonials.featuredHint') }}</span></span>
          <ToggleSwitch :model-value="!!draft.is_featured" :aria-label="t('adminTestimonials.fieldFeatured')" @update:model-value="draft!.is_featured = $event" />
        </label>
        <label class="flex items-center justify-between gap-3 border border-tikeo-border p-3">
          <span><span class="flex items-center gap-1.5 text-sm font-bold text-tikeo-black"><AppIcon name="eye" class="h-4 w-4 text-tikeo-orange" />{{ t('adminTestimonials.fieldVisible') }}</span><span class="mt-0.5 block text-[11px] text-tikeo-gray-text">{{ t('adminTestimonials.visibleHint') }}</span></span>
          <ToggleSwitch :model-value="draft.status === 'active'" :aria-label="t('adminTestimonials.fieldVisible')" @update:model-value="draft!.status = $event ? 'active' : 'inactive'" />
        </label>
      </form>
      <template #footer>
        <div class="flex flex-wrap justify-end gap-2">
          <button type="button" class="acc-btn-ghost !text-[13px]" @click="draft = null"><AppIcon name="close" class="h-[18px] w-[18px]" />{{ t('adminTestimonials.cancel') }}</button>
          <button type="submit" form="testimonial-form" class="btn-ink !h-10 !px-4 !text-[13px]" :disabled="saving || !draft?.author_name?.trim() || !draft?.content?.trim()"><AppIcon name="save" class="h-[18px] w-[18px]" />{{ saving ? t('adminTestimonials.saving') : t('adminTestimonials.save') }}</button>
        </div>
      </template>
    </AdminModal>
  </div>
</template>
