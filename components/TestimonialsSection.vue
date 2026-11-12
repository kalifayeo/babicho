<script setup lang="ts">
/**
 * Témoignages de l'accueil (gérés dans /admin/temoignages) : un témoignage
 * mis en avant + une grille de 4 avis, avec onglets Tous / Organisateurs /
 * Participants. Sur mobile, les avis défilent en bandeau horizontal (moins
 * de hauteur). La section disparaît tant qu'il n'y a aucun témoignage actif.
 */
import type { Testimonial, TestimonialType } from '~/types/database'

const { t } = useI18n()
const { items } = useTestimonials()

const tab = ref<'all' | TestimonialType>('all')
const tabs = computed(() => [
  { key: 'all' as const, label: t('testimonials.tabAll'), icon: 'users' },
  { key: 'organizer' as const, label: t('testimonials.tabOrganizers'), icon: 'briefcase' },
  { key: 'attendee' as const, label: t('testimonials.tabAttendees'), icon: 'ticket' },
])
// On ne propose un onglet que s'il y a des témoignages de ce type.
const availableTabs = computed(() => tabs.value.filter((x) => x.key === 'all' || items.value.some((i) => i.author_type === x.key)))
const filtered = computed(() => (tab.value === 'all' ? items.value : items.value.filter((i) => i.author_type === tab.value)))

// Le premier témoignage « à la une » (sinon le premier) est mis en grand.
const hero = computed<Testimonial | null>(() => filtered.value.find((i) => i.is_featured) ?? filtered.value[0] ?? null)
const others = computed(() => filtered.value.filter((i) => i.id !== hero.value?.id).slice(0, 4))

function initials(name: string) {
  return name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?'
}
function roleLine(it: Testimonial) {
  return [it.author_role, it.city].filter(Boolean).join(' · ')
}
</script>

