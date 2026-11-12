<script setup lang="ts">
// Bannière d'accueil épurée, en deux colonnes : à gauche le titre, la recherche rapide et les
// chiffres ; à droite un grand cadre qui affiche les visuels (gérés dans /admin/accueil) et la
// vidéo de présentation, avec la carte du prochain événement posée dessus.
// Texte et bouton viennent de `home_hero_content`, les visuels de `home_slides`.
const { t } = useI18n()

const FALLBACK_IMAGE = '/sample-event.jpg'

const { byZone } = useHomeSlides()
const centerSlides = byZone('center')
const leftSlides = byZone('left')
const rightSlides = byZone('right')

const { content: heroContent } = useHomeHeroContent()
const { source: presentationSource, poster: presentationPoster } = usePresentationVideo()
const { stats } = useHomeStats()

// Prochain événement (1 seul chargé) : petite carte flottante sur grand écran.
const { events: nextEvents } = useEventsList(1)
const nextEvent = computed(() => nextEvents.value[0] ?? null)
const { locale } = useI18n()
const nextDate = computed(() => {
  if (!nextEvent.value) return null
  const d = new Date(nextEvent.value.startDate)
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: d.toLocaleDateString(locale.value, { month: 'short' }).replace('.', ''),
    weekday: d.toLocaleDateString(locale.value, { weekday: 'short' }).replace('.', ''),
  }
})
const payLogos = [
  { name: 'Orange Money', src: '/paiement/orange-money.png' },
  { name: 'MTN MoMo', src: '/paiement/mtn.png' },
  { name: 'Moov Money', src: '/paiement/moov.png' },
  { name: 'Wave', src: '/paiement/wave.png' },
]

const heroTitle = computed(() => heroContent.value?.title || t('hero.title'))
const heroSubtitle = computed(() => heroContent.value?.subtitle || t('hero.subtitle'))
const heroCtaLabel = computed(() => heroContent.value?.cta_label || t('hero.cta'))
const heroCtaUrl = computed(() => heroContent.value?.cta_url || '/organisateur/evenements/nouveau')
const heroCtaIsExternal = computed(() => /^https?:\/\//i.test(heroCtaUrl.value))

// Le dernier mot du titre est mis en valeur (orange).
const titleWords = computed(() => heroTitle.value.trim().split(/\s+/).filter(Boolean))

// --- Préférences de mouvement -------------------------------------------
const { dataSaver, prefs } = useUiPrefs()
const osReducedMotion = ref(false)
const reduceMotion = computed(() => dataSaver.value || !!prefs.value?.reduceMotion || osReducedMotion.value)

// --- Diaporama -----------------------------------------------------------
const isVideo = (url: string) => /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url)

// La vidéo de présentation (gérée dans /admin/accueil) est la 1re diapositive.
// Elle s'affiche avec son image d'aperçu + un bouton lecture, et se lit dans le cadre.
const slides = computed(() => {
  const all = [...centerSlides.value, ...leftSlides.value, ...rightSlides.value].map((s) => s.media_url)
  const usable = dataSaver.value ? all.filter((u) => !isVideo(u)) : all
  const list: { src: string; video: boolean; presentation?: boolean }[] = (usable.length > 0 ? usable : [FALLBACK_IMAGE]).map((src) => ({ src, video: isVideo(src) }))
  if (presentationSource.value) list.unshift({ src: presentationSource.value.src, video: false, presentation: true })
  return list
})

// La vidéo de présentation démarre TOUTE SEULE, en fond, muette (obligatoire pour l'autoplay
// des navigateurs). Le bouton « Voir la vidéo » la relance avec le son et les commandes.
// Pas d'autoplay si l'utilisateur a demandé moins d'animations / économie de données.
const bgFailed = ref(false)
const autoplayBg = computed(() => !reduceMotion.value && !bgFailed.value)
const bgEmbedSrc = computed(() => {
  const src = presentationSource.value
  if (!src || src.kind !== 'embed') return ''
  const yt = src.src.match(/embed\/([\w-]{11})/)
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&mute=1&controls=0&loop=1&playlist=${yt[1]}&rel=0&modestbranding=1&playsinline=1&disablekb=1&iv_load_policy=3`
  const vm = src.src.match(/video\/(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?autoplay=1&muted=1&loop=1&background=1`
  return ''
})

