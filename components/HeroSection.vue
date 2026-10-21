<script setup lang="ts">
// Bannière d'accueil « cinéma » : le visuel (vidéo .mp4/.webm, gif ou image) occupe
// tout le fond de la section, avec un voile de marque pour garder le texte lisible.
// Texte + bouton viennent de `home_hero_content` (/admin/accueil), les visuels de
// `home_slides` (zones centre, gauche et droite fusionnées dans un seul diaporama).
//
// Effets :
//  - fond : léger zoom continu (Ken Burns) + fondu enchaîné entre les visuels ;
//  - affiche (image carrée/portrait) : fond flouté de la même image + affiche nette
//    flottante à droite qui s'incline légèrement avec la souris ;
//  - au scroll : le fond glisse plus lentement que la page (parallaxe), le texte
//    s'estompe en montant, la barre « points importants » reste lisible ;
//  - bas de bannière : bord « billet perforé » vers la section suivante.
// « Réduire les animations » / économiseur de données : tout reste statique (et les
// vidéos ne sont pas chargées).
const { t } = useI18n()

const FALLBACK_IMAGE = '/sample-event.jpg'

const { byZone } = useHomeSlides()
const centerSlides = byZone('center')
const leftSlides = byZone('left')
const rightSlides = byZone('right')

const { content: heroContent } = useHomeHeroContent()
const { open: openPresentation } = usePresentationVideo()
const { stats } = useHomeStats()

const heroTitle = computed(() => heroContent.value?.title || t('hero.title'))
const heroSubtitle = computed(() => heroContent.value?.subtitle || t('hero.subtitle'))
const heroCtaLabel = computed(() => heroContent.value?.cta_label || t('hero.cta'))
const heroCtaUrl = computed(() => heroContent.value?.cta_url || '/organisateur/evenements/nouveau')
const heroCtaIsExternal = computed(() => /^https?:\/\//i.test(heroCtaUrl.value))

// Le dernier mot du titre est mis en valeur (dégradé orange).
const titleWords = computed(() => heroTitle.value.trim().split(/\s+/).filter(Boolean))

// --- Préférences de mouvement -------------------------------------------
const { dataSaver, prefs } = useUiPrefs()
const osReducedMotion = ref(false)
const reduceMotion = computed(() => dataSaver.value || !!prefs.value?.reduceMotion || osReducedMotion.value)

// --- Diaporama -----------------------------------------------------------
const isVideo = (url: string) => /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url)

const slides = computed(() => {
  const all = [...centerSlides.value, ...leftSlides.value, ...rightSlides.value].map((s) => s.media_url)
  // Économiseur de données : pas de vidéo (lourde), on garde images et gifs.
  const usable = dataSaver.value ? all.filter((u) => !isVideo(u)) : all
  return (usable.length > 0 ? usable : [FALLBACK_IMAGE]).map((src) => ({ src, video: isVideo(src) }))
})

const current = ref(0)
const paused = ref(false)
const SLIDE_MS = 6500
const visited = ref<number[]>([0]) // les vidéos ne sont montées qu'une fois visitées

const autoplay = computed(() => slides.value.length > 1 && !reduceMotion.value)
const counter = computed(() => `${String(current.value + 1).padStart(2, '0')} / ${String(slides.value.length).padStart(2, '0')}`)

function go(i: number) {
  current.value = (i + slides.value.length) % slides.value.length
}
function onBarEnd() {
  if (autoplay.value && !paused.value) go(current.value + 1)
}

// Format de chaque visuel : une affiche carrée/portrait n'est pas recadrée en plein
// écran (elle serait coupée), elle est affichée nette à droite sur un fond flouté.
const ratios = reactive<Record<string, number>>({})
function onImgLoad(src: string, e: Event) {
  const el = e.target as HTMLImageElement
  if (el.naturalWidth && el.naturalHeight) ratios[src] = el.naturalWidth / el.naturalHeight
}
function onVideoMeta(src: string, e: Event) {
  const el = e.target as HTMLVideoElement
  if (el.videoWidth && el.videoHeight) ratios[src] = el.videoWidth / el.videoHeight
}
function posterMode(i: number) {
  const s = slides.value[i]
  if (!s) return false
  const r = ratios[s.src]
  if (s.video) return r !== undefined && r < 1.15
  return r === undefined ? true : r < 1.45
}
const currentIsPoster = computed(() => posterMode(current.value))
const currentSrc = computed(() => slides.value[current.value]?.src ?? FALLBACK_IMAGE)

