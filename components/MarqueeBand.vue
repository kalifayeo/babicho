<script setup lang="ts">
/**
 * Bandeau de mots géants qui défile PENDANT le scroll (et non en boucle) :
 * deux lignes qui partent en sens opposés, une pleine et une en contour.
 * Le mouvement est piloté par la variable --sp de v-scrub (0 → 1) : c'est le
 * doigt / la molette qui fait avancer le texte, comme sur les sites de marque.
 * Purement décoratif (aria-hidden) ; immobile avec « réduire les animations ».
 */
const { t } = useI18n()
const { categories } = useCategoriesList()

const words = computed(() => {
  const fromCategories = categories.value.map((c) => c.name).filter(Boolean)
  // (séparateur « , » : le « | » est le séparateur de pluriel de vue-i18n)
  const base = fromCategories.length >= 3 ? fromCategories : t('marquee.fallback').split(',')
  // On répète assez de fois pour que la piste dépasse toujours la largeur de l'écran.
  const out: string[] = []
  while (out.length < 14) out.push(...base)
  return out
})
</script>

<template>
  <section v-scrub class="mq" aria-hidden="true">
    <div class="mq__row" style="--dir: -1">
      <div class="mq__track">
        <template v-for="(w, i) in words" :key="`a-${i}`">
          <span class="mq__w">{{ w }}</span>
          <svg class="mq__star" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z" /></svg>
        </template>
      </div>
    </div>
    <div class="mq__row mq__row--b" style="--dir: 1">
      <div class="mq__track">
        <template v-for="(w, i) in [...words].reverse()" :key="`b-${i}`">
          <span class="mq__w">{{ w }}</span>
          <svg class="mq__star" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z" /></svg>
        </template>
      </div>
    </div>
  </section>
</template>
