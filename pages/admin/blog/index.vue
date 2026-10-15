<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin', adminPermission: 'blog.manage' })

import { BLOG_CATEGORIES, BLOG_CATEGORY_ICONS, formatPostDate } from '~/composables/useBlog'
import type { BlogCategory } from '~/types/database'

const { t, locale } = useI18n()
const { askConfirm } = useAdminConfirm()
const api = useAdminBlog()
onMounted(api.fetchAll)

const search = ref('')
const category = ref<BlogCategory | 'all'>('all')
const filter = ref<'all' | 'published' | 'scheduled' | 'draft'>('all')
const message = ref('')
const errorMsg = ref('')
const busyId = ref<string | null>(null)

// Programmé = « publié » avec une date de publication dans le futur.
function stateOf(p: { status: string; published_at: string | null }): 'published' | 'scheduled' | 'draft' {
  if (p.status !== 'published') return 'draft'
  return p.published_at && new Date(p.published_at).getTime() > Date.now() ? 'scheduled' : 'published'
}

const stats = computed(() => [
  { key: 'all', icon: 'newspaper', value: api.items.value.length, label: t('adminBlog.statTotal') },
  { key: 'published', icon: 'check-circle', value: api.items.value.filter((p) => stateOf(p) === 'published').length, label: t('adminBlog.statPublished') },
  { key: 'scheduled', icon: 'clock', value: api.items.value.filter((p) => stateOf(p) === 'scheduled').length, label: t('adminBlog.statScheduled') },
  { key: 'draft', icon: 'edit', value: api.items.value.filter((p) => stateOf(p) === 'draft').length, label: t('adminBlog.statDraft') },
])

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return api.items.value.filter((p) => {
    if (category.value !== 'all' && p.category !== category.value) return false
    if (filter.value !== 'all' && stateOf(p) !== filter.value) return false
    if (q && !`${p.title} ${p.excerpt ?? ''}`.toLowerCase().includes(q)) return false
    return true
  })
})

