<script setup lang="ts">
// Affiche les sections vidéo d'un groupe (voir composables/useHomeVideos.ts).
const props = defineProps<{ group: 'story' | 'organizers' }>()
const { items } = useHomeVideos()
const list = computed(() => items.value.filter((i) => i.group === props.group))
</script>

<template>
  <div v-if="list.length">
    <!-- La clé inclut l'adresse : quand le lien de l'admin arrive (chargé après l'affichage),
         la section est recréée et la vidéo est testée de nouveau. -->
    <ScrollVideoSection v-for="item in list" :key="`${item.id}|${item.source.src}`" :item="item" />
  </div>
</template>
