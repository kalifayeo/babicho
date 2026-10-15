<script setup lang="ts">
// Bannière d'accueil : texte + bouton viennent de `home_hero_content`
// (/admin/accueil), les visuels de `home_slides` (zones centre, gauche et
// droite fusionnées dans un seul diaporama). Un visuel de secours s'affiche
// tant que l'admin n'a rien configuré.
// Sous le titre, un mini-moteur de recherche (ville + période) pilote les
// mêmes filtres que le reste de l'accueil (useHomeFilters).
// Design : fond clair, texte foncé très contrasté, une seule carte de recherche
// et des commandes de diaporama placées SOUS l'image (rien ne se superpose
// aux visuels) — pour que tout se lise du premier coup d'œil.
const { t } = useI18n()

const FALLBACK_IMAGE = '/sample-event.jpg'

const { byZone } = useHomeSlides()
const centerSlides = byZone('center')
const leftSlides = byZone('left')
const rightSlides = byZone('right')

const { content: heroContent } = useHomeHeroContent()
const { open: openPresentation } = usePresentationVideo()

const heroTitle = computed(() => heroContent.value?.title || t('hero.title'))
const heroSubtitle = computed(() => heroContent.value?.subtitle || t('hero.subtitle'))
const heroCtaLabel = computed(() => heroContent.value?.cta_label || t('hero.cta'))
const heroCtaUrl = computed(() => heroContent.value?.cta_url || '/organisateur/evenements/nouveau')
const heroCtaIsExternal = computed(() => /^https?:\/\//i.test(heroCtaUrl.value))

// --- Diaporama ---------------------------------------------------------
const images = computed(() => {
  const all = [...centerSlides.value, ...leftSlides.value, ...rightSlides.value].map((s) => s.media_url)
  return all.length > 0 ? all : [FALLBACK_IMAGE]
})

const current = ref(0)
const paused = ref(false)
const SLIDE_MS = 5500
// Économiseur de données / « réduire les animations » (Paramètres) : pas de
// défilement automatique. Le passage à la diapo suivante est piloté par la fin
// de l'animation de la barre de progression (donc toujours synchronisé avec elle,
// y compris quand on met en pause au survol).
const { dataSaver, prefs } = useUiPrefs()
const osReducedMotion = ref(false)

const autoplay = computed(() => images.value.length > 1 && !dataSaver.value && !prefs.value?.reduceMotion && !osReducedMotion.value)
const counter = computed(() => `${String(current.value + 1).padStart(2, '0')} / ${String(images.value.length).padStart(2, '0')}`)

function go(i: number) {
  current.value = (i + images.value.length) % images.value.length
}

function onBarEnd() {
  if (autoplay.value && !paused.value) go(current.value + 1)
}

onMounted(() => {
  osReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
})
watch(
  () => images.value.length,
  () => {
    if (current.value >= images.value.length) current.value = 0
  }
)

// --- Moteur de recherche rapide ---------------------------------------
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
</script>

<template>
  <section class="hero relative isolate overflow-hidden bg-tikeo-surface">
    <!-- Fond : deux lueurs très douces aux couleurs du logo (décor, coupé en mode économie de données) -->
    <div class="tk-deco pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
      <div class="absolute -left-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-[#0057B8]/10 blur-[110px] dark:bg-[#0057B8]/25" />
      <div class="absolute -bottom-40 -right-32 h-[30rem] w-[30rem] rounded-full bg-[#FF7A00]/15 blur-[110px] dark:bg-[#FF7A00]/15" />
    </div>

    <div class="mx-auto grid max-w-tikeo-container gap-5 px-4 pb-8 pt-3 md:gap-10 md:px-6 md:pb-14 md:pt-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center lg:gap-14 lg:pb-16 lg:pt-14">
      <!-- ============ Texte + recherche ============ -->
      <div class="order-2 flex flex-col lg:order-1">
        <p class="hero__rise inline-flex w-fit items-center gap-2 border border-[#FF7A00]/45 bg-[#FF7A00]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-tikeo-black md:px-3 md:py-1.5 md:text-xs" style="--d: 0ms">
          <span class="h-2 w-2 rounded-full bg-[#FF7A00]" aria-hidden="true" />
          {{ t('hero.eyebrow') }}
        </p>

        <h1 class="hero__rise mt-3 font-display text-[2.25rem] font-extrabold leading-[1.05] md:mt-4 tracking-[-0.03em] text-tikeo-black sm:text-6xl lg:text-[4.25rem]" style="--d: 60ms; text-wrap: balance">
          {{ heroTitle }}
        </h1>
        <span class="hero__rise mt-3 block h-1 w-14 bg-tikeo-brand md:mt-4 md:h-1.5 md:w-20" style="--d: 120ms" aria-hidden="true" />
        <p class="hero__rise mt-3 max-w-md text-[15px] leading-relaxed text-tikeo-gray-text md:mt-4 md:text-lg" style="--d: 150ms">
          {{ heroSubtitle }}
        </p>

        <!-- Recherche rapide : une seule carte, champs larges et bien contrastés -->
        <div class="hero__rise relative mt-5 border border-tikeo-border bg-tikeo-surface shadow-card md:mt-8 md:shadow-card-hover" style="--d: 220ms">
          <span class="absolute inset-x-0 top-0 h-1 bg-tikeo-brand" aria-hidden="true" />

          <div class="p-3.5 pt-4 md:p-6 md:pt-7">
            <p class="mb-2.5 flex items-center gap-2 font-display text-base font-extrabold md:mb-3 md:text-lg tracking-tight text-tikeo-black">
              <AppIcon name="ticket" class="h-5 w-5 shrink-0 text-[#FF7A00]" />
              {{ t('hero.finderTitle') }}
            </p>

            <div class="flex flex-col gap-3 sm:flex-row">
              <label class="group relative block flex-1">
                <span class="sr-only">{{ t('filters.city') }}</span>
                <AppIcon name="pin" class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#FF7A00]" />
                <select
                  v-model="filters.city"
                  class="h-12 w-full cursor-pointer appearance-none border border-slate-300 md:h-14 md:border-2 bg-tikeo-surface pl-12 pr-11 text-base font-semibold text-tikeo-black transition-colors hover:border-tikeo-ink focus:border-[#FF7A00] focus:outline-none dark:border-white/25 dark:hover:border-white/60"
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
                class="hero-cta group relative flex h-12 items-center justify-center gap-2 overflow-hidden bg-[#FF7A00] px-6 md:h-14 md:px-8 text-base font-extrabold text-tikeo-ink transition-colors hover:bg-tikeo-ink hover:text-white dark:hover:bg-white dark:hover:text-tikeo-ink sm:shrink-0"
                @click="showEvents"
              >
                <AppIcon name="search" class="h-5 w-5" :stroke="2.4" />
                <span>{{ t('filters.seeEvents') }}</span>
                <AppIcon name="arrow-down" class="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5" :stroke="2.6" />
              </button>
            </div>

            <p class="mb-2 mt-4 text-xs font-bold uppercase md:mt-5 tracking-wider text-tikeo-gray-text">{{ t('filters.date') }}</p>
            <div class="no-scrollbar flex gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible" role="group" :aria-label="t('filters.date')">
              <button
                v-for="opt in quickDates"
                :key="opt.value"
                type="button"
                class="h-9 shrink-0 rounded-full border px-3.5 text-[13px] font-bold md:h-10 md:border-2 md:px-4 md:text-sm transition-all duration-200 active:scale-95"
                :class="
                  filters.date === opt.value
                    ? 'border-tikeo-ink bg-tikeo-ink text-white dark:border-[#FF7A00] dark:bg-[#FF7A00] dark:text-tikeo-ink'
                    : 'border-slate-300 bg-tikeo-surface text-tikeo-black hover:border-tikeo-ink dark:border-white/25 dark:hover:border-white/60'
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

        <!-- Vidéo de présentation + appel organisateur (géré dans /admin/accueil) + réassurance -->
        <div class="hero__rise mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 md:mt-6 md:gap-y-4" style="--d: 290ms">
          <button
            type="button"
            class="group inline-flex h-11 items-center gap-3 border border-tikeo-ink bg-tikeo-surface pl-2.5 pr-4 md:h-12 md:border-2 md:pr-5 text-sm font-bold text-tikeo-black transition-colors hover:bg-tikeo-ink hover:text-white dark:border-white/30 dark:hover:bg-white dark:hover:text-tikeo-ink"
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
            class="group inline-flex h-11 items-center gap-2 text-sm font-bold md:h-12 text-tikeo-black underline decoration-[#FF7A00] decoration-2 underline-offset-[7px] transition-colors hover:text-[rgb(var(--tikeo-orange-strong))]"
          >
            <AppIcon name="plus" class="h-4 w-4" :stroke="2.6" />
            {{ heroCtaLabel }}
          </a>
          <NuxtLink
            v-else
            :to="heroCtaUrl"
            class="group inline-flex h-11 items-center gap-2 text-sm font-bold md:h-12 text-tikeo-black underline decoration-[#FF7A00] decoration-2 underline-offset-[7px] transition-colors hover:text-[rgb(var(--tikeo-orange-strong))]"
          >
            <AppIcon name="plus" class="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" :stroke="2.6" />
            {{ heroCtaLabel }}
          </NuxtLink>
        </div>

        <ul class="hero__rise mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] font-semibold md:mt-5 md:gap-x-6 md:gap-y-2 md:text-sm text-tikeo-gray-text" style="--d: 340ms">
          <li class="flex items-center gap-2"><AppIcon name="phone" class="h-[18px] w-[18px] text-[rgb(var(--tikeo-orange-strong))]" />{{ t('hero.trustPay') }}</li>
          <li class="flex items-center gap-2"><AppIcon name="qr" class="h-[18px] w-[18px] text-[rgb(var(--tikeo-orange-strong))]" />{{ t('hero.trustQr') }}</li>
        </ul>
      </div>

      <!-- ============ Diaporama ============ -->
      <div
        class="hero__rise relative order-1 lg:order-2"
        style="--d: 120ms"
        role="region"
        aria-roledescription="carousel"
        :aria-label="t('hero.sliderLabel')"
        @mouseenter="paused = true"
        @mouseleave="paused = false"
        @focusin="paused = true"
        @focusout="paused = false"
      >
        <!-- Image + cadre décalé aux couleurs du logo (desktop) : le cadre suit l'image seule, pas les commandes -->
        <div class="relative">
          <div class="tk-deco pointer-events-none absolute -bottom-3 -right-3 hidden h-full w-full bg-tikeo-brand lg:block" aria-hidden="true" />
          <div class="relative aspect-[16/9] overflow-hidden bg-tikeo-surface-alt sm:aspect-[16/10] shadow-card-hover lg:aspect-auto lg:h-[28rem]">
            <img
              v-for="(src, i) in images"
              :key="`${src}-${i}`"
              :src="src"
              :alt="i === 0 ? t('hero.title') : ''"
              class="absolute inset-0 h-full w-full object-cover transition-all duration-[1100ms] ease-out"
              :class="i === current ? 'scale-100 opacity-100' : 'scale-[1.04] opacity-0'"
              :aria-hidden="i === current ? 'false' : 'true'"
              :loading="i === 0 ? 'eager' : 'lazy'"
              :fetchpriority="i === 0 ? 'high' : 'auto'"
              decoding="async"
            />
          </div>
        </div>

        <!-- Commandes SOUS l'image : progression, compteur, flèches (jamais par-dessus le visuel) -->
        <div v-if="images.length > 1" class="relative mt-3 flex items-center justify-between gap-4 lg:mt-7">
          <div class="flex min-w-0 flex-1 items-center gap-1.5">
            <button
              v-for="(_, i) in images"
              :key="i"
              type="button"
              class="group flex h-7 min-w-[1.25rem] max-w-[3.5rem] flex-1 items-center"
              :aria-label="t('hero.slideAria', { n: i + 1 })"
              :aria-current="i === current ? 'true' : undefined"
              @click="go(i)"
            >
              <span class="relative block h-1.5 w-full overflow-hidden bg-black/15 transition-all group-hover:bg-black/30 dark:bg-white/20 dark:group-hover:bg-white/40">
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
            <span class="text-sm font-bold tabular-nums tracking-wider text-tikeo-black">{{ counter }}</span>
            <div class="flex gap-2">
              <button type="button" class="flex h-10 w-10 items-center justify-center border-2 border-tikeo-ink bg-tikeo-surface text-tikeo-black transition-colors hover:bg-tikeo-ink hover:text-white active:scale-95 dark:border-white/30 dark:hover:bg-white dark:hover:text-tikeo-ink" :aria-label="t('home.scrollPrev')" @click="go(current - 1)">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.6"><path stroke-linecap="round" stroke-linejoin="round" d="M15 5l-7 7 7 7" /></svg>
              </button>
              <button type="button" class="flex h-10 w-10 items-center justify-center border-2 border-tikeo-ink bg-tikeo-ink text-white transition-colors hover:bg-[#FF7A00] hover:text-tikeo-ink hover:border-[#FF7A00] active:scale-95 dark:border-[#FF7A00] dark:bg-[#FF7A00] dark:text-tikeo-ink dark:hover:bg-white dark:hover:border-white" :aria-label="t('home.scrollNext')" @click="go(current + 1)">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.6"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Entrée de la bannière : une seule séquence, au chargement de la page. */
.hero__rise {
  animation: hero-rise 0.8s var(--ease-tikeo) both;
  animation-delay: var(--d, 0ms);
}
@keyframes hero-rise {
  from { opacity: 0; transform: translateY(22px); }
  to { opacity: 1; transform: translateY(0); }
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

/* Reflet qui traverse le bouton principal au survol. */
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
  0% {
    transform: scale(1);
    opacity: 0.5;
  }
  70%,
  100% {
    transform: scale(1.9);
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .hero-play-ring {
    animation: none;
    display: none;
  }
}
</style>
