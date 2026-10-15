<script setup lang="ts">
// Les deux badges côte à côte. En taille « sm » (pied de page) ils restent
// toujours sur la même ligne ; sinon ils passent à la ligne sur petit écran.
defineProps<{ size?: 'sm' | 'md' | 'lg' }>()
</script>

<template>
  <div class="flex items-center" :class="size === 'sm' ? 'flex-nowrap gap-2.5' : 'flex-wrap gap-x-3 gap-y-4'">
    <StoreBadge store="google" :size="size" />
    <StoreBadge store="apple" :size="size" />
  </div>
</template>