// Une seule vidéo joue à la fois (celle du visuel courant).
const mediaEl = ref<HTMLElement | null>(null)
function syncVideos() {
  const root = mediaEl.value
  if (!root) return
  root.querySelectorAll<HTMLVideoElement>('video').forEach((v) => {
    if (Number(v.dataset.i) === current.value && !paused.value) v.play().catch(() => {})
    else v.pause()
  })
}
watch(
  () => current.value,
  async (i) => {
    if (!visited.value.includes(i)) visited.value = [...visited.value, i]
    await nextTick()
    syncVideos()
  }
)
watch(paused, syncVideos)
watch(
  () => slides.value.length,
  () => {
    if (current.value >= slides.value.length) current.value = 0
  }
)

// --- Scroll (parallaxe) + souris (inclinaison de l'affiche) --------------
const root = ref<HTMLElement | null>(null)
let ticking = false

function paint() {
  ticking = false
  const el = root.value
  if (!el) return
  const h = el.offsetHeight || 1
  const p = Math.min(1, Math.max(0, -el.getBoundingClientRect().top / h))
  el.style.setProperty('--p', p.toFixed(3))
}
function onScroll() {
  if (!ticking) {
    ticking = true
    requestAnimationFrame(paint)
  }
}
function onPointer(e: PointerEvent) {
  const el = root.value
  if (!el || reduceMotion.value || e.pointerType !== 'mouse') return
  const r = el.getBoundingClientRect()
  el.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3))
  el.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3))
}

onMounted(() => {
  osReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  paint()
  syncVideos()
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
})

// --- Moteur de recherche rapide -----------------------------------------
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

// --- Points importants (barre du bas) -----------------------------------
// Chiffres réels (jamais inventés) quand disponibles + les 3 promesses clés.
const showStats = computed(() => stats.value.loaded && stats.value.events > 0)
const statItems = computed(() => [
  { value: stats.value.events, suffix: '+', label: t('trustStats.statEvents') },
  { value: stats.value.organizers, suffix: '+', label: t('trustStats.statOrganizers') },
  { value: stats.value.cities, suffix: '', label: t('trustStats.statCities') },
])
const trustItems = computed(() => [
  { icon: 'phone', label: t('hero.trustPay') },
  { icon: 'qr', label: t('hero.trustQr') },
  { icon: 'headset', label: t('trustStats.badgeSupportTitle') },
])
</script>