<template>
  <section v-if="items.length" class="testi-band relative mt-10 overflow-hidden border-y border-tikeo-border bg-tikeo-surface-alt md:mt-14" aria-labelledby="testimonials-title">
    <!-- Fond : points discrets + deux halos de la marque -->
    <div class="testi-dots pointer-events-none absolute inset-0" aria-hidden="true" />
    <div class="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-[#FF7A00]/10 blur-3xl" aria-hidden="true" />
    <div class="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-tikeo-blue/10 blur-3xl" aria-hidden="true" />

    <div class="relative mx-auto max-w-tikeo-container px-4 py-7 md:px-6 md:py-10">
      <SectionHeading :eyebrow="t('testimonials.eyebrow')" :title="t('testimonials.title')" :subtitle="t('testimonials.subtitle')" title-id="testimonials-title">
        <div v-if="availableTabs.length > 2" class="no-scrollbar flex gap-1.5 overflow-x-auto" role="tablist" :aria-label="t('testimonials.title')">
          <button
            v-for="x in availableTabs"
            :key="x.key"
            type="button"
            role="tab"
            :aria-selected="tab === x.key"
            class="flex h-8 shrink-0 items-center gap-1.5 border px-2.5 text-xs font-bold transition-colors"
            :class="tab === x.key ? 'border-tikeo-ink bg-tikeo-ink text-white dark:border-[#FF7A00] dark:bg-[#FF7A00] dark:text-tikeo-ink' : 'border-tikeo-border bg-tikeo-surface text-tikeo-black hover:border-tikeo-ink dark:hover:border-[#FF7A00]'"
            @click="tab = x.key"
          >
            <AppIcon :name="x.icon" class="h-3.5 w-3.5" />{{ x.label }}
          </button>
        </div>
      </SectionHeading>

      <div v-if="hero" class="mt-5 grid gap-3 md:gap-4" :class="others.length ? 'lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]' : ''">
        <!-- Témoignage à la une -->
        <figure :key="hero.id" v-reveal:left class="relative isolate flex flex-col justify-between overflow-hidden bg-tikeo-ink p-4 text-white shadow-card md:p-6">
          <div class="absolute inset-x-0 top-0 h-1 bg-tikeo-brand" aria-hidden="true" />
          <div class="pointer-events-none absolute -bottom-16 -right-10 -z-10 h-52 w-52 rounded-full bg-[#FF7A00]/20 blur-3xl" aria-hidden="true" />
          <AppIcon name="quote" class="pointer-events-none absolute right-3 top-4 -z-10 h-16 w-16 text-white/[0.06] md:h-24 md:w-24" :stroke="1.5" />
          <span class="flex h-8 w-8 items-center justify-center bg-[#FF7A00] text-tikeo-ink"><AppIcon name="quote" class="h-4 w-4" :stroke="2.2" /></span>
          <blockquote class="mt-3 text-sm font-semibold leading-relaxed md:text-base">{{ hero.content }}</blockquote>
          <figcaption class="mt-4 flex items-center gap-3 border-t border-white/10 pt-3.5">
            <img v-if="hero.avatar_url" :src="hero.avatar_url" alt="" class="h-10 w-10 shrink-0 rounded-full border-2 border-[#FF7A00] object-cover" loading="lazy" />
            <span v-else class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FF7A00] font-display text-sm font-extrabold text-tikeo-ink">{{ initials(hero.author_name) }}</span>
            <span class="min-w-0 flex-1">
              <span class="block truncate font-display text-sm font-extrabold">{{ hero.author_name }}</span>
              <span v-if="roleLine(hero)" class="block truncate text-xs text-white/65">{{ roleLine(hero) }}</span>
            </span>
            <StarRow :value="hero.rating" size-class="h-3.5 w-3.5" class="shrink-0" />
          </figcaption>
        </figure>

        <!-- Autres avis : bandeau défilant sur mobile, grille 2×2 dès sm -->
        <ul
          v-if="others.length"
          v-stagger:up="{ step: 110, delay: 150 }"
          class="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 md:gap-4"
        >
          <li v-for="it in others" :key="it.id" class="flex w-[76vw] max-w-[300px] shrink-0 snap-start sm:w-auto sm:max-w-none">
            <article class="org-panel org-card-hover flex w-full flex-col p-3.5">
              <div class="flex items-center justify-between gap-2">
                <StarRow :value="it.rating" size-class="h-3.5 w-3.5" />
                <span class="acc-tag !px-1.5 !text-[10px]" :class="it.author_type === 'organizer' ? 'bg-tikeo-ink text-white dark:bg-[#FF7A00] dark:text-tikeo-ink' : 'bg-tikeo-blue/10 text-tikeo-blue'">
                  {{ it.author_type === 'organizer' ? t('testimonials.organizer') : t('testimonials.attendee') }}
                </span>
              </div>
              <p class="mt-2 line-clamp-4 flex-1 text-[13px] leading-relaxed text-tikeo-black md:line-clamp-3">{{ it.content }}</p>
              <div class="mt-3 flex items-center gap-2.5 border-t border-tikeo-border pt-2.5">
                <img v-if="it.avatar_url" :src="it.avatar_url" alt="" class="h-7 w-7 shrink-0 rounded-full object-cover" loading="lazy" />
                <span v-else class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tikeo-brand text-[11px] font-bold text-white">{{ initials(it.author_name) }}</span>
                <span class="min-w-0">
                  <span class="block truncate text-xs font-bold text-tikeo-black">{{ it.author_name }}</span>
                  <span v-if="roleLine(it)" class="block truncate text-[11px] text-tikeo-gray-text">{{ roleLine(it) }}</span>
                </span>
              </div>
            </article>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.testi-dots {
  background-image: radial-gradient(rgb(var(--tikeo-text-primary) / 0.07) 1px, transparent 1px);
  background-size: 18px 18px;
  -webkit-mask-image: linear-gradient(to bottom, #000, transparent 90%);
  mask-image: linear-gradient(to bottom, #000, transparent 90%);
}
</style>
