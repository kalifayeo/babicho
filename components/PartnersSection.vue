<script setup lang="ts">
import { PARTNER_CATEGORY_ICONS, safeExternalUrl } from '~/composables/usePartners'
/**
 * Section « Nos partenaires » de l'accueil. Les partenaires viennent de
 * /admin/partenaires. Mis en avant = grandes cartes ; les autres défilent
 * en bandeau de logos (pause au survol, immobile si l'utilisateur préfère
 * réduire les animations). La section disparaît tant qu'aucun partenaire
 * n'est actif : jamais de bloc vide sur l'accueil.
 */
const { t } = useI18n()
const { partners, featured, regular } = usePartners()

const hasPartners = computed(() => partners.value.length > 0)
// Le bandeau défile sur lui-même : on duplique la liste pour une boucle sans saut.
const marqueeItems = computed(() => (regular.value.length ? [...regular.value, ...regular.value] : []))
// Peu de logos : un bandeau qui défile serait vide par moments, on les range en grille.
const useMarquee = computed(() => regular.value.length >= 6)
</script>

<template>
  <section v-if="hasPartners" class="partners-band relative mt-10 overflow-hidden bg-tikeo-ink text-white md:mt-14" aria-labelledby="partners-title">
    <div class="absolute inset-x-0 top-0 h-1 bg-tikeo-brand" aria-hidden="true" />
    <div class="partners-dots pointer-events-none absolute inset-0" aria-hidden="true" />
    <div v-parallax="0.12" class="pointer-events-none absolute -left-20 top-6 h-48 w-48 rounded-full bg-[#FF7A00]/15 blur-3xl" aria-hidden="true" />
    <div v-parallax="-0.1" class="pointer-events-none absolute -bottom-16 -right-10 h-56 w-56 rounded-full bg-tikeo-blue/25 blur-3xl" aria-hidden="true" />

    <div class="relative mx-auto max-w-tikeo-container px-4 py-7 md:px-6 md:py-9">
      <SectionHeading dark :eyebrow="t('partners.eyebrow')" :title="t('partners.title')" :subtitle="t('partners.subtitle')" title-id="partners-title">
        <NuxtLink to="/partenaires" class="group inline-flex h-8 items-center gap-1.5 border border-white/25 px-3 text-xs font-bold text-white transition-colors hover:border-[#FF7A00] hover:bg-[#FF7A00] hover:text-tikeo-ink md:h-9 md:text-[13px]">
          {{ t('partners.seeAll') }}
          <AppIcon name="arrow-right" class="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" :stroke="2.2" />
        </NuxtLink>
      </SectionHeading>

      <!-- Partenaires mis en avant : bandeau défilant sur mobile, grille dès sm -->
      <ul
        v-if="featured.length"
        v-stagger:up="{ step: 120 }"
        class="no-scrollbar -mx-4 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3"
      >
        <li v-for="p in featured" :key="p.id" class="partner-card group relative flex w-[78vw] max-w-[300px] shrink-0 snap-start flex-col border border-white/10 bg-white/[0.04] p-3.5 sm:w-auto sm:max-w-none">
          <span class="absolute right-0 top-0 flex items-center gap-1 bg-[#FF7A00] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-tikeo-ink">
            <AppIcon name="star" class="h-2.5 w-2.5" :stroke="2.4" />{{ t('partners.featuredBadge') }}
          </span>
          <div class="flex items-center gap-3">
            <span class="block h-12 w-12 shrink-0 border border-white/10 md:h-14 md:w-14"><PartnerLogo :partner="p" /></span>
            <div class="min-w-0">
              <h3 class="truncate font-display text-[15px] font-extrabold leading-tight">{{ p.name }}</h3>
              <p class="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-white/60">
                <AppIcon :name="PARTNER_CATEGORY_ICONS[p.category]" class="h-3 w-3 text-[#FF7A00]" />{{ t(`partners.categories.${p.category}`) }}
              </p>
            </div>
          </div>
          <p v-if="p.description" class="mt-2.5 line-clamp-2 text-xs leading-relaxed text-white/70 md:text-[13px]">{{ p.description }}</p>
          <a
            v-if="safeExternalUrl(p.website_url)"
            :href="safeExternalUrl(p.website_url)"
            target="_blank"
            rel="noopener noreferrer nofollow"
            class="mt-auto inline-flex items-center gap-1.5 pt-2.5 text-xs font-bold text-white underline decoration-[#FF7A00] decoration-2 underline-offset-[5px] transition-colors hover:text-[#FF9A3D] md:text-[13px]"
          >
            {{ t('partners.visit') }}<AppIcon name="arrow-up-right" class="h-3.5 w-3.5" :stroke="2.2" />
          </a>
        </li>
      </ul>

      <!-- Autres partenaires : bandeau défilant, ou grille s'ils sont peu nombreux -->
      <div v-if="regular.length" class="mt-4 border-t border-white/10 pt-4">
        <div v-if="useMarquee" class="partner-marquee group/marquee relative -mx-4 overflow-hidden md:-mx-6">
          <div class="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-tikeo-ink to-transparent md:w-24" aria-hidden="true" />
          <div class="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-tikeo-ink to-transparent md:w-24" aria-hidden="true" />
          <ul class="partner-track flex w-max">
            <li v-for="(p, i) in marqueeItems" :key="`${p.id}-${i}`" class="mr-2.5" :aria-hidden="i >= regular.length ? 'true' : undefined">
              <component
                :is="safeExternalUrl(p.website_url) ? 'a' : 'div'"
                v-bind="safeExternalUrl(p.website_url) ? { href: safeExternalUrl(p.website_url), target: '_blank', rel: 'noopener noreferrer nofollow', tabindex: i >= regular.length ? -1 : undefined } : {}"
                :title="p.name"
                class="partner-tile block h-12 w-24 border border-white/10 md:h-14 md:w-28"
              >
                <PartnerLogo :partner="p" />
              </component>
            </li>
          </ul>
        </div>
        <ul v-else v-stagger:pop="{ step: 60 }" class="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
          <li v-for="p in regular" :key="p.id">
            <component
              :is="safeExternalUrl(p.website_url) ? 'a' : 'div'"
              v-bind="safeExternalUrl(p.website_url) ? { href: safeExternalUrl(p.website_url), target: '_blank', rel: 'noopener noreferrer nofollow' } : {}"
              :title="p.name"
              class="partner-tile block h-12 border border-white/10 md:h-14"
            >
              <PartnerLogo :partner="p" />
            </component>
          </li>
        </ul>
      </div>

      <!-- Appel à devenir partenaire -->
      <div v-reveal:up class="mt-5 flex flex-col items-start justify-between gap-3 border border-dashed border-white/20 bg-white/[0.03] p-3 sm:flex-row sm:items-center">
        <div class="flex items-center gap-3">
          <span class="flex h-8 w-8 shrink-0 items-center justify-center bg-[#FF7A00] text-tikeo-ink"><AppIcon name="handshake" class="h-4 w-4" :stroke="2" /></span>
          <div>
            <p class="font-display text-[13px] font-extrabold md:text-sm">{{ t('partners.ctaTitle') }}</p>
            <p class="text-xs text-white/70">{{ t('partners.ctaText') }}</p>
          </div>
        </div>
        <NuxtLink to="/contact?sujet=partenaire" class="btn-brand !h-8 !px-3.5 !text-xs shrink-0 md:!h-9 md:!text-[13px]">{{ t('partners.ctaButton') }}</NuxtLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.partners-dots {
  background-image: radial-gradient(rgb(255 255 255 / 0.07) 1px, transparent 1px);
  background-size: 20px 20px;
  -webkit-mask-image: linear-gradient(to bottom, #000, transparent 85%);
  mask-image: linear-gradient(to bottom, #000, transparent 85%);
}
.partner-card {
  transition: transform 0.3s var(--ease-tikeo), border-color 0.2s ease, background-color 0.2s ease;
}
.partner-card:hover {
  transform: translateY(-4px);
  border-color: rgb(255 122 0 / 0.6);
  background-color: rgb(255 255 255 / 0.07);
}
.partner-tile {
  transition: transform 0.3s var(--ease-tikeo), border-color 0.2s ease, box-shadow 0.3s ease;
}
a.partner-tile:hover {
  transform: translateY(-3px);
  border-color: #ff7a00;
  box-shadow: 0 14px 26px -12px rgb(0 0 0 / 0.55);
}
.partner-track {
  animation: partner-scroll 40s linear infinite;
}
.partner-marquee:hover .partner-track,
.partner-marquee:focus-within .partner-track {
  animation-play-state: paused;
}
@keyframes partner-scroll {
  to {
    transform: translateX(-50%);
  }
}
@media (prefers-reduced-motion: reduce) {
  .partner-track {
    animation: none;
    flex-wrap: wrap;
    width: auto;
  }
  .partner-card,
  .partner-tile {
    transition: none;
  }
}
</style>