<template>
  <section
    ref="root"
    class="hero relative isolate flex flex-col overflow-hidden bg-tikeo-ink text-white lg:min-h-[calc(100svh-6rem)] lg:max-h-[58rem]"
    @pointermove="onPointer"
  >
    <!-- ============ Fond : vidéo / gif / image ============ -->
    <div class="hero__parallax pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
      <div ref="mediaEl" class="hero__mouse absolute inset-[-4%]">
        <div
          v-for="(s, i) in slides"
          :key="`${s.src}-${i}`"
          class="absolute inset-0 transition-opacity duration-[1400ms] ease-out"
          :class="i === current ? 'opacity-100' : 'opacity-0'"
        >
          <video
            v-if="s.video && visited.includes(i)"
            :data-i="i"
            :src="s.src"
            class="h-full w-full object-cover"
            :class="posterMode(i) ? 'scale-125 blur-md brightness-75 lg:blur-2xl' : ''"
            muted
            loop
            playsinline
            preload="metadata"
            :autoplay="i === current"
            @loadedmetadata="onVideoMeta(s.src, $event)"
          />
          <img
            v-else-if="!s.video"
            :src="s.src"
            alt=""
            class="h-full w-full object-cover transition-[filter,transform] duration-[1200ms]"
            :class="[
              posterMode(i) ? 'scale-125 blur-md brightness-[.6] saturate-125 lg:blur-2xl' : '',
              i === current && !posterMode(i) ? 'hero__kb' : '',
            ]"
            :loading="i === 0 ? 'eager' : 'lazy'"
            :fetchpriority="i === 0 ? 'high' : 'auto'"
            decoding="async"
            @load="onImgLoad(s.src, $event)"
          />
        </div>
      </div>
      <!-- Voile de marque : lisibilité du texte à gauche, visuel libre à droite -->
      <div class="absolute inset-0 bg-gradient-to-r from-tikeo-ink via-tikeo-ink/70 to-tikeo-ink/10 lg:via-tikeo-ink/55" />
      <div class="absolute inset-0 bg-gradient-to-t from-tikeo-ink via-transparent to-tikeo-ink/50" />
      <div class="tk-deco hero__glow absolute -left-32 top-1/3 h-[28rem] w-[28rem] rounded-full bg-[#0057B8]/35 blur-[120px]" />
      <div class="tk-deco hero__glow hero__glow--b absolute -right-24 bottom-0 h-[26rem] w-[26rem] rounded-full bg-[#FF7A00]/25 blur-[120px]" />
    </div>

    <!-- ============ Contenu ============ -->
    <div
      class="hero__content mx-auto grid w-full max-w-tikeo-container flex-1 gap-8 px-4 pb-6 pt-8 md:px-6 md:pt-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-12 lg:pt-12"
    >
      <!-- Texte + recherche -->
      <div class="flex min-w-0 flex-col">
        <p
          class="hero__rise inline-flex w-fit items-center gap-2 border border-[#FF7A00]/60 bg-[#FF7A00]/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-sm md:text-xs"
          style="--d: 0ms"
        >
          <span class="hero__live h-2 w-2 rounded-full bg-[#FF7A00]" aria-hidden="true" />
          {{ t('hero.eyebrow') }}
        </p>

        <h1
          class="mt-4 font-display text-[2.5rem] font-extrabold leading-[1.03] tracking-[-0.03em] text-white sm:text-6xl lg:text-[4.5rem]"
          style="text-wrap: balance"
        >
          <span
            v-for="(w, i) in titleWords"
            :key="`${w}-${i}`"
            class="hero__word mr-[0.22em] inline-block"
            :class="i === titleWords.length - 1 ? 'hero__accent' : ''"
            :style="{ '--i': i }"
          >{{ w }}</span>
        </h1>
        <span class="hero__bar-in mt-4 block h-1.5 w-20 origin-left bg-tikeo-brand md:w-28" aria-hidden="true" />
        <p class="hero__rise mt-4 max-w-lg text-base leading-relaxed text-white/85 md:text-lg" style="--d: 380ms">
          {{ heroSubtitle }}
        </p>

        <!-- Recherche rapide : carte claire très lisible posée sur le visuel -->
        <div class="hero__rise relative mt-6 max-w-2xl border border-white/20 bg-tikeo-surface/95 text-tikeo-black shadow-[0_30px_70px_-20px_rgba(0,0,0,0.65)] backdrop-blur-xl md:mt-8" style="--d: 480ms">
          <span class="absolute inset-x-0 top-0 h-1 bg-tikeo-brand" aria-hidden="true" />
          <div class="p-4 pt-5 md:p-6 md:pt-7">
            <p class="mb-3 flex items-center gap-2 font-display text-base font-extrabold tracking-tight md:text-lg">
              <AppIcon name="ticket" class="h-5 w-5 shrink-0 text-[#FF7A00]" />
              {{ t('hero.finderTitle') }}
            </p>

            <div class="flex flex-col gap-3 sm:flex-row">
              <label class="group relative block flex-1">
                <span class="sr-only">{{ t('filters.city') }}</span>
                <AppIcon name="pin" class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#FF7A00]" />
                <select
                  v-model="filters.city"
                  class="h-12 w-full cursor-pointer appearance-none border border-slate-300 bg-tikeo-surface pl-12 pr-11 text-base font-semibold text-tikeo-black transition-colors hover:border-tikeo-ink focus:border-[#FF7A00] focus:outline-none md:h-14 md:border-2 dark:border-white/25 dark:hover:border-white/60"
                >
                  <option :value="null">{{ t('filters.allCities') }}</option>
                  <option v-for="c in cities" :key="c" :value="c">{{ c }}</option>
                </select>
                <svg class="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-tikeo-black transition-transform group-focus-within:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.4">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </label>
              <button
                type="button"
                v-magnetic
                class="hero-cta group relative flex h-12 items-center justify-center gap-2 overflow-hidden bg-[#FF7A00] px-6 text-base font-extrabold text-tikeo-ink transition-colors hover:bg-tikeo-ink hover:text-white md:h-14 md:px-8 sm:shrink-0 dark:hover:bg-white dark:hover:text-tikeo-ink"
                @click="showEvents"
              >
                <AppIcon name="search" class="h-5 w-5" :stroke="2.4" />
                <span>{{ t('filters.seeEvents') }}</span>
                <AppIcon name="arrow-down" class="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5" :stroke="2.6" />
              </button>
            </div>

            <p class="mb-2 mt-4 text-xs font-bold uppercase tracking-wider text-tikeo-gray-text md:mt-5">{{ t('filters.date') }}</p>
            <div class="no-scrollbar flex gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible" role="group" :aria-label="t('filters.date')">
              <button
                v-for="opt in quickDates"
                :key="opt.value"
                type="button"
                class="h-9 shrink-0 rounded-full border px-3.5 text-[13px] font-bold transition-all duration-200 active:scale-95 md:h-10 md:border-2 md:px-4 md:text-sm"
                :class="
                  filters.date === opt.value
                    ? 'border-tikeo-ink bg-tikeo-ink text-white dark:border-[#FF7A00] dark:bg-[#FF7A00] dark:text-tikeo-ink'
                    : 'border-slate-300 bg-tikeo-surface text-tikeo-black hover:border-[#FF7A00] hover:text-[rgb(var(--tikeo-orange-strong))] dark:border-white/25'
                "
                :aria-pressed="filters.date === opt.value"
                @click="toggleDate(opt.value)"
              >
                {{ opt.label }}
              </button>
              <button
                v-if="activeFilterCount > 0"
                type="button"
                class="inline-flex h-10 items-center gap-1 px-2 text-sm font-bold text-[rgb(var(--tikeo-orange-strong))] underline-offset-4 hover:underline"
                @click="resetFilters"
              >
                <AppIcon name="close" class="h-3.5 w-3.5" :stroke="2.6" />
                {{ t('home.resetFilters') }}
              </button>
            </div>
          </div>
        </div>

        <!-- Vidéo de présentation + appel organisateur (géré dans /admin/accueil) -->
        <div class="hero__rise mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 md:mt-6" style="--d: 580ms">
          <button
            v-magnetic
            type="button"
            class="group inline-flex h-12 items-center gap-3 border-2 border-white/70 bg-white/10 pl-2.5 pr-5 text-sm font-bold text-white backdrop-blur-sm transition-colors hover:bg-white hover:text-tikeo-ink"
            @click="openPresentation"
          >
            <span class="relative flex h-8 w-8 items-center justify-center rounded-full bg-[#FF7A00] text-tikeo-ink">
              <span class="hero-play-ring absolute inset-0 rounded-full bg-[#FF7A00]" aria-hidden="true" />
              <svg class="relative h-3.5 w-3.5 translate-x-px" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 001.5.86l10.5-6.5a1 1 0 000-1.72L9.5 4.64A1 1 0 008 5.5z" /></svg>
            </span>
            {{ t('presentationVideo.button') }}
          </button>
          <a
            v-if="heroCtaIsExternal"
            :href="heroCtaUrl"
            target="_blank"
            rel="noopener"
            class="group inline-flex h-12 items-center gap-2 text-sm font-bold text-white underline decoration-[#FF7A00] decoration-2 underline-offset-[7px] transition-colors hover:text-[#FF9A3D]"
          >
            <AppIcon name="plus" class="h-4 w-4" :stroke="2.6" />
            {{ heroCtaLabel }}
          </a>
          <NuxtLink
            v-else
            :to="heroCtaUrl"
            class="group inline-flex h-12 items-center gap-2 text-sm font-bold text-white underline decoration-[#FF7A00] decoration-2 underline-offset-[7px] transition-colors hover:text-[#FF9A3D]"
          >
            <AppIcon name="plus" class="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" :stroke="2.6" />
            {{ heroCtaLabel }}
          </NuxtLink>
        </div>
      </div>

      <!-- Affiche nette (visuels carrés / portrait) : flotte et s'incline avec la souris -->
      <div
        class="hero__poster-col relative hidden lg:block"
        role="region"
        aria-roledescription="carousel"
        :aria-label="t('hero.sliderLabel')"
        @mouseenter="paused = true"
        @mouseleave="paused = false"
      >
        <Transition name="hero-poster" mode="out-in">
          <div v-if="currentIsPoster" :key="currentSrc" class="hero__poster relative ml-auto w-fit max-w-full">
            <div class="tk-deco absolute -bottom-3 -right-3 h-full w-full bg-tikeo-brand" aria-hidden="true" />
            <div class="hero__float relative">
              <img
                :src="currentSrc"
                :alt="t('hero.sliderLabel')"
                class="relative block max-h-[min(30rem,62vh)] w-auto max-w-full object-contain shadow-[0_40px_80px_-20px_rgba(0,0,0,0.75)]"
                decoding="async"
              />
              <span class="absolute left-0 top-0 flex items-center gap-2 bg-tikeo-ink/90 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                <span class="hero__live h-2 w-2 rounded-full bg-[#FF7A00]" aria-hidden="true" />
                {{ t('hero.sliderLabel') }}
              </span>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- ============ Bas de bannière : commandes + points importants ============ -->
    <div class="relative mx-auto w-full max-w-tikeo-container px-4 pb-9 md:px-6 md:pb-12">
      <div v-if="slides.length > 1" class="mb-4 flex items-center justify-between gap-4" @mouseenter="paused = true" @mouseleave="paused = false" @focusin="paused = true" @focusout="paused = false">
        <div class="flex min-w-0 flex-1 items-center gap-1.5">
          <button
            v-for="(_, i) in slides"
            :key="i"
            type="button"
            class="group flex h-7 min-w-[1.25rem] max-w-[3.5rem] flex-1 items-center"
            :aria-label="t('hero.slideAria', { n: i + 1 })"
            :aria-current="i === current ? 'true' : undefined"
            @click="go(i)"
          >
            <span class="relative block h-1.5 w-full overflow-hidden bg-white/25 transition-all group-hover:bg-white/50">
              <span
                v-if="i === current"
                :key="`bar-${current}`"
                class="hero__bar absolute inset-y-0 left-0 bg-[#FF7A00]"
                :class="autoplay ? '' : 'hero__bar--static'"
                :style="{ animationDuration: `${SLIDE_MS}ms`, animationPlayState: paused ? 'paused' : 'running' }"
                @animationend="onBarEnd"
              />
            </span>
          </button>
        </div>
        <div class="hidden shrink-0 items-center gap-3 sm:flex">
          <span class="text-sm font-bold tabular-nums tracking-wider text-white/90">{{ counter }}</span>
          <div class="flex gap-2">
            <button type="button" class="flex h-10 w-10 items-center justify-center border-2 border-white/50 text-white transition-colors hover:bg-white hover:text-tikeo-ink active:scale-95" :aria-label="t('home.scrollPrev')" @click="go(current - 1)">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.6"><path stroke-linecap="round" stroke-linejoin="round" d="M15 5l-7 7 7 7" /></svg>
            </button>
            <button type="button" class="flex h-10 w-10 items-center justify-center border-2 border-[#FF7A00] bg-[#FF7A00] text-tikeo-ink transition-colors hover:border-white hover:bg-white active:scale-95" :aria-label="t('home.scrollNext')" @click="go(current + 1)">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.6"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Points importants : chiffres réels + promesses clés -->
      <ul class="hero__rise grid grid-cols-2 border border-white/20 bg-white/10 backdrop-blur-md md:grid-cols-3 lg:flex lg:divide-x lg:divide-white/15" style="--d: 700ms">
        <li
          v-for="item in showStats ? statItems : []"
          :key="item.label"
          class="flex min-w-0 flex-1 flex-col justify-center border-b border-white/10 px-4 py-3.5 md:px-6 lg:border-b-0"
        >
          <span class="font-display text-2xl font-extrabold leading-none text-white md:text-3xl">
            <OrgCountUp :value="item.value" :suffix="item.suffix" :duration="1800" on-view />
          </span>
          <span class="mt-1 text-xs leading-snug text-white/75 md:text-[13px]">{{ item.label }}</span>
        </li>
        <li
          v-for="item in trustItems"
          :key="item.icon"
          class="flex min-w-0 flex-1 items-center gap-3 border-b border-white/10 px-4 py-3.5 md:px-6 lg:border-b-0"
        >
          <span class="flex h-9 w-9 shrink-0 items-center justify-center bg-[#FF7A00] text-tikeo-ink">
            <AppIcon :name="item.icon" class="h-[18px] w-[18px]" :stroke="2.2" />
          </span>
          <span class="text-[13px] font-bold leading-snug text-white md:text-sm">{{ item.label }}</span>
        </li>
      </ul>
    </div>

    <!-- Bord « billet perforé » vers la section suivante -->
    <span class="hero__edge pointer-events-none absolute inset-x-0 bottom-0 h-3.5" aria-hidden="true" />
  </section>
</template>

<style scoped>
/* --- Scroll : tout passe par la variable --p (0 → 1), posée par le script --- */
.hero {
  --p: 0;
  --mx: 0;
  --my: 0;
}
.hero__parallax {
  transform: translate3d(0, calc(var(--p) * 16%), 0) scale(calc(1 + var(--p) * 0.12));
  will-change: transform;
}
.hero__content {
  opacity: max(0, calc(1 - var(--p) * 1.7));
  transform: translate3d(0, calc(var(--p) * -48px), 0);
}
.hero__poster-col {
  transform: translate3d(0, calc(var(--p) * -70px), 0);
}
/* La souris décale très légèrement le fond (profondeur). */
.hero__mouse {
  transform: translate3d(calc(var(--mx) * -18px), calc(var(--my) * -12px), 0);
  transition: transform 0.6s var(--ease-tikeo);
}
.hero__poster {
  perspective: 1100px;
}
.hero__float {
  animation: hero-float 6s ease-in-out infinite;
  transform: rotateY(calc(var(--mx) * -9deg)) rotateX(calc(var(--my) * 7deg));
  transition: transform 0.4s var(--ease-tikeo);
}

/* --- Entrées --- */
.hero__rise {
  animation: hero-rise 0.9s var(--ease-tikeo) both;
  animation-delay: var(--d, 0ms);
}
@keyframes hero-rise {
  from { opacity: 0; transform: translateY(26px); }
  to { opacity: 1; transform: translateY(0); }
}
.hero__word {
  animation: hero-word 0.9s var(--ease-tikeo) both;
  animation-delay: calc(120ms + var(--i, 0) * 110ms);
}
@keyframes hero-word {
  from { opacity: 0; transform: translateY(0.45em) rotate(2deg); filter: blur(10px); }
  to { opacity: 1; transform: translateY(0) rotate(0); filter: blur(0); }
}
.hero__accent {
  background: linear-gradient(90deg, #ff9a3d, #ff7a00);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  padding-right: 0.06em;
}
.hero__bar-in {
  animation: hero-bar-in 0.9s var(--ease-tikeo) 0.35s both;
}
@keyframes hero-bar-in {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

/* --- Fond --- */
.hero__kb {
  animation: hero-kb 14s ease-out both;
}
@keyframes hero-kb {
  from { transform: scale(1); }
  to { transform: scale(1.12); }
}
.hero__glow {
  animation: hero-glow 9s ease-in-out infinite alternate;
}
.hero__glow--b {
  animation-delay: -4s;
}
@keyframes hero-glow {
  from { opacity: 0.55; transform: translate3d(0, 0, 0) scale(1); }
  to { opacity: 1; transform: translate3d(30px, -20px, 0) scale(1.15); }
}
@keyframes hero-float {
  0%, 100% { translate: 0 0; }
  50% { translate: 0 -10px; }
}

/* Changement d'affiche */
.hero-poster-enter-active,
.hero-poster-leave-active {
  transition: opacity 0.5s var(--ease-tikeo), transform 0.7s var(--ease-tikeo);
}
.hero-poster-enter-from {
  opacity: 0;
  transform: translate3d(40px, 0, 0) scale(0.94) rotate(2deg);
}
.hero-poster-leave-to {
  opacity: 0;
  transform: translate3d(-30px, 0, 0) scale(0.96);
}

/* Barre de progression de la diapositive courante. */
.hero__bar {
  width: 100%;
  transform-origin: left center;
  animation-name: hero-bar;
  animation-timing-function: linear;
  animation-fill-mode: both;
}
.hero__bar--static {
  animation: none;
}
@keyframes hero-bar {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

/* Reflet qui traverse le bouton principal. */
.hero-cta::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 35%, rgba(255, 255, 255, 0.55) 50%, transparent 65%);
  transform: translateX(-120%);
  transition: transform 0.7s var(--ease-tikeo);
  pointer-events: none;
}
.hero-cta:hover::after {
  transform: translateX(120%);
}

.hero-play-ring {
  animation: hero-play-ring 2.2s ease-out infinite;
}
@keyframes hero-play-ring {
  0% { transform: scale(1); opacity: 0.5; }
  70%, 100% { transform: scale(1.9); opacity: 0; }
}
.hero__live {
  animation: hero-live 1.8s ease-out infinite;
}
@keyframes hero-live {
  0% { box-shadow: 0 0 0 0 rgba(255, 122, 0, 0.7); }
  70%, 100% { box-shadow: 0 0 0 8px rgba(255, 122, 0, 0); }
}

/* Bord perforé : demi-cercles de la couleur de la section suivante. */
.hero__edge {
  background: radial-gradient(circle at 14px 0, transparent 8.5px, rgb(var(--tikeo-surface-alt)) 9px) 0 0 / 28px 14px repeat-x;
}

/* --- Accessibilité : pas de mouvement si demandé (OS ou Paramètres Babicho) --- */
@media (prefers-reduced-motion: reduce) {
  .hero__parallax, .hero__content, .hero__poster-col, .hero__mouse, .hero__float { transform: none !important; }
  .hero__rise, .hero__word, .hero__bar-in, .hero__kb, .hero__glow, .hero__float, .hero-play-ring, .hero__live { animation: none !important; }
}
:global(html.ui-reduce-motion) .hero__parallax,
:global(html.ui-reduce-motion) .hero__content,
:global(html.ui-reduce-motion) .hero__poster-col,
:global(html.ui-reduce-motion) .hero__mouse,
:global(html.ui-reduce-motion) .hero__float,
:global(html.ui-data-saver) .hero__parallax,
:global(html.ui-data-saver) .hero__content,
:global(html.ui-data-saver) .hero__poster-col,
:global(html.ui-data-saver) .hero__mouse,
:global(html.ui-data-saver) .hero__float {
  transform: none !important;
}
:global(html.ui-reduce-motion) .hero__kb,
:global(html.ui-reduce-motion) .hero__glow,
:global(html.ui-reduce-motion) .hero__float,
:global(html.ui-reduce-motion) .hero-play-ring,
:global(html.ui-data-saver) .hero__kb,
:global(html.ui-data-saver) .hero__glow,
:global(html.ui-data-saver) .hero__float {
  animation: none !important;
}
:global(html.ui-reduce-motion) .hero__content,
:global(html.ui-data-saver) .hero__content {
  opacity: 1 !important;
}
</style>
