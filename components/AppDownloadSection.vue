<script setup lang="ts">
/**
 * Accueil — « Babicho dans votre poche ». Bandeau orange pleine largeur :
 * texte, avantages, badges des stores et QR code à gauche ; téléphone « qui
 * sort du bas du bandeau » à droite.
 *
 * Mobile : version compacte (≈ moitié moins haute) — avantages en 3 colonnes
 * sans description, téléphone coupé en bas qui ne montre que son haut.
 * Animations : le texte se dévoile en cascade, le téléphone surgit du bas
 * puis flotte doucement, les pastilles rebondissent ; le décor glisse en
 * parallaxe. Tout se coupe avec « réduire les animations ».
 */
const { t } = useI18n()

const features = computed(() => [
  { icon: 'ticket', title: t('appDownload.f1Title'), text: t('appDownload.f1Text') },
  { icon: 'card', title: t('appDownload.f2Title'), text: t('appDownload.f2Text') },
  { icon: 'bell', title: t('appDownload.f3Title'), text: t('appDownload.f3Text') },
])
</script>

<template>
  <section class="relative overflow-hidden bg-[#FF7A00] text-tikeo-ink" aria-labelledby="app-download-title">
    <!-- trame de points, très discrète (glisse lentement) -->
    <div class="tk-deco pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div v-parallax="-0.06" class="absolute -inset-x-4 -inset-y-24 opacity-[0.13]" style="background-image: radial-gradient(circle, #0E2240 1.5px, transparent 1.8px); background-size: 22px 22px" />
    </div>
    <div class="tk-deco pointer-events-none absolute -bottom-32 -left-24 h-80 w-80" aria-hidden="true">
      <div v-parallax="0.1" class="h-full w-full rounded-full bg-white/25 blur-3xl" />
    </div>

    <div class="relative mx-auto grid max-w-tikeo-container gap-4 px-4 pt-8 md:gap-8 md:px-6 md:pt-16 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-6 lg:pt-0">
      <div class="lg:py-20">
        <h2 id="app-download-title" v-reveal:title class="max-w-xl text-[1.9rem] font-bold leading-[1.06] tracking-[-0.035em] md:text-5xl lg:text-[3.4rem]">
          {{ t('appDownload.title') }}
        </h2>
        <p v-reveal:up="120" class="mt-3 max-w-lg text-[15px] font-medium leading-relaxed text-tikeo-ink/85 md:mt-5 md:text-lg">{{ t('appDownload.subtitle') }}</p>

        <!-- Avantages : 3 colonnes (icône + titre) sur mobile, liste détaillée dès md -->
        <ul v-stagger:left="{ step: 120, delay: 220 }" class="mt-5 grid grid-cols-3 gap-2 md:mt-7 md:max-w-xl md:grid-cols-1 md:gap-4">
          <li v-for="f in features" :key="f.title" class="flex flex-col items-center gap-1.5 text-center md:flex-row md:items-start md:gap-3.5 md:text-left">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center bg-tikeo-ink text-white md:h-10 md:w-10">
              <AppIcon :name="f.icon" class="h-[18px] w-[18px] md:h-5 md:w-5" />
            </span>
            <div>
              <p class="text-[13px] font-bold leading-tight md:text-[17px]">{{ f.title }}</p>
              <p class="mt-1 hidden text-[15px] leading-snug text-tikeo-ink/80 md:block">{{ f.text }}</p>
            </div>
          </li>
        </ul>

        <div v-reveal:up="450" class="mt-5 flex flex-wrap items-center gap-x-8 gap-y-4 md:mt-8 md:gap-y-6">
          <!-- Mobile : badges plus petits pour tenir côte à côte -->
          <StoreBadges size="sm" class="md:hidden" />
          <StoreBadges size="lg" class="hidden md:flex" />

          <!-- QR : utile uniquement sur ordinateur (sur mobile, on touche le badge) -->
          <div class="hidden items-center gap-3 lg:flex">
            <AppQrCode :size="84" />
            <p class="max-w-[9rem] text-xs font-semibold leading-snug">
              {{ t('appDownload.scanTitle') }}
              <span class="mt-0.5 block font-normal text-tikeo-ink/75">{{ t('appDownload.scanText') }}</span>
            </p>
          </div>
        </div>

        <NuxtLink to="/application" class="group mt-4 inline-flex items-center gap-2 text-sm font-bold underline decoration-tikeo-ink decoration-2 underline-offset-[6px] transition-opacity hover:opacity-70 md:mt-7">
          {{ t('appDownload.more') }}
          <AppIcon name="arrow-right" class="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" :stroke="2.4" />
        </NuxtLink>
      </div>

      <!-- Téléphone : dépasse du bas du bandeau, coupé par overflow-hidden.
           Mobile : seulement le haut du téléphone (hauteur réduite). -->
      <div class="relative h-[12.5rem] sm:h-[22rem] lg:h-auto lg:min-h-[36rem]">
        <div class="absolute inset-x-0 top-1 flex justify-center sm:top-2 lg:top-16">
          <div v-reveal:rise="150">
            <div class="tk-float">
              <AppPhoneMockup compact />
            </div>
          </div>
        </div>

        <div v-reveal:pop="900" class="absolute left-0 top-20 hidden sm:block lg:-left-4 lg:top-24" aria-hidden="true">
          <div class="tk-float flex items-center gap-2.5 bg-white py-2 pl-2 pr-4 shadow-card-hover">
            <span class="flex h-8 w-8 items-center justify-center bg-[#16A34A] text-white"><AppIcon name="check" class="h-4 w-4" :stroke="3" /></span>
            <span class="text-xs font-bold leading-tight">{{ t('appDownload.chipAdded') }}</span>
          </div>
        </div>
        <div v-reveal:pop="1150" class="absolute right-0 top-48 hidden sm:block lg:-right-2 lg:top-56" aria-hidden="true">
          <div class="tk-float-slow flex items-center gap-2.5 bg-tikeo-ink py-2 pl-2 pr-4 text-white shadow-card-hover">
            <span class="flex h-8 w-8 items-center justify-center bg-[#FF7A00] text-tikeo-ink"><AppIcon name="scan" class="h-4 w-4" :stroke="2.4" /></span>
            <span class="text-xs font-bold leading-tight">{{ t('appDownload.chipScanned') }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
