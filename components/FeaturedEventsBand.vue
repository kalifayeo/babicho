<script setup lang="ts">
/**
 * Bandeau « À la une » de l'accueil : les 2-3 prochains événements, remplis
 * automatiquement (voir useFeaturedEvents). Invisible s'il n'y a aucun événement à venir.
 */
const { t, locale } = useI18n()
const { items } = useFeaturedEvents()

const track = ref<HTMLElement | null>(null)
function scrollBand(dir: 1 | -1) {
  const el = track.value
  if (!el) return
  el.scrollBy({ left: dir * Math.max(320, el.clientWidth * 0.8), behavior: 'smooth' })
}

function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString(locale.value, { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '')
}
function priceLabel(price: number) {
  return price === 0 ? t('event.free') : `${t('featured.from')} ${price.toLocaleString('fr-FR')} FCFA`
}
</script>

<template>
  <section v-if="items.length" class="mx-auto max-w-tikeo-container px-4 pt-8 md:px-6 md:pt-14" aria-labelledby="featured-title">
    <div class="mb-5 flex items-end justify-between gap-4">
      <div class="max-w-xl">
        <p class="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-tikeo-gray-text">
          <span class="h-[3px] w-6 bg-[#FF7A00]" aria-hidden="true" />
          {{ t('featured.eyebrow') }}
        </p>
        <h2 id="featured-title" v-reveal:title class="font-display text-2xl font-extrabold tracking-tight text-tikeo-black md:text-4xl">{{ t('featured.title') }}</h2>
      </div>
      <div v-if="items.length > 1" class="hidden shrink-0 items-center gap-2 md:flex">
        <button type="button" :aria-label="t('home.scrollPrev')" class="flex h-11 w-11 items-center justify-center border-2 border-slate-300 bg-tikeo-surface text-tikeo-black transition-colors hover:border-tikeo-ink hover:bg-tikeo-ink hover:text-white dark:border-white/25" @click="scrollBand(-1)">
          <AppIcon name="chevron-left" class="h-4 w-4" :stroke="2.4" />
        </button>
        <button type="button" :aria-label="t('home.scrollNext')" class="flex h-11 w-11 items-center justify-center border-2 border-slate-300 bg-tikeo-surface text-tikeo-black transition-colors hover:border-tikeo-ink hover:bg-tikeo-ink hover:text-white dark:border-white/25" @click="scrollBand(1)">
          <AppIcon name="chevron-right" class="h-4 w-4" :stroke="2.4" />
        </button>
      </div>
    </div>

    <ul ref="track" v-stagger:wipe="{ step: 160 }" class="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:gap-5 md:px-0">
      <li v-for="(it, i) in items" :key="it.id" class="w-[86vw] max-w-[620px] shrink-0 snap-start" :class="items.length === 1 ? 'md:!w-full md:!max-w-none' : 'md:w-[calc(50%-0.625rem)]'">
        <NuxtLink :to="`/e/${it.event.slug}`" class="featured-card group relative block aspect-[4/5] overflow-hidden bg-tikeo-ink text-white sm:aspect-[16/11] md:aspect-[16/9]">
          <img :src="it.event.coverImage" :alt="it.event.title" :loading="i < 2 ? 'eager' : 'lazy'" decoding="async" class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
          <div class="absolute inset-0 bg-gradient-to-t from-tikeo-ink via-tikeo-ink/75 via-40% to-transparent" aria-hidden="true" />
          <div class="absolute inset-x-0 top-0 h-1 bg-tikeo-brand" aria-hidden="true" />

          <span class="absolute left-0 top-4 flex items-center gap-1.5 bg-[#FF7A00] px-3.5 py-2 text-xs font-extrabold uppercase tracking-wider text-tikeo-ink">
            <AppIcon name="star" class="h-3.5 w-3.5" :stroke="2.4" />{{ it.badge || t('featured.badge') }}
          </span>
          <span class="absolute right-4 top-4 flex flex-col items-center bg-white px-3 py-1.5 text-center text-tikeo-ink shadow-lg">
            <span class="text-[10px] font-bold uppercase leading-none tracking-wider text-tikeo-orange">{{ dateLabel(it.event.startDate).split(' ')[0] }}</span>
            <span class="font-display text-xl font-extrabold leading-tight">{{ new Date(it.event.startDate).getDate() }}</span>
          </span>

          <div class="absolute inset-x-0 bottom-0 p-5 md:p-7">
            <p v-if="it.event.category" class="mb-2 text-xs font-bold uppercase tracking-wider text-white/90">{{ it.event.category }}</p>
            <h3 class="line-clamp-2 font-display text-2xl font-extrabold leading-tight tracking-tight text-white md:text-3xl">{{ it.event.title }}</h3>
            <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[15px] font-semibold text-white">
                <span class="flex items-center gap-1.5"><AppIcon name="calendar" class="h-4 w-4 text-[#FF7A00]" />{{ dateLabel(it.event.startDate) }}</span>
                <span v-if="it.event.city" class="flex items-center gap-1.5"><AppIcon name="pin" class="h-4 w-4 text-[#FF7A00]" />{{ it.event.city }}</span>
                <span class="flex items-center gap-1.5"><AppIcon name="ticket" class="h-4 w-4 text-[#FF7A00]" />{{ priceLabel(it.event.priceFrom) }}</span>
              </p>
              <span class="inline-flex h-11 items-center gap-2 bg-[#FF7A00] px-5 text-sm font-extrabold text-tikeo-ink transition-colors group-hover:bg-white">
                {{ t('featured.cta') }}<AppIcon name="arrow-right" class="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" :stroke="2.4" />
              </span>
            </div>
          </div>
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>