const current = ref(0)
const paused = ref(false)
const playing = ref(false) // la vidéo de présentation est en cours de lecture
const isPresentationSlide = computed(() => !!slides.value[current.value]?.presentation)
let timer: ReturnType<typeof setTimeout> | null = null
const slideMs = ref(6000) // 0 = on attend la fin de la vidéo

function go(i: number) {
  playing.value = false
  current.value = (i + slides.value.length) % slides.value.length
}
function stopTimer() {
  if (timer) clearTimeout(timer)
  timer = null
}
// Durée d'affichage d'une diapositive. 0 = on attend la fin de la vidéo (fichier lu en fond).
function slideDelay() {
  if (!isPresentationSlide.value) return 6000
  const src = presentationSource.value
  if (src?.kind === 'file' && autoplayBg.value) return 0
  return src?.kind === 'embed' && autoplayBg.value ? 20000 : 9000
}
// Défilement automatique, arrêté pendant la lecture avec le son ou au survol.
function schedule() {
  stopTimer()
  if (slides.value.length < 2 || reduceMotion.value || paused.value || playing.value) return
  const delay = slideDelay()
  slideMs.value = delay
  if (!delay) return
  timer = setTimeout(() => go(current.value + 1), delay)
}
watch([current, paused, playing, reduceMotion, bgFailed, () => slides.value.length], () => {
  if (current.value >= slides.value.length) current.value = 0
  schedule()
})
// Fin de la vidéo lue en fond : on passe à la suite (ou on boucle s'il n'y a qu'une diapositive).
function onPresentationEnded() {
  if (slides.value.length > 1) go(current.value + 1)
}

