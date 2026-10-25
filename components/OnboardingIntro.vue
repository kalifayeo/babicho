<script setup lang="ts">
/**
 * Introduction affichée à la toute première visite sur un appareil. Le
 * contenu (titre, texte, image ou icône) est géré par l'admin
 * (/admin/introduction). Aucun emoji : seulement des icônes SVG.
 *
 * Style « carte douce » (inspiré de l'intro de Retrouva) : carte blanche aux
 * coins très arrondis, barre de progression orange en haut, compteur « 1 / 4 »,
 * pastille d'icône orange centrée, titre + texte centrés, bouton principal en
 * pilule orange (avec « Précédent » à côté dès la 2e page) et lien discret
 * « Passer l'introduction ». Même rendu sur mobile et sur grand écran ; le
 * balayage gauche/droite et les flèches du clavier fonctionnent.
 */
import type { OnboardingSlide } from '~/types/database'

const props = defineProps<{ slides: OnboardingSlide[] }>()
const emit = defineEmits<{ (e: 'close'): void }>()
const { t } = useI18n()

const index = ref(0)
const direction = ref<'next' | 'prev'>('next')
const total = computed(() => props.slides.length)
const current = computed(() => props.slides[index.value])
const currentIcon = computed(() => resolveIntroIcon(current.value?.icon))
const isLast = computed(() => index.value === total.value - 1)
const progress = computed(() => ((index.value + 1) / Math.max(total.value, 1)) * 100)

function next() {
  if (isLast.value) return emit('close')
  direction.value = 'next'
  index.value++
}
function prev() {
  if (index.value === 0) return
  direction.value = 'prev'
  index.value--
}
function goTo(i: number) {
  direction.value = i > index.value ? 'next' : 'prev'
  index.value = i
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowRight') next()
  else if (e.key === 'ArrowLeft') prev()
  else if (e.key === 'Escape') emit('close')
}

// Balayage tactile : gauche = suivant, droite = précédent (on ignore les gestes surtout verticaux).
let touchX = 0
let touchY = 0
function onTouchStart(e: TouchEvent) {
  touchX = e.changedTouches[0].clientX
  touchY = e.changedTouches[0].clientY
}
function onTouchEnd(e: TouchEvent) {
  const dx = e.changedTouches[0].clientX - touchX
  const dy = e.changedTouches[0].clientY - touchY
  if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return
  dx < 0 ? next() : prev()
}

// Précharge l'image de la page suivante : le changement de page reste fluide.
watch(
  index,
  (i) => {
    const url = props.slides[i + 1]?.image_url
    if (url && import.meta.client) new Image().src = url
  },
  { immediate: true }
)

