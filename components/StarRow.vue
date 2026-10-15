<script setup lang="ts">
/** Rangée de 5 étoiles en lecture seule (note de 1 à 5). */
withDefaults(defineProps<{ value: number; sizeClass?: string }>(), { sizeClass: 'h-4 w-4' })
</script>

<template>
  <span class="inline-flex items-center gap-0.5" role="img" :aria-label="`${value}/5`">
    <svg v-for="i in 5" :key="i" :class="[sizeClass, i <= value ? 'text-[#FF7A00]' : 'text-tikeo-border']" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.6 6.1 20.7l1.2-6.6L2.5 9.5l6.6-.9L12 2.5z" />
    </svg>
  </span>
</template>
