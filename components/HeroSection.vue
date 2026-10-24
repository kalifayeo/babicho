<script setup lang="ts">
// Bannière d'accueil PLEIN ÉCRAN : les visuels (gérés dans /admin/accueil) et la
// vidéo de présentation occupent toute la section ; titre, recherche rapide et
// chiffres sont posés par-dessus, sur un voile sombre pour rester lisibles.
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

// Halo lumineux qui suit la souris (ordinateur uniquement, jamais au toucher).
const spotRef = ref<HTMLElement | null>(null)
let spotRaf = 0
function onMove(e: PointerEvent) {
  if (e.pointerType !== 'mouse' || reduceMotion.value || playing.value) return
  const box = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const x = e.clientX - box.left
  const y = e.clientY - box.top
  cancelAnimationFrame(spotRaf)
  spotRaf = requestAnimationFrame(() => {
    spotRef.value?.style.setProperty('--mx', `${x}px`)
    spotRef.value?.style.setProperty('--my', `${y}px`)
  })
}
onBeforeUnmount(() => cancelAnimationFrame(spotRaf))

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
    class="type-scope relative isolate flex min-h-[max(40rem,calc(100svh-5.5rem))] overflow-hidden bg-tikeo-ink text-white"
    role="region"
    aria-roledescription="carousel"
    :aria-label="t('hero.sliderLabel')"
    @mouseenter="paused = true"
    @mouseleave="paused = false"
    @focusin="paused = true"
    @focusout="paused = false"
    @pointermove="onMove"
  >
    <!-- ============ Visuels plein écran (fond) ============ -->
    <div class="absolute inset-0 -z-10">
      <div
        v-for="(s, i) in slides"
        :key="`${s.src}-${i}`"
        class="absolute inset-0 transition-opacity duration-700 ease-out"
        :class="i === current ? 'opacity-100' : 'pointer-events-none opacity-0'"
        :aria-hidden="i !== current"
      >
        <!-- Vidéo de présentation -->
        <template v-if="s.presentation && presentationSource">
          <!-- 1) Lecture avec le son et les commandes (bouton « Voir la vidéo ») -->
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

          <!-- 2) Lecture automatique en fond (muette, plein écran) -->
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
              class="pointer-events-none absolute left-1/2 top-1/2 h-[max(56.25vw,120svh)] w-[max(100vw,213.33svh)] -translate-x-1/2 -translate-y-1/2 border-0"
              title=""
              tabindex="-1"
              allow="autoplay; encrypted-media"
              referrerpolicy="strict-origin-when-cross-origin"
              aria-hidden="true"
            />
            <img v-else-if="previewImage" :src="previewImage" alt="" class="hero-kb h-full w-full object-cover" />
          </template>

          <!-- 3) Économie de données / moins d'animations : aperçu fixe, lecture au clic -->
          <template v-else>
            <img v-if="previewImage" :src="previewImage" alt="" class="h-full w-full object-cover" loading="eager" decoding="async" />
            <video v-else-if="previewFile" :src="previewFile" class="h-full w-full object-cover" muted playsinline preload="metadata" />
            <span v-else class="block h-full w-full bg-gradient-to-br from-tikeo-ink to-[#0057B8]" />
          </template>
        </template>

        <!-- Vidéo du diaporama : plein cadre, muette, en boucle -->
        <video v-else-if="s.video && i === current" :src="s.src" class="h-full w-full object-cover" muted loop playsinline autoplay preload="metadata" />

        <!-- Image : plein écran -->
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

      <!-- Voiles : un dégradé vertical + un halo sombre derrière le texte centré -->
      <div class="pointer-events-none absolute inset-0 transition-opacity duration-500" :class="playing ? 'opacity-0' : 'opacity-100'" aria-hidden="true">
        <div class="absolute inset-0 bg-gradient-to-b from-tikeo-ink/70 via-tikeo-ink/45 to-tikeo-ink/90" />
        <div class="absolute inset-0 bg-[radial-gradient(ellipse_75%_60%_at_50%_48%,rgba(10,22,44,0.6),transparent)]" />
      </div>
      <!-- Décor vivant : halos qui dérivent, trame de points, halo qui suit la souris -->
      <div class="pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-500" :class="playing ? 'opacity-0' : 'opacity-100'" aria-hidden="true">
        <div class="hero-orb absolute -left-24 top-1/4 h-[26rem] w-[26rem] rounded-full bg-[#FF7A00]/25 blur-[90px]" />
        <div class="hero-orb hero-orb-b absolute -right-28 bottom-0 h-[30rem] w-[30rem] rounded-full bg-[#0057B8]/35 blur-[100px]" />
        <div
          class="absolute inset-0 opacity-[0.10]"
          style="background-image: radial-gradient(circle, #fff 1px, transparent 1.4px); background-size: 26px 26px; -webkit-mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, #000 30%, transparent 80%); mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, #000 30%, transparent 80%)"
        />
        <div
          ref="spotRef"
          class="absolute inset-0 hidden transition-opacity duration-300 [@media(hover:hover)]:block"
          style="--mx: 70%; --my: 30%; background: radial-gradient(520px circle at var(--mx) var(--my), rgba(255, 138, 26, 0.16), transparent 60%)"
        />
      </div>
      <!-- Filet de marque en haut -->
      <div class="pointer-events-none absolute inset-x-0 top-0 h-1 bg-tikeo-brand" aria-hidden="true" />
    </div>

    <!-- ============ Contenu centré ============ -->
    <div
      class="relative mx-auto flex w-full max-w-tikeo-container items-center justify-center px-5 pb-24 pt-14 transition-opacity duration-300 md:px-8 md:pb-28 md:pt-20"
      :class="playing ? 'invisible opacity-0' : ''"
    >
      <div class="flex w-full max-w-3xl flex-col items-center text-center">
        <!-- Repère -->
        <p v-reveal:up="0" class="inline-flex items-center gap-2.5 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[13px] font-semibold tracking-wide text-white backdrop-blur-md">
          <span class="relative flex h-2 w-2" aria-hidden="true">
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF7A00] opacity-75" />
            <span class="relative h-2 w-2 rounded-full bg-[#FF7A00]" />
          </span>
          {{ t('hero.eyebrow') }}
        </p>

        <!-- Titre -->
        <h1
          v-reveal:title
          class="mt-6 text-[2.75rem] !font-[800] leading-[1.03] tracking-[-0.035em] text-white drop-shadow-[0_4px_32px_rgba(0,0,0,0.4)] sm:text-6xl lg:text-7xl xl:text-[5.5rem]"
          style="text-wrap: balance"
        >
          <span
            v-for="(w, i) in titleWords"
            :key="`${w}-${i}`"
            class="mr-[0.2em] inline-block last:mr-0"
            :class="i === titleWords.length - 1 ? 'hero-shimmer bg-[linear-gradient(110deg,#FF7A00_0%,#FF9A3D_35%,#FFE2B0_50%,#FF9A3D_65%,#FF7A00_100%)] bg-[length:250%_100%] bg-clip-text text-transparent' : ''"
          >{{ w }}</span>
        </h1>

        <!-- Sous-titre -->
        <p v-reveal:up="200" class="mt-5 max-w-xl text-[1.05rem] font-medium leading-relaxed text-white/85 drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)] sm:text-lg md:mt-6 md:text-xl" style="text-wrap: pretty">
          {{ heroSubtitle }}
        </p>

        <!-- Recherche rapide -->
        <div v-reveal:up="320" class="mt-9 w-full max-w-2xl rounded-2xl bg-tikeo-surface/95 p-2.5 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl md:mt-10">
          <div class="flex flex-col gap-2.5 sm:flex-row">
            <label class="group relative block flex-1 text-left">
              <span class="sr-only">{{ t('filters.city') }}</span>
              <AppIcon name="pin" class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#FF7A00]" />
              <select
                v-model="filters.city"
                class="h-[3.25rem] w-full cursor-pointer appearance-none rounded-xl border border-tikeo-border bg-tikeo-surface-alt pl-12 pr-10 text-[15px] font-semibold text-tikeo-black transition-colors hover:border-slate-300 focus:border-[#FF7A00] focus:outline-none md:h-14"
              >
                <option :value="null">{{ t('filters.allCities') }}</option>
                <option v-for="c in cities" :key="c" :value="c">{{ c }}</option>
              </select>
              <svg class="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-tikeo-gray-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </label>
            <button
              type="button"
              v-magnetic
              class="tk-shine flex h-[3.25rem] items-center justify-center gap-2 rounded-xl bg-[#FF7A00] px-7 text-[15px] font-bold text-tikeo-ink shadow-sm transition-colors hover:bg-[#FF8F26] sm:shrink-0 md:h-14"
              @click="showEvents"
            >
              <AppIcon name="search" class="h-5 w-5" :stroke="2.4" />
              {{ t('filters.seeEvents') }}
            </button>
          </div>
        </div>

        <!-- Raccourcis de date (pastilles « verre » sur le visuel) -->
        <div v-reveal:up="440" class="mt-4 flex flex-wrap justify-center gap-2" role="group" :aria-label="t('filters.date')">
          <button
            v-for="opt in quickDates"
            :key="opt.value"
            type="button"
            class="h-10 rounded-full border px-4 text-[13px] font-semibold backdrop-blur-md transition-colors"
            :class="
              filters.date === opt.value
                ? 'border-white bg-white text-tikeo-ink'
                : 'border-white/30 bg-white/10 text-white hover:bg-white/20'
            "
            :aria-pressed="filters.date === opt.value"
            @click="toggleDate(opt.value)"
          >
            {{ opt.label }}
          </button>
          <button
            v-if="activeFilterCount > 0"
            type="button"
            class="inline-flex h-10 items-center gap-1 px-2 text-[13px] font-semibold text-[#FFB066] hover:underline"
            @click="resetFilters"
          >
            <AppIcon name="close" class="h-3.5 w-3.5" :stroke="2.6" />
            {{ t('home.resetFilters') }}
          </button>
        </div>

        <!-- Vidéo (avec le son) + appel organisateur -->
        <div v-reveal:up="540" class="mt-7 flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
          <button
            v-if="presentationSource"
            type="button"
            class="group inline-flex h-12 items-center gap-3 rounded-full border border-white/30 bg-white/10 py-1.5 pl-1.5 pr-5 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20"
            @click="playFromButton"
          >
            <span class="tk-ping relative flex h-9 w-9 items-center justify-center rounded-full bg-[#FF7A00] text-tikeo-ink transition-transform group-hover:scale-105">
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

        <!-- Chiffres clés -->
        <dl v-if="showStats" v-reveal:up="660" class="mt-10 grid w-full max-w-xl grid-cols-3 divide-x divide-white/20 md:mt-12">
          <div v-for="item in statItems" :key="item.label" class="px-2">
            <dd class="text-3xl !font-[800] leading-none tracking-tight tabular-nums text-white md:text-4xl"><OrgCountUp :value="item.value" :suffix="item.suffix" :duration="1400" on-view /></dd>
            <dt class="mt-2 text-xs font-medium leading-snug text-white/70 md:text-[13px]">{{ item.label }}</dt>
          </div>
        </dl>
      </div>
    </div>

    <!-- ============ Éléments flottants (grand écran) ============ -->
    <div class="pointer-events-none absolute inset-0 hidden min-[1340px]:block" :class="playing ? 'invisible' : ''">
      <!-- À gauche : preuves d'usage -->
      <div class="absolute left-8 top-[30%] 2xl:left-14">
        <div v-reveal:right="900">
          <div class="tk-float flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 py-2.5 pl-2.5 pr-4 text-white shadow-2xl backdrop-blur-md">
            <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-[#16A34A] text-white"><AppIcon name="check" class="h-[18px] w-[18px]" :stroke="3" /></span>
            <span class="text-[13px] font-semibold leading-tight">{{ t('appDownload.chipAdded') }}</span>
          </div>
        </div>
      </div>
      <div class="absolute left-16 top-[44%] 2xl:left-28">
        <div v-reveal:right="1100">
          <div class="tk-float-slow flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 py-2.5 pl-2.5 pr-4 text-white shadow-2xl backdrop-blur-md">
            <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FF7A00] text-tikeo-ink"><AppIcon name="scan" class="h-[18px] w-[18px]" :stroke="2.4" /></span>
            <span class="text-[13px] font-semibold leading-tight">{{ t('appDownload.chipScanned') }}</span>
          </div>
        </div>
      </div>
      <div class="absolute bottom-[22%] left-8 2xl:left-14">
        <div v-reveal:right="1300">
          <div class="tk-float rounded-xl border border-white/15 bg-white/10 p-3 text-white shadow-2xl backdrop-blur-md">
            <p class="mb-2 text-xs font-semibold text-white/75">{{ t('trustStats.payWith') }}</p>
            <ul class="flex gap-1.5">
              <li v-for="l in payLogos" :key="l.name">
                <img :src="l.src" :alt="l.name" width="36" height="36" loading="lazy" class="h-9 w-9 rounded-lg bg-white object-contain p-1" />
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- À droite : le prochain événement, cliquable -->
      <div v-if="nextEvent && nextDate" class="absolute right-8 top-1/2 w-[16.5rem] -translate-y-1/2 2xl:right-14 2xl:w-72">
        <div v-reveal:left="800">
          <NuxtLink
            :to="`/e/${nextEvent.slug}`"
            class="tk-float-slow group pointer-events-auto block overflow-hidden rounded-2xl border border-white/20 bg-white/10 text-white shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-md transition-colors hover:bg-white/15"
          >
            <div class="relative h-36 overflow-hidden">
              <img :src="nextEvent.coverImage" alt="" loading="lazy" decoding="async" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div class="absolute inset-0 bg-gradient-to-t from-tikeo-ink/70 to-transparent" />
              <span class="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-[#FF7A00] px-2.5 py-1 text-xs font-bold text-tikeo-ink">
                <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-tikeo-ink" aria-hidden="true" />
                {{ t('home.upcoming') }}
              </span>
              <div class="absolute bottom-3 right-3 flex min-w-[2.9rem] flex-col items-center rounded-lg bg-white px-2 py-1.5 leading-none text-tikeo-ink">
                <span class="text-lg font-bold tabular-nums">{{ nextDate.day }}</span>
                <span class="mt-0.5 text-[11px] font-semibold capitalize text-tikeo-ink/70">{{ nextDate.month }}</span>
              </div>
            </div>
            <div class="p-4">
              <p class="line-clamp-2 text-base font-bold leading-snug tracking-[-0.01em]">{{ nextEvent.title }}</p>
              <p class="mt-1 flex items-center gap-1.5 text-[13px] font-medium text-white/75">
                <AppIcon name="pin" class="h-3.5 w-3.5 shrink-0" />{{ nextEvent.city }}
              </p>
              <div class="mt-3 flex items-center justify-between border-t border-white/15 pt-3">
                <p class="leading-tight">
                  <span class="block text-xs text-white/65">{{ t('home.from') }}</span>
                  <span class="text-[17px] font-bold">
                    <template v-if="nextEvent.priceFrom === 0">{{ t('home.free') }}</template>
                    <template v-else>{{ nextEvent.priceFrom.toLocaleString('fr-FR') }} <span class="text-xs font-semibold text-white/75">FCFA</span></template>
                  </span>
                </p>
                <span class="flex h-9 w-9 items-center justify-center rounded-full bg-[#FF7A00] text-tikeo-ink transition-transform group-hover:translate-x-0.5">
                  <AppIcon name="arrow-right" class="h-4 w-4" :stroke="2.4" />
                </span>
              </div>
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Indicateur « faire défiler » -->
    <button
      v-if="!playing"
      type="button"
      class="absolute bottom-5 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center sm:flex"
      :aria-label="t('filters.seeEvents')"
      @click="showEvents"
    >
      <span class="flex h-10 w-6 justify-center rounded-full border-2 border-white/50 pt-2 transition-colors hover:border-[#FF7A00]">
        <span class="hero-wheel block h-2 w-1 rounded-full bg-white" />
      </span>
    </button>

    <!-- Fermer la vidéo (lecture avec le son) -->
    <button
      v-if="playing"
      type="button"
      class="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition-colors hover:bg-[#FF7A00] hover:text-tikeo-ink"
      :aria-label="t('presentationVideo.close')"
      @click="playing = false"
    >
      <AppIcon name="close" class="h-5 w-5" :stroke="2.4" />
    </button>

    <!-- Pastilles du diaporama, avec barre de progression -->
    <div v-if="slides.length > 1 && !playing" class="absolute bottom-5 left-4 z-10 flex items-center rounded-full bg-black/35 px-2 backdrop-blur md:left-8">
      <button
        v-for="(_, i) in slides"
        :key="i"
        type="button"
        class="flex h-7 items-center px-1"
        :aria-label="t('hero.slideAria', { n: i + 1 })"
        :aria-current="i === current ? 'true' : undefined"
        @click="go(i)"
      >
        <span class="relative block h-2 overflow-hidden rounded-full bg-white/45 transition-all duration-300" :class="i === current ? 'w-9' : 'w-2 hover:bg-white/80'">
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
  </section>
