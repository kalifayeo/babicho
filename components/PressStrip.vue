<script setup lang="ts">
/**
 * Bandeau d'accueil « Ils parlent de nous » : logos des médias qui ont parlé
 * de Babicho (un par média), avec lien vers l'espace presse. Masqué tant qu'il
 * n'y a aucune retombée active.
 */
import { PRESS_KIND_ICONS } from '~/composables/usePress'

const { t } = useI18n()
const { items } = usePress()

// Un logo par média (le plus récent), au maximum 8.
const outlets = computed(() => {
  const seen = new Map<string, (typeof items.value)[number]>()
  for (const it of items.value) {
    if (it.kind === 'release') continue
    const key = it.media_name.trim().toLowerCase()
    if (!seen.has(key)) seen.set(key, it)
  }
  return [...seen.values()].slice(0, 8)
})
</script>

<template>
  <section v-if="outlets.length" class="mx-auto max-w-tikeo-container px-4 pt-10 md:px-6 md:pt-14" :aria-label="t('press.stripTitle')">
    <div v-reveal:blur class="flex flex-col gap-4 border border-tikeo-border bg-tikeo-surface p-4 md:flex-row md:items-center md:justify-between md:gap-6 md:px-5">
      <p class="flex shrink-0 items-center gap-2 text-sm font-bold text-tikeo-black">
        <AppIcon name="newspaper" class="h-4 w-4 text-tikeo-orange" />{{ t('press.stripTitle') }}
      </p>
      <ul v-stagger:pop="{ step: 80, delay: 200 }" class="flex flex-1 flex-wrap items-center gap-x-6 gap-y-3 md:justify-center">
        <li v-for="o in outlets" :key="o.id" :title="o.media_name">
          <img v-if="o.logo_url" :src="o.logo_url" :alt="o.media_name" loading="lazy" decoding="async" class="h-7 max-w-[7.5rem] object-contain opacity-70 grayscale transition duration-200 hover:opacity-100 hover:grayscale-0 md:h-8" />
          <span v-else class="flex items-center gap-1.5 text-[13px] font-extrabold text-tikeo-gray-text"><AppIcon :name="PRESS_KIND_ICONS[o.kind]" class="h-3.5 w-3.5" />{{ o.media_name }}</span>
        </li>
      </ul>
      <NuxtLink to="/presse" class="acc-link inline-flex shrink-0 items-center gap-1.5 text-[13px]">{{ t('press.stripLink') }}<AppIcon name="arrow-right" class="h-4 w-4" :stroke="2.2" /></NuxtLink>
    </div>
  </section>
</template>
