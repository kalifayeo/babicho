<script setup lang="ts">
/**
 * Nombre qui s'incrémente jusqu'à sa valeur (tableau de bord, revenus, accueil).
 * Pas d'animation si l'utilisateur a demandé « réduire les animations ».
 * `onView` : attend que le nombre soit visible à l'écran avant de compter
 * (chiffres de l'accueil : le compteur part au moment où on les voit).
 */
const props = withDefaults(defineProps<{ value: number; duration?: number; suffix?: string; onView?: boolean }>(), {
  duration: 900,
  suffix: '',
  onView: false,
})

const shown = ref(0)
const root = ref<HTMLElement | null>(null)
const seen = ref(!props.onView)
let raf = 0
let io: IntersectionObserver | null = null

function reduced() {
  return (
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.classList.contains('ui-reduce-motion'))
  )
}

function run(to: number) {
  cancelAnimationFrame(raf)
  if (typeof window === 'undefined' || reduced()) {
    shown.value = to
    return
  }
  const from = shown.value
  const start = performance.now()
  const step = (now: number) => {
    const p = Math.min(1, (now - start) / props.duration)
    const eased = 1 - Math.pow(1 - p, 4)
    shown.value = Math.round(from + (to - from) * eased)
    if (p < 1) raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
}

onMounted(() => {
  if (!props.onView || typeof IntersectionObserver === 'undefined') {
    seen.value = true
    run(props.value)
    return
  }
  io = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting) {
        seen.value = true
        io?.disconnect()
        run(props.value)
      }
    },
    { rootMargin: '0px 0px -10% 0px' }
  )
  if (root.value) io.observe(root.value)
})
watch(
  () => props.value,
  (v) => {
    if (seen.value) run(v)
  }
)
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  io?.disconnect()
})

const text = computed(() => shown.value.toLocaleString('fr-FR'))
</script>

<template>
  <span ref="root" class="tabular-nums">{{ text }}{{ suffix }}</span>
</template>
