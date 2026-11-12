<script setup lang="ts">
import { BLOG_CATEGORY_ICONS, formatPostDate } from '~/composables/useBlog'
import { toAbsoluteUrl } from '~/composables/useSiteOrigin'
import { readingMinutes } from '~/utils/markdown'

const route = useRoute()
const { t, locale } = useI18n()
const slug = String(route.params.slug)
const { post, related, loading, notFound } = useBlogPost(slug)
const origin = useSiteOrigin()

const url = computed(() => `${origin}/blog/${slug}`)
const dateText = computed(() => formatPostDate(post.value?.published_at, locale.value))
const minutes = computed(() => readingMinutes(post.value?.content || ''))

useSeoMeta({
  title: () => (post.value ? `${post.value.title} | Babicho` : `${t('blog.pageTitle')} | Babicho`),
  description: () => post.value?.excerpt || t('blog.pageIntro'),
  ogTitle: () => post.value?.title,
  ogDescription: () => post.value?.excerpt || t('blog.pageIntro'),
  ogType: 'article',
  ogImage: () => toAbsoluteUrl(post.value?.cover_url, origin) || `${origin}/og-default.jpg`,
  twitterCard: 'summary_large_image',
  robots: () => (notFound.value ? 'noindex, nofollow' : undefined),
})

useHead({
  link: [{ rel: 'canonical', href: () => (post.value ? url.value : undefined) }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: () =>
        post.value
          ? JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BlogPosting',
              headline: post.value.title,
              description: post.value.excerpt || undefined,
              image: toAbsoluteUrl(post.value.cover_url, origin),
              datePublished: post.value.published_at,
              dateModified: post.value.updated_at,
              author: { '@type': 'Person', name: post.value.author_name || 'Babicho' },
              publisher: { '@type': 'Organization', name: 'Babicho' },
              mainEntityOfPage: url.value,
            }).replace(/</g, '\\u003c')
          : undefined,
    },
  ],
})

const copied = ref(false)
async function copyLink() {
  try {
    await navigator.clipboard.writeText(url.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    /* presse-papiers indisponible : le lien reste copiable via la barre d'adresse */
  }
}
const shareLinks = computed(() => {
  const u = encodeURIComponent(url.value)
  const text = encodeURIComponent(post.value?.title || '')
  return [
    { key: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${text}%20${u}` },
    { key: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { key: 'x', label: 'X', href: `https://twitter.com/intent/tweet?url=${u}&text=${text}` },
  ]
})
</script>

<template>
  <div>
    <div v-if="loading" class="mx-auto max-w-3xl space-y-4 px-4 py-16"><div class="h-10 w-3/4 animate-pulse bg-tikeo-border" /><div class="h-64 animate-pulse bg-tikeo-border" /></div>

    <section v-else-if="notFound || !post" class="mx-auto max-w-xl px-4 py-24 text-center">
      <AdminEmpty icon="newspaper" :text="t('blog.notFound')"><NuxtLink to="/blog" class="btn-ink">{{ t('blog.backToBlog') }}</NuxtLink></AdminEmpty>
    </section>

    <template v-else>
      <header class="relative isolate overflow-hidden bg-tikeo-ink text-white">
        <img v-if="post.cover_url" :src="post.cover_url" alt="" class="absolute inset-0 -z-20 h-full w-full object-cover opacity-40" fetchpriority="high" />
        <div class="absolute inset-0 -z-10 bg-gradient-to-t from-tikeo-ink via-tikeo-ink/70 to-tikeo-ink/40" aria-hidden="true" />
        <div class="absolute inset-x-0 top-0 h-1 bg-tikeo-brand" aria-hidden="true" />
        <div class="mx-auto max-w-3xl px-4 pb-10 pt-10 md:px-6 md:pb-16 md:pt-16">
          <NuxtLink to="/blog" class="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-white/70 transition-colors hover:text-white"><AppIcon name="arrow-left" class="h-4 w-4" :stroke="2.2" />{{ t('blog.backToBlog') }}</NuxtLink>
          <p class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#FF9A3D]"><AppIcon :name="BLOG_CATEGORY_ICONS[post.category]" class="h-4 w-4" :stroke="2.2" />{{ t(`blog.categories.${post.category}`) }}</p>
          <h1 class="mt-3 font-display text-[2rem] font-extrabold leading-[1.08] tracking-tight sm:text-4xl md:text-5xl">{{ post.title }}</h1>
          <p v-if="post.excerpt" class="mt-4 text-base leading-relaxed text-white/80 md:text-lg">{{ post.excerpt }}</p>
          <p class="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold text-white/70">
            <span v-if="post.author_name" class="flex items-center gap-1.5"><AppIcon name="user" class="h-4 w-4 text-[#FF7A00]" />{{ post.author_name }}</span>
            <span class="flex items-center gap-1.5"><AppIcon name="calendar" class="h-4 w-4 text-[#FF7A00]" />{{ dateText }}</span>
            <span class="flex items-center gap-1.5"><AppIcon name="clock" class="h-4 w-4 text-[#FF7A00]" />{{ t('blog.readingTime', { n: minutes }) }}</span>
          </p>
        </div>
      </header>

      <article class="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
        <img v-if="post.cover_url" :src="post.cover_url" :alt="post.title" class="mb-10 w-full border border-tikeo-border object-cover" />
        <BlogContent :source="post.content" />

        <!-- Partage -->
        <div class="mt-12 flex flex-wrap items-center gap-2 border-t border-tikeo-border pt-6">
          <span class="mr-2 flex items-center gap-2 text-sm font-bold text-tikeo-black"><AppIcon name="share" class="h-4 w-4 text-tikeo-orange" />{{ t('blog.share') }}</span>
          <a v-for="s in shareLinks" :key="s.key" :href="s.href" target="_blank" rel="noopener noreferrer" class="acc-btn-ghost !h-9 !px-3 !text-[13px]">{{ s.label }}</a>
          <button type="button" class="acc-btn-ghost !h-9 !px-3 !text-[13px]" @click="copyLink"><AppIcon :name="copied ? 'check' : 'copy'" class="h-4 w-4" />{{ copied ? t('blog.copied') : t('blog.copyLink') }}</button>
        </div>
      </article>

      <!-- CTA -->
      <section class="mx-auto max-w-3xl px-4 md:px-6">
        <div class="flex flex-col items-start justify-between gap-4 bg-tikeo-ink p-6 text-white sm:flex-row sm:items-center md:p-8">
          <div>
            <p class="font-display text-xl font-extrabold">{{ t('blog.ctaTitle') }}</p>
            <p class="mt-1 text-sm text-white/70">{{ t('blog.ctaText') }}</p>
          </div>
          <NuxtLink to="/evenements" class="btn-brand shrink-0">{{ t('blog.ctaButton') }}</NuxtLink>
        </div>
      </section>

      <!-- Articles liés -->
      <section v-if="related.length" class="mx-auto max-w-tikeo-container px-4 py-12 md:px-6 md:py-16">
        <h2 class="mb-6 flex items-center gap-2 font-display text-xl font-extrabold tracking-tight text-tikeo-black md:text-2xl"><span class="h-[3px] w-6 bg-[#FF7A00]" aria-hidden="true" />{{ t('blog.related') }}</h2>
        <ul class="grid gap-5 md:grid-cols-3"><li v-for="p in related" :key="p.id" class="flex"><BlogCard :post="p" class="w-full" /></li></ul>
      </section>
    </template>
  </div>
</template>
