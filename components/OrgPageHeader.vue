<script setup lang="ts">
/**
 * En-tête commun des pages de l'espace organisateur : même univers que le hero
 * de « Mon espace » (fond encre, filet orange → bleu, trame de perforation,
 * halo orange, titre en Bricolage) mais plus compact.
 *
 * Slots : `actions` (boutons à droite du titre), `stats` (tuiles sous le titre).
 * Props : `back` = lien de retour affiché au-dessus du titre.
 */
defineProps<{
  title: string
  subtitle?: string
  eyebrow?: string
  icon?: string
  back?: { to: string; label: string }
}>()
</script>

<template>
  <section class="px-4 pt-4 md:px-8 md:pt-6">
    <div class="admin-hero org-hero relative isolate mx-auto max-w-6xl overflow-hidden rounded-3xl p-5 text-white md:p-8">
      <div class="pointer-events-none absolute -right-16 -top-20 -z-10 h-64 w-64 rounded-full bg-[#FF7A00]/35 blur-3xl" aria-hidden="true" />
      <div class="pointer-events-none absolute -bottom-24 left-1/3 -z-10 h-56 w-56 rounded-full bg-[#2D8CFF]/30 blur-3xl" aria-hidden="true" />
      <div class="admin-hero-dots pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />

      <NuxtLink
        v-if="back"
        :to="back.to"
        class="org-rise mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white/80 ring-1 ring-white/15 transition-colors hover:bg-white/20 hover:text-white"
      >
        <AppIcon name="arrow-left" class="h-4 w-4" />
        {{ back.label }}
      </NuxtLink>

      <div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div class="org-rise flex min-w-0 items-center gap-4 md:gap-5" style="--i: 1">
          <span v-if="icon" class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-[#FFB066] ring-1 ring-white/25 backdrop-blur md:h-16 md:w-16">
            <AppIcon :name="icon" class="h-6 w-6 md:h-8 md:w-8" :stroke="1.9" />
          </span>
          <div class="min-w-0">
            <p v-if="eyebrow" class="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60 md:text-xs">{{ eyebrow }}</p>
            <h1 class="mt-1 break-words font-display text-2xl font-extrabold leading-tight tracking-tight md:text-4xl">{{ title }}</h1>
            <p v-if="subtitle" class="mt-2 max-w-xl text-sm leading-relaxed text-white/75 md:text-base">{{ subtitle }}</p>
          </div>
        </div>
        <div v-if="$slots.actions" class="org-rise flex flex-wrap items-center gap-3 max-sm:w-full" style="--i: 2">
          <slot name="actions" />
        </div>
      </div>

      <div v-if="$slots.stats" class="mt-6 md:mt-8">
        <slot name="stats" />
      </div>
    </div>
  </section>
</template>
