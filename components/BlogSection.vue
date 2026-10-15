<script setup lang="ts">
/**
 * « Actualités » de l'accueil : les 3 derniers articles publiés (masquée s'il
 * n'y en a aucun). Mobile : bandeau horizontal ; desktop : 3 colonnes.
 */
const { t } = useI18n()
const { posts } = useBlogList(3)
</script>

<template>
  <section v-if="posts.length" class="blog-band relative mt-10 overflow-hidden md:mt-14" aria-labelledby="blog-home-title">
    <!-- Fond : quadrillage léger qui s'estompe + halo orangé -->
    <div class="blog-grid pointer-events-none absolute inset-0" aria-hidden="true" />
    <div class="pointer-events-none absolute -right-24 top-0 h-60 w-60 rounded-full bg-[#FF7A00]/10 blur-3xl" aria-hidden="true" />

    <div class="relative mx-auto max-w-tikeo-container px-4 py-2 md:px-6 md:py-4">
      <SectionHeading :eyebrow="t('blog.eyebrow')" :title="t('blog.homeTitle')" :subtitle="t('blog.homeSubtitle')" title-id="blog-home-title">
        <NuxtLink
          to="/blog"
          class="group inline-flex h-8 items-center gap-1.5 border border-tikeo-border bg-tikeo-surface px-3 text-xs font-bold text-tikeo-black transition-colors hover:border-[#FF7A00] hover:bg-[#FF7A00] hover:text-tikeo-ink md:h-9 md:text-[13px]"
        >
          {{ t('blog.seeAll') }}
          <AppIcon name="arrow-right" class="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" :stroke="2.2" />
        </NuxtLink>
      </SectionHeading>

      <ul
        v-stagger:up="{ step: 130 }"
        class="no-scrollbar -mx-4 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:pb-0"
      >
        <li v-for="p in posts" :key="p.id" class="flex w-[78vw] max-w-[320px] shrink-0 snap-start md:w-auto md:max-w-none">
          <BlogCard :post="p" compact class="w-full" />
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.blog-grid {
  background-image:
    linear-gradient(rgb(var(--tikeo-text-primary) / 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgb(var(--tikeo-text-primary) / 0.045) 1px, transparent 1px);
  background-size: 28px 28px;
  -webkit-mask-image: radial-gradient(ellipse 70% 100% at 50% 0%, #000, transparent 75%);
  mask-image: radial-gradient(ellipse 70% 100% at 50% 0%, #000, transparent 75%);
}
</style>
