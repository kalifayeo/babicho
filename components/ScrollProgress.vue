<script setup lang="ts">
/**
 * Fine barre de progression de lecture en haut de l'écran (dégradé de marque).
 * Un seul écouteur de scroll passif + requestAnimationFrame ; seule
 * `transform: scaleX` bouge (aucun recalcul de mise en page).
 */
const bar = ref<HTMLElement | null>(null)
let ticking = false

function paint() {
  ticking = false
  const el = bar.value
  if (!el) return
  const max = document.documentElement.scrollHeight - window.innerHeight
  const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
  el.style.transform = `scaleX(${p.toFixed(4)})`
  el.style.opacity = p > 0.005 ? '1' : '0'
}
function onScroll() {
  if (!ticking) {
    ticking = true
    requestAnimationFrame(paint)
  }
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  paint()
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
})
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[3px]" aria-hidden="true">
    <div ref="bar" class="h-full origin-left bg-tikeo-brand opacity-0 transition-opacity duration-300" style="transform: scaleX(0); will-change: transform" />
  </div>
</template>
