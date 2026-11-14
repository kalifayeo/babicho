<script setup lang="ts">
/** Carte d'article. `variant="feature"` = grande carte horizontale (article à la une). */
import type { BlogPostSummary } from '~/types/database'
import { BLOG_CATEGORY_ICONS, formatPostDate } from '~/composables/useBlog'

const props = withDefaults(defineProps<{ post: BlogPostSummary; variant?: 'card' | 'feature'; compact?: boolean }>(), { variant: 'card', compact: false })
const { t, locale } = useI18n()
const dateText = computed(() => formatPostDate(props.post.published_at, locale.value))
</script>

<template>
  <NuxtLink
    :to="`/blog/${post.slug}`"
    class="group flex overflow-hidden rounded-[1.75rem] border border-tikeo-border bg-tikeo-surface shadow-card transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1.5 hover:border-[#FF7A00]/60 hover:shadow-[0_28px_44px_-22px_rgb(14_34_64/0.4)]"
    :class="variant === 'feature' ? 'flex-col md:flex-row' : 'flex-col'"
  >
    <span class="relative m-2 block shrink-0 overflow-hidden rounded-[1.4rem] bg-tikeo-ink" :class="variant === 'feature' ? 'aspect-[16/10] md:aspect-auto md:min-h-[22rem] md:w-[52%]' : compact ? 'aspect-[16/9]' : 'aspect-[16/10]'">
      <img v-if="post.cover_url" :src="post.cover_url" :alt="post.title" loading="lazy" decoding="async" class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
      <span v-else class="absolute inset-0 flex items-center justify-center bg-tikeo-brand"><AppIcon name="newspaper" class="h-14 w-14 text-white/80" :stroke="1.5" /></span>
      <span class="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-[#FF7A00] px-3 py-1.5 text-[11px] font-bold text-tikeo-ink">
        <AppIcon :name="BLOG_CATEGORY_ICONS[post.category]" class="h-3 w-3" :stroke="2.4" />{{ t(`blog.categories.${post.category}`) }}
      </span>
    </span>
    <span class="flex flex-1 flex-col" :class="[compact ? 'p-3' : 'px-5 pb-5 pt-3', variant === 'feature' ? 'md:justify-center md:p-9' : '']">
      <span class="text-xs font-semibold text-tikeo-gray-text">{{ dateText }}<template v-if="post.author_name"> · {{ post.author_name }}</template></span>
      <span class="mt-1.5 font-display font-extrabold leading-tight tracking-tight text-tikeo-black group-hover:text-tikeo-orange" :class="variant === 'feature' ? 'text-2xl md:text-4xl' : compact ? 'line-clamp-2 text-sm md:text-[15px]' : 'line-clamp-2 text-lg'">{{ post.title }}</span>
      <span v-if="post.excerpt && !compact" class="mt-2 text-sm leading-relaxed text-tikeo-gray-text" :class="variant === 'feature' ? 'line-clamp-4 md:text-base' : 'line-clamp-3'">{{ post.excerpt }}</span>
      <span class="mt-auto inline-flex items-center gap-1.5 pt-4 font-bold text-tikeo-black" :class="compact ? 'text-xs md:text-[13px]' : 'text-sm'">{{ t('blog.readMore') }}<AppIcon name="arrow-right" class="h-4 w-4 text-tikeo-orange transition-transform duration-300 group-hover:translate-x-1" :stroke="2.2" /></span>
    </span>
  </NuxtLink>
</template>
