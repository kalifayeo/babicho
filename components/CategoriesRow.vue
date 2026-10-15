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
  'group flex h-10 shrink-0 items-center gap-2 border px-4 text-sm font-bold transition-colors duration-200 active:scale-[0.97] md:h-12 md:gap-2.5 md:border-2 md:px-5 md:text-[15px]'
const pillOn = 'border-tikeo-ink bg-tikeo-ink text-white dark:border-tikeo-orange dark:bg-tikeo-orange dark:text-tikeo-ink'
const pillOff = 'border-slate-300 bg-tikeo-surface text-tikeo-black hover:border-tikeo-ink dark:border-white/20 dark:hover:border-tikeo-orange'
const iconOn = 'text-[#FF9A3D] dark:text-tikeo-ink'
const iconOff = 'text-[rgb(var(--tikeo-orange-strong))]'
</script>

<template>
  <section class="border-y border-tikeo-border bg-tikeo-surface-alt" :aria-label="t('home.categories')">
    <div class="mx-auto max-w-tikeo-container px-4 py-3 md:px-6 md:py-4">
      <div v-if="loading && categories.length === 0" class="no-scrollbar flex gap-2 overflow-x-auto">
        <div v-for="i in 8" :key="i" class="h-10 w-28 shrink-0 animate-pulse md:h-12 md:w-32 bg-tikeo-border" />
      </div>

      <div v-else v-stagger:pop="{ step: 45 }" class="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        <button type="button" :class="[pill, !filters.category ? pillOn : pillOff]" :aria-pressed="!filters.category" @click="setCategory(null)">
          <svg class="h-4 w-4 md:h-5 md:w-5" :class="!filters.category ? iconOn : iconOff" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
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
          <svg class="h-4 w-4 md:h-5 md:w-5" :class="filters.category === cat.name ? iconOn : iconOff" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" :d="categoryIconPath(cat.icon)" />
          </svg>
          {{ cat.name }}
        </button>
      </div>
    </div>
  </section>
</template>
