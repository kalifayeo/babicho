<script setup lang="ts">
/**
 * Introduction affichée à la toute première visite sur un appareil. Le
 * contenu (titre, texte, image ou icône) est géré par l'admin
 * (/admin/introduction). Aucun emoji : seulement des icônes SVG.
 *
 * Style volontairement sobre : fond neutre, texte lisible, un seul accent
 * (l'orange de la marque, pour la progression) et le bouton principal.
 *
 * Mise en page :
 *  - mobile : carte centrée (marges autour), visuel en haut, texte et boutons
 *    en bas, balayage gauche/droite pour naviguer ;
 *  - desktop : fenêtre en deux volets — visuel à gauche, texte à droite.
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
  if (e.key === 'ArrowRight' || e.key === 'Enter') next()
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
      class="intro-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm md:p-6"
      role="dialog"
      aria-modal="true"
      :aria-label="t('engagement.introLabel')"
    >
      <div
        class="intro-card relative flex max-h-[88dvh] w-full max-w-[380px] flex-col overflow-hidden bg-tikeo-surface shadow-2xl md:h-[min(440px,90vh)] md:max-w-3xl md:flex-row"
        @touchstart.passive="onTouchStart"
        @touchend.passive="onTouchEnd"
      >
        <!-- Fermer -->
        <button
          type="button"
          class="absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center text-tikeo-gray-text transition-colors hover:bg-tikeo-surface-alt hover:text-tikeo-black md:right-3 md:top-3"
          :aria-label="t('engagement.close')"
          @click="emit('close')"
        >
          <AppIcon name="close" class="h-5 w-5" :stroke="2" />
        </button>

        <!-- ============ Visuel ============ -->
        <div class="relative h-[128px] shrink-0 overflow-hidden border-b border-tikeo-border bg-tikeo-surface-alt md:h-auto md:w-[42%] md:border-b-0 md:border-r">
          <Transition name="intro-fade" mode="out-in">
            <div :key="current.id" class="absolute inset-0 flex items-center justify-center">
              <img v-if="current.image_url" :src="current.image_url" :alt="current.title" class="h-full w-full object-cover" />
              <div v-else class="flex h-[76px] w-[76px] items-center justify-center border border-tikeo-border bg-tikeo-surface text-tikeo-black md:h-32 md:w-32">
                <AppIcon :name="currentIcon" class="h-9 w-9 md:h-14 md:w-14" :stroke="1.5" />
              </div>
            </div>
          </Transition>
        </div>

        <!-- ============ Texte + actions ============ -->
        <div class="flex min-h-0 flex-1 flex-col md:w-[58%]">
          <div class="min-h-[120px] flex-1 overflow-y-auto px-6 pb-2 pt-6 md:flex md:flex-col md:justify-center md:px-12 md:py-10">
            <Transition :name="direction === 'next' ? 'intro-slide-next' : 'intro-slide-prev'" mode="out-in">
              <div :key="current.id">
                <h2 class="font-display text-[22px] font-bold leading-tight text-tikeo-black md:text-[30px]">{{ current.title }}</h2>
                <p v-if="current.description" class="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-tikeo-gray-text md:text-base">{{ current.description }}</p>
              </div>
            </Transition>
          </div>

          <div class="px-6 pb-5 pt-3 md:px-12 md:pb-8">
            <!-- Progression -->
            <div class="mb-4 flex items-center justify-center md:justify-start" role="tablist">
              <button
                v-for="(s, i) in slides"
                :key="s.id"
                type="button"
                role="tab"
                :aria-selected="i === index"
                :aria-label="t('engagement.pageOf', { current: i + 1, total })"
                class="flex h-6 items-center px-[3px] first:pl-0"
                @click="goTo(i)"
              >
                <span class="block h-[3px] transition-all duration-300" :class="i === index ? 'w-7 bg-tikeo-orange' : 'w-3.5 bg-tikeo-border'" />
              </button>
            </div>

            <div class="flex items-stretch gap-3">
              <button
                v-if="index > 0"
                type="button"
                class="flex h-12 w-12 shrink-0 items-center justify-center border border-tikeo-border text-tikeo-black transition-colors hover:border-tikeo-ink dark:hover:border-[#FF7A00]"
                :aria-label="t('engagement.previous')"
                :title="t('engagement.previous')"
                @click="prev"
              >
                <AppIcon name="arrow-left" class="h-5 w-5" :stroke="2" />
              </button>
              <button ref="primaryEl" type="button" class="btn-ink !h-12 flex-1 !text-[15px]" @click="next">
                {{ isLast ? t('engagement.start') : t('engagement.next') }}
              </button>
            </div>
            <button v-if="!isLast" type="button" class="mx-auto mt-3 flex text-xs font-semibold text-tikeo-gray-text underline-offset-2 transition-colors hover:text-tikeo-black hover:underline md:mx-0" @click="emit('close')">
              {{ t('engagement.skipIntro') }}
            </button>
            <div v-else class="mt-3 h-4" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.intro-backdrop { animation: intro-fade 0.25s ease both; }
.intro-card { animation: intro-rise 0.3s ease-out both; }
@keyframes intro-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes intro-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }

/* Changement de page : simple fondu, le texte glisse très légèrement */
.intro-fade-enter-active, .intro-fade-leave-active,
.intro-slide-next-enter-active, .intro-slide-next-leave-active,
.intro-slide-prev-enter-active, .intro-slide-prev-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.intro-fade-enter-from, .intro-fade-leave-to { opacity: 0; }
.intro-slide-next-enter-from, .intro-slide-prev-leave-to { opacity: 0; transform: translateX(14px); }
.intro-slide-next-leave-to, .intro-slide-prev-enter-from { opacity: 0; transform: translateX(-14px); }

@media (prefers-reduced-motion: reduce) {
  .intro-backdrop, .intro-card { animation: none; }
  .intro-fade-enter-active, .intro-fade-leave-active,
  .intro-slide-next-enter-active, .intro-slide-next-leave-active,
  .intro-slide-prev-enter-active, .intro-slide-prev-leave-active { transition: none; }
}
</style>