const primaryEl = ref<HTMLButtonElement | null>(null)
onMounted(() => {
  window.addEventListener('keydown', onKey)
  document.body.style.overflow = 'hidden'
  nextTick(() => primaryEl.value?.focus({ preventScroll: true }))
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div
      class="intro-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      :aria-label="t('engagement.introLabel')"
    >
      <div
        class="intro-card relative w-full max-w-[440px] overflow-hidden rounded-[28px] bg-tikeo-surface shadow-2xl"
        @touchstart.passive="onTouchStart"
        @touchend.passive="onTouchEnd"
      >
        <!-- Barre de progression -->
        <div
          class="h-2 w-full bg-tikeo-surface-alt"
          role="progressbar"
          aria-valuemin="1"
          :aria-valuemax="total"
          :aria-valuenow="index + 1"
          :aria-label="t('engagement.pageOf', { current: index + 1, total })"
        >
          <div class="h-full rounded-r-full bg-[#FF7A00] transition-[width] duration-300 ease-out" :style="{ width: `${progress}%` }" />
        </div>

        <!-- Fermer -->
        <button
          type="button"
          class="absolute right-4 top-6 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-tikeo-surface-alt text-tikeo-gray-text transition-colors hover:bg-tikeo-border hover:text-tikeo-black"
          :aria-label="t('engagement.close')"
          @click="emit('close')"
        >
          <AppIcon name="close" class="h-4 w-4" :stroke="2.2" />
        </button>

        <div class="max-h-[calc(92dvh-8px)] overflow-y-auto px-7 pb-7 pt-9 text-center sm:px-9">
          <!-- Compteur -->
          <p class="text-xs font-extrabold tracking-wider text-tikeo-orange-dark">{{ index + 1 }} / {{ total }}</p>

          <!-- Visuel + texte (les trois blocs changent ensemble) -->
          <Transition :name="direction === 'next' ? 'intro-slide-next' : 'intro-slide-prev'" mode="out-in">
            <div :key="current.id" class="min-h-[210px]">
              <div class="mt-5 flex justify-center">
                <img
                  v-if="current.image_url"
                  :src="current.image_url"
                  :alt="current.title"
                  class="h-36 w-full max-w-[320px] rounded-2xl object-cover"
                />
                <span v-else class="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FF7A00] text-white shadow-[0_8px_20px_-6px_rgba(255,122,0,0.55)]">
                  <AppIcon :name="currentIcon" class="h-8 w-8" :stroke="1.8" />
                </span>
              </div>
              <h2 class="mt-5 font-display text-[22px] font-extrabold leading-tight text-tikeo-black sm:text-2xl">{{ current.title }}</h2>
              <p v-if="current.description" class="mx-auto mt-2.5 max-w-[340px] whitespace-pre-line text-[15px] leading-relaxed text-tikeo-gray-text">{{ current.description }}</p>
            </div>
          </Transition>

          <!-- Actions -->
          <div class="mt-6 flex items-stretch gap-3">
            <button
              v-if="index > 0"
              type="button"
              class="flex h-12 flex-1 items-center justify-center rounded-full border-2 border-tikeo-ink px-4 text-[15px] font-bold text-tikeo-black transition-colors hover:bg-tikeo-surface-alt dark:border-white/70"
              @click="prev"
            >
              {{ t('engagement.previous') }}
            </button>
            <button
              ref="primaryEl"
              type="button"
              class="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#FF7A00] px-4 text-[15px] font-extrabold text-white shadow-[0_8px_20px_-8px_rgba(255,122,0,0.7)] transition-all duration-200 hover:bg-[#F06F00] active:scale-[0.98]"
              @click="next"
            >
              {{ isLast ? t('engagement.start') : t('engagement.next') }}
              <AppIcon name="arrow-right" class="h-[18px] w-[18px]" :stroke="2.4" />
            </button>
          </div>

          <button
            v-if="!isLast"
            type="button"
            class="mx-auto mt-4 block text-[13px] font-semibold text-tikeo-gray-text underline-offset-2 transition-colors hover:text-tikeo-black hover:underline"
            @click="emit('close')"
          >
            {{ t('engagement.skipIntro') }}
          </button>
          <div v-else class="mt-4 h-5" aria-hidden="true" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.intro-backdrop { animation: intro-fade 0.25s ease both; }
.intro-card { animation: intro-rise 0.32s cubic-bezier(0.22, 1, 0.36, 1) both; }
@keyframes intro-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes intro-rise { from { opacity: 0; transform: translateY(16px) scale(0.98); } to { opacity: 1; transform: none; } }

/* Changement de page : fondu + très léger glissement */
.intro-slide-next-enter-active, .intro-slide-next-leave-active,
.intro-slide-prev-enter-active, .intro-slide-prev-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.intro-slide-next-enter-from, .intro-slide-prev-leave-to { opacity: 0; transform: translateX(16px); }
.intro-slide-next-leave-to, .intro-slide-prev-enter-from { opacity: 0; transform: translateX(-16px); }

@media (prefers-reduced-motion: reduce) {
  .intro-backdrop, .intro-card { animation: none; }
  .intro-slide-next-enter-active, .intro-slide-next-leave-active,
  .intro-slide-prev-enter-active, .intro-slide-prev-leave-active { transition: none; }
}
</style>