// Aperçu de la vidéo : image fournie par l'admin, sinon miniature YouTube, sinon 1re image du fichier.
const youtubeThumb = computed(() => {
  const m = presentationSource.value?.src.match(/youtube-nocookie\.com\/embed\/([\w-]{11})/)
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : ''
})
const previewImage = computed(() => presentationPoster.value || youtubeThumb.value)
const previewFile = computed(() => {
  const src = presentationSource.value
  if (!src || src.kind !== 'file' || previewImage.value) return ''
  return src.src.includes('#') ? src.src : `${src.src}#t=0.1`
})
function playPresentation() {
  current.value = 0
  playing.value = true
}
function playFromButton() {
  playPresentation()
  document.getElementById('hero-carousel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

onMounted(() => {
  osReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  schedule()
})
onBeforeUnmount(stopTimer)

// --- Recherche rapide ----------------------------------------------------
const { filters, resetFilters, activeFilterCount } = useHomeFilters()
const dateOptions = useHomeDateRangeOptions()
const quickDates = computed(() => dateOptions.value.filter((o) => o.value !== 'all'))
const cities = ['Abidjan', 'Bouaké', 'Yamoussoukro', 'Korhogo', 'San-Pédro', 'Man', 'Daloa', 'Gagnoa']

function toggleDate(value: typeof filters.value.date) {
  filters.value = { ...filters.value, date: filters.value.date === value ? 'all' : value }
}
function showEvents() {
  const anchors = document.querySelectorAll<HTMLElement>('[data-events-anchor]')
  const visible = Array.from(anchors).find((el) => el.offsetParent !== null)
  visible?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// Chiffres réels (jamais inventés), affichés seulement quand ils sont chargés.
const showStats = computed(() => stats.value.loaded && stats.value.events > 0)
const statItems = computed(() => [
  { value: stats.value.events, suffix: '+', label: t('trustStats.statEvents') },
  { value: stats.value.organizers, suffix: '+', label: t('trustStats.statOrganizers') },
  { value: stats.value.cities, suffix: '', label: t('trustStats.statCities') },
])
</script>

<template>
  <section
    id="hero-carousel"
    class="type-scope relative isolate overflow-hidden bg-tikeo-ink text-white"
    role="region"
    aria-roledescription="carousel"
    :aria-label="t('hero.sliderLabel')"
    @mouseenter="paused = true"
    @mouseleave="paused = false"
    @focusin="paused = true"
    @focusout="paused = false"
  >
    <!-- Fond : dégradé calme + deux halos fixes + fine trame. Rien ne bouge, rien ne distrait. -->
    <div class="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
      <div class="absolute inset-0 bg-[linear-gradient(180deg,#0E2240_0%,#0B1B35_100%)]" />
      <div class="absolute -left-40 top-10 h-[34rem] w-[34rem] rounded-full bg-[#FF7A00]/[0.13] blur-[120px]" />
      <div class="absolute -right-32 bottom-0 h-[38rem] w-[38rem] rounded-full bg-[#0057B8]/[0.38] blur-[130px]" />
      <div
        class="absolute inset-0 opacity-[0.06]"
        style="background-image: linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px); background-size: 64px 64px; -webkit-mask-image: radial-gradient(ellipse 80% 70% at 50% 40%, #000 20%, transparent 75%); mask-image: radial-gradient(ellipse 80% 70% at 50% 40%, #000 20%, transparent 75%)"
      />
      <div class="absolute inset-x-0 top-0 h-px bg-tikeo-brand opacity-80" />
    </div>

    <div class="mx-auto grid w-full max-w-tikeo-content items-center gap-12 px-5 pb-16 pt-28 sm:pt-32 md:px-8 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:gap-14 lg:pb-24 lg:pt-40 xl:gap-20">
      <!-- ============ Colonne texte ============ -->
      <div class="min-w-0">
        <p v-reveal:up="0" class="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[13px] font-semibold text-white/90">
          <span class="h-1.5 w-1.5 rounded-full bg-[#FF7A00]" aria-hidden="true" />
          {{ t('hero.eyebrow') }}
        </p>

        <h1
          v-reveal:title
          class="mt-6 text-[2.6rem] !font-[800] leading-[1.04] tracking-[-0.035em] text-white sm:text-6xl xl:text-[4.5rem]"
          style="text-wrap: balance"
        >
          <span
            v-for="(w, i) in titleWords"
            :key="`${w}-${i}`"
            class="mr-[0.2em] inline-block last:mr-0"
            :class="i === titleWords.length - 1 ? 'text-[#FF8A1A]' : ''"
          >{{ w }}</span>
        </h1>

        <p v-reveal:up="160" class="mt-5 max-w-xl text-lg leading-relaxed text-white/70 md:text-xl" style="text-wrap: pretty">
          {{ heroSubtitle }}
        </p>

        <!-- Recherche rapide -->
        <div v-reveal:up="260" class="mt-9 max-w-xl rounded-2xl bg-tikeo-surface p-2 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.65)]">
          <div class="flex flex-col gap-2 sm:flex-row">
            <label class="relative block flex-1 text-left">
              <span class="sr-only">{{ t('filters.city') }}</span>
              <AppIcon name="pin" class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#FF7A00]" />
              <select
                v-model="filters.city"
                class="h-[3.25rem] w-full cursor-pointer appearance-none rounded-xl border-0 bg-transparent pl-12 pr-10 text-[15px] font-semibold text-tikeo-black transition-colors hover:bg-tikeo-surface-alt focus:bg-tikeo-surface-alt focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]"
              >
                <option :value="null">{{ t('filters.allCities') }}</option>
                <option v-for="c in cities" :key="c" :value="c">{{ c }}</option>
              </select>
              <svg class="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-tikeo-gray-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </label>
            <button
              type="button"
              class="flex h-[3.25rem] items-center justify-center gap-2 rounded-xl bg-[#FF7A00] px-7 text-[15px] font-bold text-tikeo-ink transition-colors hover:bg-[#FF8F26] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF7A00] sm:shrink-0"
              @click="showEvents"
            >
              <AppIcon name="search" class="h-5 w-5" :stroke="2.4" />
              {{ t('filters.seeEvents') }}
            </button>
          </div>
        </div>

        <!-- Raccourcis de date -->
        <div v-reveal:up="340" class="mt-4 flex flex-wrap gap-2" role="group" :aria-label="t('filters.date')">
          <button
            v-for="opt in quickDates"
            :key="opt.value"
            type="button"
            class="h-9 rounded-full border px-4 text-[13px] font-semibold transition-colors"
            :class="filters.date === opt.value ? 'border-white bg-white text-tikeo-ink' : 'border-white/20 bg-white/[0.04] text-white/85 hover:border-white/40 hover:bg-white/10'"
            :aria-pressed="filters.date === opt.value"
            @click="toggleDate(opt.value)"
          >
            {{ opt.label }}
          </button>
          <button v-if="activeFilterCount > 0" type="button" class="inline-flex h-9 items-center gap-1 px-2 text-[13px] font-semibold text-[#FFB066] hover:underline" @click="resetFilters">
            <AppIcon name="close" class="h-3.5 w-3.5" :stroke="2.6" />
            {{ t('home.resetFilters') }}
          </button>
        </div>

        <!-- Vidéo + appel organisateur -->
        <div v-reveal:up="420" class="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3">
          <button
            v-if="presentationSource"
            type="button"
            class="group inline-flex items-center gap-3 text-sm font-semibold text-white"
            @click="playFromButton"
          >
            <span class="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/25 transition-colors group-hover:bg-[#FF7A00] group-hover:text-tikeo-ink">
              <svg class="h-3.5 w-3.5 translate-x-px" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 001.5.86l10.5-6.5a1 1 0 000-1.72L9.5 4.64A1 1 0 008 5.5z" /></svg>
            </span>
            {{ t('presentationVideo.button') }}
          </button>
          <a v-if="heroCtaIsExternal" :href="heroCtaUrl" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 text-sm font-bold text-[#FFAA55] underline-offset-[6px] hover:underline">
            {{ heroCtaLabel }}<AppIcon name="arrow-right" class="h-4 w-4" :stroke="2.4" />
          </a>
          <NuxtLink v-else :to="heroCtaUrl" class="inline-flex items-center gap-1.5 text-sm font-bold text-[#FFAA55] underline-offset-[6px] hover:underline">
            {{ heroCtaLabel }}<AppIcon name="arrow-right" class="h-4 w-4" :stroke="2.4" />
          </NuxtLink>
        </div>

        <!-- Chiffres clés (réels) + moyens de paiement -->
        <div v-reveal:up="520" class="mt-10 flex flex-col gap-6 border-t border-white/10 pt-7 sm:flex-row sm:items-center sm:justify-between">
          <dl v-if="showStats" class="grid grid-cols-3 gap-6 sm:gap-10">
            <div v-for="item in statItems" :key="item.label">
              <dd class="text-2xl !font-[800] leading-none tracking-tight tabular-nums text-white md:text-3xl"><OrgCountUp :value="item.value" :suffix="item.suffix" :duration="1400" on-view /></dd>
              <dt class="mt-1.5 text-xs font-medium leading-snug text-white/60">{{ item.label }}</dt>
            </div>
          </dl>
          <div>
            <p class="mb-2 text-xs font-medium text-white/60">{{ t('trustStats.payWith') }}</p>
            <ul class="flex gap-1.5">
              <li v-for="l in payLogos" :key="l.name">
                <img :src="l.src" :alt="l.name" width="32" height="32" loading="lazy" class="h-8 w-8 rounded-lg bg-white object-contain p-1" />
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- ============ Colonne visuel : diaporama / vidéo + prochain événement ============ -->
      <div v-reveal:up="200" class="relative min-w-0">
        <div class="relative aspect-[16/11] overflow-hidden rounded-[1.75rem] bg-[#0B1B35] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.7)] ring-1 ring-white/15 sm:aspect-[16/10] lg:aspect-[5/6] lg:rounded-[2rem]">
          <div
            v-for="(s, i) in slides"
            :key="`${s.src}-${i}`"
            class="absolute inset-0 transition-opacity duration-700 ease-out"
            :class="i === current ? 'opacity-100' : 'pointer-events-none opacity-0'"
            :aria-hidden="i !== current"
          >
            <!-- Vidéo de présentation -->
            <template v-if="s.presentation && presentationSource">
              <template v-if="playing && i === current">
                <iframe
                  v-if="presentationSource.kind === 'embed'"
                  :src="presentationSource.src"
                  class="absolute inset-0 h-full w-full"
                  :title="t('presentationVideo.title')"
                  allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                  allowfullscreen
                  referrerpolicy="strict-origin-when-cross-origin"
                />
                <video v-else :src="presentationSource.src" :poster="presentationPoster || undefined" class="absolute inset-0 h-full w-full bg-black object-contain" controls autoplay playsinline preload="metadata" @ended="playing = false" @error="playing = false" />
              </template>
              <template v-else-if="autoplayBg && i === current">
                <video
                  v-if="presentationSource.kind === 'file'"
                  :src="presentationSource.src"
                  :poster="previewImage || undefined"
                  class="h-full w-full object-cover"
                  autoplay
                  muted
                  playsinline
                  :loop="slides.length < 2"
                  preload="auto"
                  @ended="onPresentationEnded"
                  @error="bgFailed = true"
                />
                <iframe
                  v-else-if="bgEmbedSrc"
                  :src="bgEmbedSrc"
                  class="pointer-events-none absolute left-1/2 top-1/2 h-full w-[215%] -translate-x-1/2 -translate-y-1/2 border-0"
                  title=""
                  tabindex="-1"
                  allow="autoplay; encrypted-media"
                  referrerpolicy="strict-origin-when-cross-origin"
                  aria-hidden="true"
                />
                <img v-else-if="previewImage" :src="previewImage" alt="" class="hero-kb h-full w-full object-cover" />
              </template>
              <template v-else>
                <img v-if="previewImage" :src="previewImage" alt="" class="h-full w-full object-cover" loading="eager" decoding="async" />
                <video v-else-if="previewFile" :src="previewFile" class="h-full w-full object-cover" muted playsinline preload="metadata" />
                <span v-else class="block h-full w-full bg-gradient-to-br from-tikeo-ink to-[#0057B8]" />
              </template>
            </template>

            <!-- Vidéo du diaporama -->
            <video v-else-if="s.video && i === current" :src="s.src" class="h-full w-full object-cover" muted loop playsinline autoplay preload="metadata" />

            <!-- Image -->
            <img
              v-else-if="!s.video"
              :src="s.src"
              :alt="t('hero.sliderLabel')"
              class="h-full w-full object-cover"
              :class="i === current ? 'hero-kb' : ''"
              :loading="i === 0 ? 'eager' : 'lazy'"
              :fetchpriority="i === 0 ? 'high' : 'auto'"
              decoding="async"
            />
          </div>

          <!-- Léger voile bas pour que la carte et les pastilles restent lisibles -->
          <div class="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-tikeo-ink/70 to-transparent transition-opacity duration-300" :class="playing ? 'opacity-0' : 'opacity-100'" />

          <!-- Pastilles du diaporama, avec barre de progression -->
          <div v-if="slides.length > 1 && !playing" class="absolute left-4 top-4 z-10 flex items-center rounded-full bg-tikeo-ink/55 px-2 backdrop-blur-md">
            <button
              v-for="(_, i) in slides"
              :key="i"
              type="button"
              class="flex h-7 items-center px-1"
              :aria-label="t('hero.slideAria', { n: i + 1 })"
              :aria-current="i === current ? 'true' : undefined"
              @click="go(i)"
            >
              <span class="relative block h-1.5 overflow-hidden rounded-full bg-white/45 transition-all duration-300" :class="i === current ? 'w-8' : 'w-1.5 hover:bg-white/80'">
                <span
                  v-if="i === current"
                  :key="`${current}-${slideMs}`"
                  class="absolute inset-y-0 left-0 bg-[#FF7A00]"
                  :class="slideMs > 0 && !reduceMotion ? 'hero-progress' : 'w-full'"
                  :style="slideMs > 0 ? { animationDuration: `${slideMs}ms`, animationPlayState: paused ? 'paused' : 'running' } : undefined"
                />
              </span>
            </button>
          </div>

          <!-- Bouton lecture (vidéo avec le son) -->
          <button
            v-if="presentationSource && !playing && isPresentationSlide"
            type="button"
            class="absolute right-4 top-4 z-10 inline-flex h-10 items-center gap-2 rounded-full bg-white/95 pl-3.5 pr-4 text-[13px] font-bold text-tikeo-ink shadow-lg transition-colors hover:bg-[#FF7A00]"
            @click="playFromButton"
          >
            <svg class="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 001.5.86l10.5-6.5a1 1 0 000-1.72L9.5 4.64A1 1 0 008 5.5z" /></svg>
            {{ t('presentationVideo.button') }}
          </button>

          <!-- Fermer la vidéo -->
          <button
            v-if="playing"
            type="button"
            class="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition-colors hover:bg-[#FF7A00] hover:text-tikeo-ink"
            :aria-label="t('presentationVideo.close')"
            @click="playing = false"
          >
            <AppIcon name="close" class="h-5 w-5" :stroke="2.4" />
          </button>

          <!-- Prochain événement : carte claire posée sur le visuel -->
          <NuxtLink
            v-if="nextEvent && nextDate"
            :to="`/e/${nextEvent.slug}`"
            class="group absolute inset-x-3 bottom-3 z-10 flex items-center gap-3.5 rounded-2xl bg-tikeo-surface p-2.5 pr-3.5 text-tikeo-black shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] transition-transform duration-300 hover:-translate-y-0.5 sm:inset-x-4 sm:bottom-4 sm:gap-4 sm:p-3"
            :class="playing ? 'invisible opacity-0' : ''"
          >
            <span class="relative block h-16 w-16 shrink-0 overflow-hidden rounded-xl sm:h-[4.5rem] sm:w-[4.5rem]">
              <img :src="nextEvent.coverImage" alt="" loading="lazy" decoding="async" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="mb-1 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-tikeo-orange-strong" style="color: rgb(var(--tikeo-orange-strong))">
                <span class="h-1.5 w-1.5 rounded-full bg-[#FF7A00]" aria-hidden="true" />{{ t('home.upcoming') }}
              </span>
              <span class="block truncate text-[15px] font-bold leading-tight sm:text-base">{{ nextEvent.title }}</span>
              <span class="mt-0.5 block truncate text-[13px] text-tikeo-gray-text">{{ nextDate.weekday }} {{ nextDate.day }} {{ nextDate.month }} · {{ nextEvent.city }}</span>
            </span>
            <span class="hidden shrink-0 text-right sm:block">
              <span class="block text-[11px] text-tikeo-gray-text">{{ t('home.from') }}</span>
              <span class="text-[15px] font-bold">
                <template v-if="nextEvent.priceFrom === 0">{{ t('home.free') }}</template>
                <template v-else>{{ nextEvent.priceFrom.toLocaleString('fr-FR') }} <span class="text-xs font-semibold text-tikeo-gray-text">FCFA</span></template>
              </span>
            </span>
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FF7A00] text-tikeo-ink transition-transform group-hover:translate-x-0.5">
              <AppIcon name="arrow-right" class="h-4 w-4" :stroke="2.4" />
            </span>
          </NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>

<style>
/* Mouvements de la bannière d'accueil : lents et discrets, coupés avec « réduire les animations » */
@keyframes hero-kb {
  from { transform: scale(1) translate3d(0, 0, 0); }
  to { transform: scale(1.06) translate3d(-0.8%, -0.6%, 0); }
}
.hero-kb { animation: hero-kb 20s ease-in-out infinite alternate; will-change: transform; }
@keyframes hero-progress {
  from { width: 0; }
  to { width: 100%; }
}
.hero-progress { animation-name: hero-progress; animation-timing-function: linear; animation-fill-mode: forwards; }
@media (prefers-reduced-motion: reduce) {
  .hero-kb { animation: none !important; }
}
html.ui-reduce-motion .hero-kb,
html.ui-data-saver .hero-kb { animation: none !important; }
</style>
