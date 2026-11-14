<script setup lang="ts">
import type { BlogCategory } from '~/types/database'
import { BLOG_CATEGORIES, BLOG_CATEGORY_ICONS } from '~/composables/useBlog'

const { t } = useI18n()
const { posts, loading } = useBlogList()

useSeoMeta({
  title: () => `${t('blog.pageTitle')} | Babicho`,
  description: () => t('blog.pageIntro'),
  ogTitle: () => `${t('blog.pageTitle')} | Babicho`,
  ogDescription: () => t('blog.pageIntro'),
})

const search = ref('')
const category = ref<BlogCategory | 'all'>('all')
const PAGE_SIZE = 9
const shown = ref(PAGE_SIZE)

const categoriesInUse = computed(() => BLOG_CATEGORIES.filter((c) => posts.value.some((p) => p.category === c)))
const filtering = computed(() => category.value !== 'all' || !!search.value.trim())

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return posts.value.filter((p) => {
    if (category.value !== 'all' && p.category !== category.value) return false
    if (q && !`${p.title} ${p.excerpt ?? ''}`.toLowerCase().includes(q)) return false
    return true
  })
})
// Sans filtre, l'article « à la une » (sinon le plus récent) passe en grand.
const featuredPost = computed(() => (filtering.value ? null : posts.value.find((p) => p.is_featured) ?? posts.value[0] ?? null))
const gridPosts = computed(() => filtered.value.filter((p) => p.id !== featuredPost.value?.id))
const visiblePosts = computed(() => gridPosts.value.slice(0, shown.value))

watch([search, category], () => (shown.value = PAGE_SIZE))
</script>

<template>
  <div>
    <PageHero :eyebrow="t('blog.eyebrow')" :title="t('blog.pageTitle')" :subtitle="t('blog.pageIntro')" />

    <section class="mx-auto max-w-tikeo-content px-4 py-10 md:px-6 md:py-14">
      <!-- Recherche + catégories -->
      <div v-if="posts.length" class="mb-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div v-if="categoriesInUse.length > 1" class="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0" role="tablist" :aria-label="t('blog.filterLabel')">
          <button type="button" role="tab" :aria-selected="category === 'all'" class="flex h-11 shrink-0 items-center gap-2 rounded-full border px-5 text-sm font-bold transition-all active:scale-95" :class="category === 'all' ? 'border-tikeo-ink bg-tikeo-ink text-white dark:border-[#FF7A00] dark:bg-[#FF7A00] dark:text-tikeo-ink' : 'border-tikeo-border bg-tikeo-surface text-tikeo-black hover:border-tikeo-ink dark:hover:border-[#FF7A00]'" @click="category = 'all'">{{ t('blog.all') }}</button>
          <button v-for="c in categoriesInUse" :key="c" type="button" role="tab" :aria-selected="category === c" class="flex h-11 shrink-0 items-center gap-2 rounded-full border px-5 text-sm font-bold transition-all active:scale-95" :class="category === c ? 'border-tikeo-ink bg-tikeo-ink text-white dark:border-[#FF7A00] dark:bg-[#FF7A00] dark:text-tikeo-ink' : 'border-tikeo-border bg-tikeo-surface text-tikeo-black hover:border-tikeo-ink dark:hover:border-[#FF7A00]'" @click="category = c">
            <AppIcon :name="BLOG_CATEGORY_ICONS[c]" class="h-4 w-4" />{{ t(`blog.categories.${c}`) }}
          </button>
        </div>
        <AdminSearch v-model="search" :placeholder="t('blog.search')" class="blog-search lg:w-80" />
      </div>

      <div v-if="loading" class="grid gap-5 md:grid-cols-2 lg:grid-cols-3"><div v-for="i in 3" :key="i" class="h-80 animate-pulse rounded-[1.75rem] bg-tikeo-border" /></div>
      <AdminEmpty v-else-if="!posts.length" icon="newspaper" :text="t('blog.empty')" />

      <template v-else>
        <div v-if="featuredPost" v-reveal:up class="mb-8"><BlogCard :post="featuredPost" variant="feature" /></div>

        <AdminEmpty v-if="!visiblePosts.length && !featuredPost" icon="search" :text="t('blog.noResult')" />
        <ul v-else v-stagger:up="{ step: 80 }" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <li v-for="p in visiblePosts" :key="p.id" class="flex"><BlogCard :post="p" class="w-full" /></li>
        </ul>

        <div v-if="gridPosts.length > shown" class="mt-10 text-center">
          <button type="button" class="acc-btn-ghost !h-12 !px-7" @click="shown += PAGE_SIZE">{{ t('blog.loadMore') }}<AppIcon name="chevron-down" class="h-4 w-4" :stroke="2.2" /></button>
        </div>
      </template>
    </section>
  </div>
</template>

<style>
.blog-search, .blog-search input { border-radius: 9999px; }
</style>