function flash(msg: string) {
  errorMsg.value = ''
  message.value = msg
  setTimeout(() => (message.value = ''), 2500)
}
async function run(id: string, fn: () => Promise<unknown>, ok?: string) {
  busyId.value = id
  errorMsg.value = ''
  try {
    await fn()
    if (ok) flash(ok)
  } catch (e: any) {
    errorMsg.value = e?.message || t('adminBlog.error')
  } finally {
    busyId.value = null
  }
}
function togglePublish(p: { id: string; status: string; published_at: string | null }) {
  const publishing = p.status !== 'published'
  return run(p.id, () => api.update(p.id, { status: publishing ? 'published' : 'draft', published_at: publishing ? p.published_at || new Date().toISOString() : p.published_at }), publishing ? t('adminBlog.published') : t('adminBlog.unpublished'))
}
async function remove(p: { id: string; title: string }) {
  const ok = await askConfirm({ title: t('adminBlog.deleteTitle'), message: t('adminBlog.deleteConfirm', { name: p.title }), confirmLabel: t('adminBlog.delete') })
  if (ok) await run(p.id, () => api.remove(p.id), t('adminBlog.deleted'))
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-8 md:px-6">
    <div class="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-tikeo-black">{{ t('adminBlog.title') }}</h1>
        <p class="mt-1 max-w-xl text-sm text-tikeo-gray-text">{{ t('adminBlog.subtitle') }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <NuxtLink to="/blog" target="_blank" class="acc-btn-ghost !text-[13px]"><AppIcon name="external-link" class="h-[18px] w-[18px]" />{{ t('adminBlog.viewPublic') }}</NuxtLink>
        <NuxtLink to="/admin/blog/nouveau" class="btn-ink !h-10 !px-4 !text-[13px]"><AppIcon name="plus" class="h-[18px] w-[18px]" :stroke="2.2" />{{ t('adminBlog.add') }}</NuxtLink>
      </div>
    </div>

    <p v-if="errorMsg" class="acc-alert-error mb-4">{{ errorMsg }}</p>
    <p v-if="message" class="acc-alert-success mb-4">{{ message }}</p>

    <div class="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
      <button v-for="s in stats" :key="s.key" type="button" class="org-panel org-card-hover flex items-center gap-3 p-3 text-left" :class="filter === s.key ? '!border-tikeo-ink dark:!border-[#FF7A00]' : ''" :aria-pressed="filter === s.key" @click="filter = s.key as any">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center bg-tikeo-ink text-white dark:bg-[#FF7A00] dark:text-tikeo-ink"><AppIcon :name="s.icon" class="h-5 w-5" /></span>
        <span class="min-w-0"><span class="block font-display text-2xl font-extrabold leading-none text-tikeo-black">{{ s.value }}</span><span class="mt-1 block truncate text-[11px] font-semibold text-tikeo-gray-text">{{ s.label }}</span></span>
      </button>
    </div>

    <div class="mb-5 flex flex-col gap-2 sm:flex-row">
      <AdminSearch v-model="search" :placeholder="t('adminBlog.search')" class="sm:flex-1" />
      <select v-model="category" class="input-field sm:w-56" :aria-label="t('adminBlog.fieldCategory')">
        <option value="all">{{ t('blog.all') }}</option>
        <option v-for="c in BLOG_CATEGORIES" :key="c" :value="c">{{ t(`blog.categories.${c}`) }}</option>
      </select>
    </div>

    <div v-if="api.loading.value" class="space-y-3"><div v-for="i in 3" :key="i" class="h-24 animate-pulse bg-tikeo-border" /></div>
    <AdminEmpty v-else-if="!api.items.value.length" icon="newspaper" :text="t('adminBlog.empty')">
      <NuxtLink to="/admin/blog/nouveau" class="btn-ink !h-10 !px-4 !text-[13px]"><AppIcon name="plus" class="h-[18px] w-[18px]" :stroke="2.2" />{{ t('adminBlog.addFirst') }}</NuxtLink>
    </AdminEmpty>
    <AdminEmpty v-else-if="!filtered.length" icon="search" :text="t('adminBlog.noResult')" />

    <ul v-else class="space-y-3">
      <li v-for="p in filtered" :key="p.id" class="org-panel org-card-hover flex flex-col gap-3 p-4 sm:flex-row sm:items-center" :class="stateOf(p) === 'draft' ? 'opacity-80' : ''">
        <img v-if="p.cover_url" :src="p.cover_url" alt="" class="h-20 w-32 shrink-0 object-cover" />
        <span v-else class="flex h-20 w-32 shrink-0 items-center justify-center bg-tikeo-brand"><AppIcon name="newspaper" class="h-8 w-8 text-white/80" /></span>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <NuxtLink :to="`/admin/blog/${p.id}`" class="truncate text-sm font-bold text-tikeo-black hover:text-tikeo-orange">{{ p.title }}</NuxtLink>
            <StatusPill :tone="stateOf(p) === 'published' ? 'success' : stateOf(p) === 'scheduled' ? 'warning' : 'neutral'">{{ t(`adminBlog.state_${stateOf(p)}`) }}</StatusPill>
            <span v-if="p.is_featured" class="acc-tag bg-[#FF7A00]/15 text-tikeo-orange"><AppIcon name="star" class="mr-1 h-3 w-3" :stroke="2.4" />{{ t('adminBlog.featuredTag') }}</span>
          </div>
          <p class="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs font-semibold text-tikeo-gray-text">
            <span class="flex items-center gap-1.5"><AppIcon :name="BLOG_CATEGORY_ICONS[p.category]" class="h-3.5 w-3.5" />{{ t(`blog.categories.${p.category}`) }}</span>
            <span v-if="p.published_at">{{ formatPostDate(p.published_at, locale) }}</span>
            <span v-if="p.author_name">{{ p.author_name }}</span>
          </p>
          <p v-if="p.excerpt" class="mt-1 line-clamp-1 text-xs text-tikeo-gray-text">{{ p.excerpt }}</p>
        </div>
        <div class="flex shrink-0 flex-wrap items-center gap-1.5">
          <OrgIconButton v-if="stateOf(p) === 'published'" icon="eye" :label="t('adminBlog.view')" :to="`/blog/${p.slug}`" />
          <OrgIconButton icon="star" :label="p.is_featured ? t('adminBlog.unfeature') : t('adminBlog.feature')" :class="p.is_featured ? '!border-[#FF7A00] !text-tikeo-orange' : ''" @click="run(p.id, () => api.update(p.id, { is_featured: !p.is_featured }))" />
          <OrgIconButton :icon="p.status === 'published' ? 'pause' : 'play'" :label="p.status === 'published' ? t('adminBlog.unpublish') : t('adminBlog.publish')" :loading="busyId === p.id" @click="togglePublish(p)" />
          <OrgIconButton icon="edit" :label="t('adminBlog.edit')" :to="`/admin/blog/${p.id}`" />
          <OrgIconButton icon="trash" danger :label="t('adminBlog.delete')" @click="remove(p)" />
        </div>
      </li>
    </ul>
  </div>
</template>
