<script setup lang="ts">
import { categoryIconPath } from '~/composables/useCategoriesList'

// Barre de catégories : une seule fonction, filtrer l'accueil par catégorie.
// (Les raccourcis Favoris / Paramètres qui s'y mêlaient avant ne sont plus
// ici : ils restent accessibles depuis l'en-tête, le menu mobile et la
// barre du bas.)
const { t } = useI18n()
const { categories, loading } = useCategoriesList()
const { filters, setCategory } = useHomeFilters()

// Pastilles larges et bien contrastées : actif = fond marine plein (orange en mode
// sombre), inactif = fond blanc + bordure grise nette + icône orange.
const pill =
  'cat-pill group flex h-12 shrink-0 items-center gap-2.5 rounded-full border pl-1.5 pr-5 text-[15px] font-semibold transition-all duration-300 ease-tikeo md:h-[3.25rem]'
const pillOn = 'border-tikeo-ink bg-tikeo-ink text-white shadow-[0_12px_26px_-12px_rgba(14,34,64,0.7)] dark:border-tikeo-orange dark:bg-tikeo-orange dark:text-tikeo-ink'
const pillOff = 'border-tikeo-border bg-tikeo-surface text-tikeo-black hover:-translate-y-0.5 hover:border-[#FF7A00]/50 hover:shadow-card'
// Pastille ronde derrière l'icône : orange quand la catégorie est active, teinte douce sinon.
const dotOn = 'bg-[#FF7A00] text-tikeo-ink'
const dotOff = 'bg-[#FF7A00]/10 text-[rgb(var(--tikeo-orange-strong))] group-hover:bg-[#FF7A00] group-hover:text-tikeo-ink'
const iconOn = ''
const iconOff = ''
</script>

<template>
  <section class="bg-tikeo-surface-alt" :aria-label="t('home.categories')">
    <div v-reveal:up class="mx-auto max-w-tikeo-content px-4 py-5 md:px-6 md:py-8">
      <div v-if="loading && categories.length === 0" class="no-scrollbar flex gap-2 overflow-x-auto">
        <div v-for="i in 8" :key="i" class="h-12 w-32 shrink-0 animate-pulse rounded-full bg-tikeo-border md:h-[3.25rem] md:w-36" />
      </div>

      <div v-else v-stagger:up="{ step: 45 }" class="no-scrollbar -mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 py-1.5 md:mx-0 md:px-0">
        <button type="button" :class="[pill, !filters.category ? pillOn : pillOff]" :aria-pressed="!filters.category" @click="setCategory(null)">
          <span class="flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-300 md:h-10 md:w-10" :class="!filters.category ? dotOn : dotOff">
            <svg class="h-[18px] w-[18px]" :class="!filters.category ? iconOn : iconOff" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </span>
          {{ t('home.all') }}
        </button>

        <button
          v-for="cat in categories"
          :key="cat.id"
          type="button"
          :class="[pill, filters.category === cat.name ? pillOn : pillOff]"
          :aria-pressed="filters.category === cat.name"
          @click="setCategory(cat.name)"
        >
          <span class="flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-300 md:h-10 md:w-10" :class="filters.category === cat.name ? dotOn : dotOff">
            <svg class="h-[18px] w-[18px]" :class="filters.category === cat.name ? iconOn : iconOff" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" :d="categoryIconPath(cat.icon)" />
            </svg>
          </span>
          {{ cat.name }}
        </button>
      </div>
    </div>
  </section>
</template>
