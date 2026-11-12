<script setup lang="ts">
/**
 * Section vidéo « pliable » pilotée par le scroll.
 *
 * Au fil du scroll, la section reste collée à l'écran (sticky) pendant ~2 écrans :
 *   1. ENTRÉE  – la vidéo, d'abord en carte centrée sous le titre, s'AGRANDIT
 *      jusqu'au plein écran ; le titre s'efface, le texte et le bouton arrivent ;
 *   2. LECTURE – plein écran, la vidéo joue (muette, en boucle) ;
 *   3. SORTIE  – la vidéo SE PLIE vers l'arrière (comme un volet qui se rabat),
 *      s'assombrit, puis laisse place à la suite de la page.
 * Le visiteur peut aussi la replier lui-même (bouton « Replier la vidéo ») : la
 * section devient une fine barre, et se redéplie d'un clic.
 *
 * Sources : fichier .mp4/.webm (lecture auto, muette, seulement quand elle est
 * visible) ou YouTube / Vimeo (façade avec bouton lecture : le lecteur externe
 * n'est chargé qu'au clic → page rapide, pas de cookie tiers avant).
 * « Réduire les animations » / économiseur de données : pas de collage ni de
 * lecture automatique ; la vidéo est une simple carte avec bouton lecture.
 * Si le fichier est introuvable, la section disparaît (jamais de bloc vide).
 */
import type { HomeVideoItem } from '~/composables/useHomeVideos'
import { clamp01, easeInCubic, easeOutCubic, scrub, stickyProgress } from '~/utils/scrollScrub'

const props = defineProps<{ item: HomeVideoItem }>()
const { t } = useI18n()
const { dataSaver, prefs } = useUiPrefs()

const root = ref<HTMLElement | null>(null)
const videoEl = ref<HTMLVideoElement | null>(null)

const osReduce = ref(false)
const reduce = computed(() => dataSaver.value || !!prefs.value?.reduceMotion || osReduce.value)

const folded = useState<boolean>(`babicho-video-folded-${props.item.id}`, () => false)
const failed = ref(false)
const near = ref(false) // proche de l'écran : on peut charger la vidéo
const active = ref(false) // plein cadre à l'écran : on lit la vidéo
const started = ref(false) // clic sur « lecture » (façade)
const muted = ref(true)

const isEmbed = computed(() => props.item.source.kind === 'embed')
// Façade (bouton lecture) : lecteur externe, ou fichier en mode « mouvement réduit ».
const facade = computed(() => isEmbed.value || reduce.value)

const posterUrl = computed(() => {
  if (props.item.poster) return props.item.poster
  const yt = props.item.source.src.match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]{11})/i)
  return yt ? `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg` : ''
})

// --- Progression : toutes les valeurs passent par des variables CSS ---------------
// (aucune réactivité Vue à chaque image : le navigateur anime directement.)
function paint(rect: DOMRect, vh: number) {
  const el = root.value
  if (!el) return
  // Préchargement : seulement quand la section approche (pas au chargement de la page).
  if (!near.value && rect.top < vh * 1.5 && rect.bottom > -vh * 0.5) near.value = true
  if (folded.value || reduce.value) {
    if (active.value) active.value = false
    return
  }
  const p = stickyProgress(rect, vh)
  const ex = easeOutCubic(clamp01(p / 0.36)) // 0 → 0.36 : la vidéo s'agrandit
  const fo = easeInCubic(clamp01((p - 0.74) / 0.26)) // 0.74 → 1 : la vidéo se plie
  el.style.setProperty('--p', p.toFixed(3))
  el.style.setProperty('--ex', ex.toFixed(3))
  el.style.setProperty('--fo', fo.toFixed(3))
  const on = p > 0.08 && p < 0.97
  if (on !== active.value) active.value = on
}

// --- Lecture : seulement quand la vidéo est réellement à l'écran ------------------
function sync() {
  const v = videoEl.value
  if (!v) return
  if (facade.value) return // lecteur à façade : l'utilisateur pilote (contrôles natifs)
  if (active.value && !folded.value) v.play().catch(() => {})
  else v.pause()
}
watch([active, folded, facade, videoEl], sync, { flush: 'post' })
watch(muted, (m) => {
  if (videoEl.value) videoEl.value.muted = m
})

function start() {
  started.value = true
  muted.value = false
}

// Le défilement de repositionnement attend la FIN de la transition plié ↔ déplié :
// avant, l'ancienne scène (très haute) est encore dans la page et fausserait le calcul.
let scrollAfter: ScrollLogicalPosition | null = null
function toggleFold() {
  const wasFolded = folded.value
  scrollAfter = wasFolded ? 'start' : 'center'
  if (!wasFolded) {
    started.value = false
    active.value = false
  }
  folded.value = !wasFolded
}
function onAfterEnter() {
  if (!scrollAfter) return
  root.value?.scrollIntoView({ block: scrollAfter, behavior: reduce.value ? 'auto' : 'smooth' })
  scrollAfter = null
}