</template>

<style>
/* Mouvements de la bannière d'accueil — tout se coupe avec « réduire les animations » */
@keyframes hero-kb {
  from { transform: scale(1) translate3d(0, 0, 0); }
  to { transform: scale(1.1) translate3d(-1.2%, -1%, 0); }
}
.hero-kb { animation: hero-kb 18s ease-in-out infinite alternate; will-change: transform; }
@keyframes hero-shimmer {
  from { background-position: 100% 0; }
  to { background-position: -100% 0; }
}
.hero-shimmer { animation: hero-shimmer 5.5s linear infinite; }
@keyframes hero-orb {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(5%, 7%, 0) scale(1.12); }
}
.hero-orb { animation: hero-orb 14s ease-in-out infinite; }
.hero-orb-b { animation-duration: 19s; animation-delay: -7s; }
@keyframes hero-wheel {
  0% { transform: translateY(0); opacity: 0; }
  30% { opacity: 1; }
  100% { transform: translateY(14px); opacity: 0; }
}
.hero-wheel { animation: hero-wheel 1.8s ease-in-out infinite; }
@keyframes hero-progress {
  from { width: 0; }
  to { width: 100%; }
}
.hero-progress { animation-name: hero-progress; animation-timing-function: linear; animation-fill-mode: forwards; }
@media (prefers-reduced-motion: reduce) {
  .hero-kb, .hero-shimmer, .hero-orb, .hero-wheel { animation: none !important; }
}
html.ui-reduce-motion .hero-kb,
html.ui-reduce-motion .hero-shimmer,
html.ui-reduce-motion .hero-orb,
html.ui-reduce-motion .hero-wheel,
html.ui-data-saver .hero-kb,
html.ui-data-saver .hero-shimmer,
html.ui-data-saver .hero-orb,
html.ui-data-saver .hero-wheel { animation: none !important; }
</style>
