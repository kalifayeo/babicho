<script setup lang="ts">
/**
 * Titre « masque » : chaque mot monte de derrière une ligne invisible, en
 * cascade, quand le titre entre à l'écran (effet des sites éditoriaux).
 * - Le texte reste lisible par les lecteurs d'écran (aria-label sur le titre).
 * - Rendu serveur identique au rendu client : aucun clignotement.
 * - « Réduire les animations » : le titre s'affiche d'un coup, sans mouvement.
 *
 * Utilisation :
 *   <SplitHeading tag="h2" :text="t('home.upcoming')" class="font-display text-3xl font-extrabold" />
 */
const props = withDefaults(
  defineProps<{
    text: string
    tag?: string
    /** délai entre deux mots (ms) */
    step?: number
    /** délai avant le premier mot (ms) */
    delay?: number
  }>(),
  { tag: 'h2', step: 70, delay: 0 }
)

const words = computed(() => props.text.trim().split(/\s+/).filter(Boolean))
</script>

<template>
  <component :is="tag" v-stagger:split="{ step, delay }" :aria-label="text">
    <span v-for="(w, i) in words" :key="`${w}-${i}`" class="sw" aria-hidden="true" :style="{ '--i': Math.min(i, 14) }"><span class="sw__in">{{ w }}</span></span>
  </component>
</template>
