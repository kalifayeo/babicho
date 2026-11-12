<script setup lang="ts">
/**
 * Visite guidée : met en lumière, un par un, les boutons importants du
 * header (repérés par l'attribut `data-tour="<cible>"`) avec une bulle
 * explicative. Les étapes sont gérées par l'admin (/admin/introduction) ;
 * une étape dont la cible n'est pas visible sur l'écran actuel (ex. un
 * bouton desktop sur mobile) est simplement ignorée.
 *
 * Style (même famille que l'introduction) : carte blanche très arrondie avec
 * barre de progression orange, pastille d'icône orange, boutons en pilule, et
 * une flèche POINTILLÉE animée qui relie la carte au bouton présenté.
 *  - grand écran : la carte flotte sous (ou au-dessus de) la cible ;
 *  - mobile : la carte est ancrée en bas de l'écran (en haut si la cible est
 *    dans la moitié basse, ex. la barre de navigation du bas).
 */
import type { TourStep } from '~/types/database'

const props = defineProps<{ steps: TourStep[] }>()
const emit = defineEmits<{ (e: 'close'): void }>()
const { t } = useI18n()

function findTarget(target: string): HTMLElement | null {
  const nodes = document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`)
  for (const n of nodes) {
    const r = n.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) return n
  }
  return null
}

const active = ref<TourStep[]>([])
const index = ref(0)
const rect = ref<{ top: number; left: number; width: number; height: number } | null>(null)
const vw = ref(0)
const vh = ref(0)
const current = computed(() => active.value[index.value])
const isLast = computed(() => index.value === active.value.length - 1)

const PAD = 8

// Pictogramme affiché dans la bulle selon le bouton présenté.
const TARGET_ICONS: Record<string, string> = {
  search: 'search', publish: 'calendar-plus', pricing: 'wallet', community: 'users', notifications: 'bell',
  favorites: 'heart', account: 'user', theme: 'sparkles', language: 'globe',
  'nav-home': 'home', 'nav-explore': 'compass', 'nav-scanner': 'scan', 'nav-profile': 'user', 'nav-settings': 'settings',
}
const stepIcon = computed(() => TARGET_ICONS[current.value?.target ?? ''] ?? 'info')

function measure() {
  vw.value = window.innerWidth
  vh.value = window.innerHeight
  const step = current.value
  const el = step ? findTarget(step.target) : null
  if (!el) {
    // Cible devenue introuvable (ex. redimensionnement) : on passe à la suivante.
    rect.value = null
    if (index.value < active.value.length - 1) {
      index.value++
      nextTick(measure)
    } else {
      emit('close')
    }
    return
  }
  const r = el.getBoundingClientRect()
  rect.value = { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 }
}

let raf = 0
function schedule() {
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(measure)
}

function go(delta: 1 | -1) {
  const nextIndex = index.value + delta
  if (nextIndex < 0) return
  if (nextIndex >= active.value.length) return emit('close')
  index.value = nextIndex
  nextTick(measure)
}

// ------------------------------------------------------------
// Placement de la carte + flèche pointillée
// ------------------------------------------------------------
const isMobile = computed(() => vw.value < 640)
const cardEl = ref<HTMLElement | null>(null)
const cardH = ref(280) // hauteur réelle mesurée (ResizeObserver), estimée au départ
const progress = computed(() => ((index.value + 1) / Math.max(active.value.length, 1)) * 100)

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max))

const layout = computed(() => {
  const r = rect.value
  if (!r) return null
  const w = isMobile.value ? vw.value - 24 : 360
  const h = cardH.value
  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2
  if (isMobile.value) {
    // Cible en haut d'écran -> carte en bas ; cible en bas -> carte en haut.
    const placeBelow = cy < vh.value / 2
    return { w, h, left: 12, top: placeBelow ? vh.value - h - 16 : 16, placeBelow }
  }
  const GAP = 64 // place pour la flèche
  const placeBelow = r.top + r.height + GAP + h + 16 <= vh.value
  return {
    w,
    h,
    // Carte légèrement décalée par rapport à la cible : la flèche prend une courbe.
    left: clamp(cx - w * 0.28, 16, vw.value - w - 16),
    top: placeBelow ? r.top + r.height + GAP : Math.max(16, r.top - GAP - h),
    placeBelow,
  }
})

const cardStyle = computed(() => {
  const l = layout.value
  return l ? { width: `${l.w}px`, left: `${l.left}px`, top: `${l.top}px` } : {}
})

// Cadre autour de la cible : arrondi adapté (rond pour un bouton rond).
const spotStyle = computed(() => {
  const r = rect.value
  if (!r) return {}
  const round = Math.abs(r.width - r.height) < 6
  return {
    top: `${r.top}px`,
    left: `${r.left}px`,
    width: `${r.width}px`,
    height: `${r.height}px`,
    borderRadius: round ? '9999px' : `${Math.min(r.height / 2, 18)}px`,
  }
})

// Courbe de Bézier entre le bord de la carte et celui de la cible.
const arrowPath = computed(() => {
  const r = rect.value
  const l = layout.value
  if (!r || !l) return ''
  const sx = l.left + l.w / 2
  const ex = clamp(r.left + r.width / 2, r.left + 10, r.left + r.width - 10)
  const sy = l.placeBelow ? l.top - 8 : l.top + l.h + 8
  const ey = l.placeBelow ? r.top + r.height + 12 : r.top - 12
  const dy = ey - sy
  if (Math.abs(dy) < 28) return '' // trop proche : pas de flèche
  // Petite ondulation si la cible est pile en face de la carte.
  const wobble = Math.abs(ex - sx) < 40 ? 34 : 0
  return `M ${sx} ${sy} C ${sx + wobble} ${sy + dy * 0.45}, ${ex - wobble} ${ey - dy * 0.45}, ${ex} ${ey}`
})

let ro: ResizeObserver | null = null
watch(cardEl, (el) => {
  ro?.disconnect()
  ro = null
  if (el && typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => (cardH.value = el.offsetHeight))
    ro.observe(el)
    cardH.value = el.offsetHeight
  }
})

function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowRight' || e.key === 'Enter') go(1)
  else if (e.key === 'ArrowLeft') go(-1)
  else if (e.key === 'Escape') emit('close')
}

onMounted(() => {
  // Le header se masque au scroll : on repart du haut de page et on fige le défilement.
  window.scrollTo({ top: 0 })
  document.body.style.overflow = 'hidden'
  active.value = props.steps.filter((s) => findTarget(s.target))
  if (!active.value.length) return emit('close')
  measure()
  window.addEventListener('resize', schedule)
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  ro?.disconnect()
  window.removeEventListener('resize', schedule)
  window.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div v-if="current && rect && layout" class="fixed inset-0 z-[110]" role="dialog" aria-modal="true" :aria-label="t('engagement.tourLabel')">
      <!-- Calque qui bloque les clics pendant la visite -->
      <div class="absolute inset-0" @click="go(1)" />

      <!-- Projecteur sur la cible : l'ombre géante assombrit tout le reste -->
      <div class="tour-spot pointer-events-none absolute" :style="spotStyle">
        <span class="tour-ping absolute -inset-1.5" :style="{ borderRadius: spotStyle.borderRadius }" aria-hidden="true" />
      </div>

      <!-- Flèche pointillée carte -> cible -->
      <svg v-if="arrowPath" class="pointer-events-none absolute inset-0 h-full w-full" :viewBox="`0 0 ${vw} ${vh}`" aria-hidden="true">
        <defs>
          <marker id="tour-arrowhead" viewBox="0 0 16 16" refX="12" refY="8" markerWidth="18" markerHeight="18" markerUnits="userSpaceOnUse" orient="auto">
            <path d="M3 2.5 L12 8 L3 13.5" fill="none" stroke="#FF9A3D" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" />
          </marker>
        </defs>
        <path :key="current.id" :d="arrowPath" class="tour-dots" fill="none" stroke="#FF9A3D" stroke-width="3.5" stroke-linecap="round" marker-end="url(#tour-arrowhead)" />
      </svg>

      <!-- Carte explicative -->
      <div ref="cardEl" class="tour-card absolute overflow-hidden rounded-[24px] bg-tikeo-surface shadow-2xl" :style="cardStyle" @click.stop>
        <!-- Progression -->
        <div
          class="h-1.5 w-full bg-tikeo-surface-alt"
          role="progressbar"
          aria-valuemin="1"
          :aria-valuemax="active.length"
          :aria-valuenow="index + 1"
          :aria-label="t('engagement.stepOf', { current: index + 1, total: active.length })"
        >
          <div class="h-full rounded-r-full bg-[#FF7A00] transition-[width] duration-300 ease-out" :style="{ width: `${progress}%` }" />
        </div>

        <div class="relative p-5">
          <button
            type="button"
            class="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-tikeo-surface-alt text-tikeo-gray-text transition-colors hover:bg-tikeo-border hover:text-tikeo-black"
            :aria-label="t('engagement.close')"
            @click="emit('close')"
          >
            <AppIcon name="close" class="h-4 w-4" :stroke="2.2" />
          </button>

          <Transition name="tour-fade" mode="out-in">
            <div :key="current.id">
              <div class="flex items-center gap-3 pr-9">
                <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FF7A00] text-white shadow-[0_8px_18px_-6px_rgba(255,122,0,0.55)]">
                  <AppIcon :name="stepIcon" class="h-6 w-6" :stroke="1.8" />
                </span>
                <div class="min-w-0">
                  <p class="text-[11px] font-extrabold tracking-wider text-tikeo-orange-dark">{{ index + 1 }} / {{ active.length }}</p>
                  <h3 class="font-display text-[17px] font-extrabold leading-tight text-tikeo-black">{{ current.title }}</h3>
                </div>
              </div>
              <p v-if="current.description" class="mt-3 text-sm leading-relaxed text-tikeo-gray-text">{{ current.description }}</p>
            </div>
          </Transition>

          <div class="mt-5 flex items-stretch gap-3">
            <button
              v-if="index > 0"
              type="button"
              class="flex h-11 flex-1 items-center justify-center rounded-full border-2 border-tikeo-ink px-3 text-sm font-bold text-tikeo-black transition-colors hover:bg-tikeo-surface-alt dark:border-white/70"
              @click="go(-1)"
            >
              {{ t('engagement.previous') }}
            </button>
            <button
              type="button"
              class="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#FF7A00] px-3 text-sm font-extrabold text-white shadow-[0_8px_20px_-8px_rgba(255,122,0,0.7)] transition-all duration-200 hover:bg-[#F06F00] active:scale-[0.98]"
              @click="go(1)"
            >
              {{ isLast ? t('engagement.finish') : t('engagement.next') }}
              <AppIcon :name="isLast ? 'check' : 'arrow-right'" class="h-[18px] w-[18px]" :stroke="2.4" />
            </button>
          </div>
          <button v-if="!isLast" type="button" class="mx-auto mt-3 block text-xs font-semibold text-tikeo-gray-text underline-offset-2 transition-colors hover:text-tikeo-black hover:underline" @click="emit('close')">
            {{ t('engagement.skipTour') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.tour-spot {
  box-shadow: 0 0 0 3px #ff7a00, 0 0 0 9999px rgba(11, 22, 48, 0.7);
  transition: top 0.35s cubic-bezier(0.22, 1, 0.36, 1), left 0.35s cubic-bezier(0.22, 1, 0.36, 1), width 0.35s cubic-bezier(0.22, 1, 0.36, 1), height 0.35s cubic-bezier(0.22, 1, 0.36, 1), border-radius 0.35s ease;
}
.tour-ping { border: 2px solid #ff7a00; animation: tour-ping 1.8s ease-out infinite; }
@keyframes tour-ping {
  0% { opacity: 0.9; transform: scale(1); }
  100% { opacity: 0; transform: scale(1.14); }
}

.tour-card {
  animation: tour-rise 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;
  transition: top 0.35s cubic-bezier(0.22, 1, 0.36, 1), left 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes tour-rise { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: none; } }

/* Flèche : des points qui « coulent » de la carte vers la cible */
.tour-dots {
  stroke-dasharray: 0.1 11;
  animation: tour-flow 0.9s linear infinite, tour-draw 0.35s ease-out both;
}
@keyframes tour-flow { to { stroke-dashoffset: -11.1; } }
@keyframes tour-draw { from { opacity: 0; } to { opacity: 1; } }

.tour-fade-enter-active, .tour-fade-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.tour-fade-enter-from { opacity: 0; transform: translateX(10px); }
.tour-fade-leave-to { opacity: 0; transform: translateX(-10px); }

@media (prefers-reduced-motion: reduce) {
  .tour-spot, .tour-card { transition: none; animation: none; }
  .tour-ping { animation: none; display: none; }
  .tour-dots { animation: none; }
  .tour-fade-enter-active, .tour-fade-leave-active { transition: none; }
}
</style>