/** Vrai si le navigateur sait lire la vidéo (métadonnées chargées). Sans réponse en 12 s : on garde la section. */
function probeVideo(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const v = document.createElement('video')
    let done = false
    const end = (ok: boolean) => {
      if (done) return
      done = true
      clearTimeout(timer)
      v.removeAttribute('src')
      v.load()
      resolve(ok)
    }
    const timer = setTimeout(() => end(true), 12000)
    v.preload = 'metadata'
    v.muted = true
    v.onloadedmetadata = () => end(true)
    v.onerror = () => end(false)
    v.src = src
  })
}

// --- Vie du composant -------------------------------------------------------------
let stop: (() => void) | null = null

onMounted(async () => {
  osReduce.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Vidéo introuvable ou illisible (fichier absent, mauvais codec…) : on masque la
  // section plutôt que d'afficher un grand bloc noir. Le test charge seulement les
  // premières secondes du fichier (métadonnées), et est ignoré en économiseur de données.
  if (props.item.source.kind === 'file' && !dataSaver.value) {
    const ok = await probeVideo(props.item.source.src)
    if (!ok) {
      failed.value = true
      if (import.meta.dev) {
        console.warn(`[Babicho] Section vidéo « ${props.item.id} » masquée : ${props.item.source.src} est introuvable ou illisible (format H.264 / WEBM attendu).`)
      }
      return
    }
  }

  if (root.value) stop = scrub(root.value, paint)
})
onBeforeUnmount(() => stop?.())
</script>

<template>
  <section
    v-if="!failed"
    ref="root"
    class="sv"
    :class="{ 'sv--static': reduce, 'sv--folded': folded }"
    :aria-label="item.title"
  >
    <Transition name="sv-swap" mode="out-in" @after-enter="onAfterEnter">
      <!-- ============ Barre repliée ============ -->
      <div v-if="folded" key="bar" class="svf">
        <div class="svf__inner">
          <span class="svf__thumb" aria-hidden="true">
            <img v-if="posterUrl" :src="posterUrl" alt="" loading="lazy" decoding="async" />
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 001.5.86l10.5-6.5a1 1 0 000-1.72L9.5 4.64A1 1 0 008 5.5z" /></svg>
          </span>
          <div class="min-w-0 flex-1">
            <p class="svf__eyebrow">{{ item.eyebrow }}</p>
            <p class="svf__title">{{ item.title }}</p>
          </div>
          <button type="button" class="sv__btn" :aria-expanded="false" @click="toggleFold">
            {{ t('homeVideo.unfold') }}
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </button>
        </div>
      </div>

      <!-- ============ Scène collante ============ -->
      <div v-else key="stage" class="sv__stage">
        <div class="sv__head">
          <p class="sv__eyebrow">{{ item.eyebrow }}</p>
          <SplitHeading tag="h2" :text="item.title" :step="60" class="sv__title" />
        </div>

        <div class="sv__fold">
          <div class="sv__frame">
            <div class="sv__media">
              <template v-if="!facade || started">
                <iframe
                  v-if="isEmbed"
                  :src="item.source.src"
                  :title="item.title"
                  class="h-full w-full border-0"
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowfullscreen
                />
                <video
                  v-else-if="near || started"
                  ref="videoEl"
                  :src="item.source.src"
                  :poster="posterUrl || undefined"
                  :muted="muted"
                  :controls="facade"
                  :autoplay="started"
                  loop
                  playsinline
                  preload="metadata"
                  class="h-full w-full object-cover"
                  :aria-label="item.title"
                  @loadeddata="sync"
                  @error="failed = true"
                />
              </template>
              <img v-else-if="posterUrl" :src="posterUrl" alt="" class="h-full w-full object-cover" loading="lazy" decoding="async" />
              <div v-else class="sv__ph" aria-hidden="true" />
            </div>
            <div v-if="!(facade && started)" class="sv__scrim" aria-hidden="true" />

            <button v-if="facade && !started" type="button" class="sv__play" :aria-label="t('homeVideo.play')" @click="start">
              <span class="sv__play-ring" aria-hidden="true" />
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 001.5.86l10.5-6.5a1 1 0 000-1.72L9.5 4.64A1 1 0 008 5.5z" /></svg>
            </button>
          </div>

          <div v-if="!(facade && started)" class="sv__copy">
            <p class="sv__ctitle" aria-hidden="true">{{ item.title }}</p>
            <p class="sv__sub">{{ item.subtitle }}</p>
            <div class="sv__actions">
              <NuxtLink v-if="item.cta" v-magnetic :to="item.cta.to" class="sv__cta">
                {{ item.cta.label }}
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 6l6 6-6 6" /></svg>
              </NuxtLink>
              <button
                v-if="!facade"
                type="button"
                class="sv__icon"
                :aria-label="muted ? t('homeVideo.unmute') : t('homeVideo.mute')"
                :aria-pressed="!muted"
                @click="muted = !muted"
              >
                <svg v-if="muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5L6 9H3v6h3l5 4V5zM16 9l5 6M21 9l-5 6" /></svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5L6 9H3v6h3l5 4V5zM15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" /></svg>
              </button>
            </div>
          </div>
          <div class="sv__dim" aria-hidden="true" />
        </div>

        <span class="sv__prog" aria-hidden="true" />

        <button type="button" class="sv__btn sv__fold-btn" :aria-expanded="true" @click="toggleFold">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" /></svg>
          {{ t('homeVideo.fold') }}
        </button>
      </div>
    </Transition>
  </section>
</template>
