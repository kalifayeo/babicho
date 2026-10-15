<script setup lang="ts">
const { t } = useI18n()

useSeoMeta({
  title: () => `${t('appPage.title')} | Babicho`,
  description: () => t('appPage.intro'),
  ogTitle: () => `${t('appPage.title')} | Babicho`,
  ogDescription: () => t('appPage.intro'),
})

// Installation « depuis le navigateur » (PWA) en attendant / en complément des stores.
const installEvent = useState<any>('tikeo-pwa-install-event', () => null)
const installed = useState<boolean>('tikeo-pwa-installed', () => false)
const ios = ref(false)
onMounted(() => {
  ios.value = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream
})
async function installPwa() {
  const ev = installEvent.value
  if (!ev) return
  ev.prompt()
  await ev.userChoice.catch(() => null)
  installEvent.value = null
}

const features = computed(() => [
  { icon: 'ticket', title: t('appPage.f1Title'), text: t('appPage.f1Text') },
  { icon: 'scan', title: t('appPage.f2Title'), text: t('appPage.f2Text') },
  { icon: 'card', title: t('appPage.f3Title'), text: t('appPage.f3Text') },
  { icon: 'bell', title: t('appPage.f4Title'), text: t('appPage.f4Text') },
])

const steps = computed(() => [
  { title: t('appPage.step1Title'), text: t('appPage.step1Text') },
  { title: t('appPage.step2Title'), text: t('appPage.step2Text') },
  { title: t('appPage.step3Title'), text: t('appPage.step3Text') },
])

const faqs = computed(() => [1, 2, 3, 4].map((n) => ({ q: t(`appPage.q${n}`), a: t(`appPage.a${n}`) })))
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="relative isolate overflow-hidden bg-tikeo-ink text-white">
      <div class="absolute inset-x-0 top-0 h-1 bg-tikeo-brand" aria-hidden="true" />
      <div class="pointer-events-none absolute -right-32 top-10 -z-10 h-96 w-96 rounded-full bg-[#FF7A00]/25 blur-3xl" aria-hidden="true" />
      <div class="pointer-events-none absolute -bottom-32 -left-20 -z-10 h-80 w-80 rounded-full bg-[#0057B8]/40 blur-3xl" aria-hidden="true" />

      <div class="mx-auto grid max-w-tikeo-container gap-8 px-4 pt-12 md:px-6 md:pt-20 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:pt-0">
        <div class="lg:py-24">
          <p class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-white/70">
            <span class="h-[3px] w-6 bg-[#FF7A00]" aria-hidden="true" />
            {{ t('appPage.eyebrow') }}
          </p>
          <h1 class="mt-3 max-w-2xl font-display text-[2.2rem] font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">{{ t('appPage.title') }}</h1>
          <p class="mt-5 max-w-xl text-base leading-relaxed text-white/80 md:text-lg">{{ t('appPage.intro') }}</p>

          <div class="mt-8 flex flex-wrap items-center gap-x-8 gap-y-6">
            <StoreBadges size="lg" />
            <div class="hidden items-center gap-3 lg:flex">
              <AppQrCode :size="84" />
              <p class="max-w-[9rem] text-xs font-semibold leading-snug">
                {{ t('appDownload.scanTitle') }}
                <span class="mt-0.5 block font-normal text-white/65">{{ t('appDownload.scanText') }}</span>
              </p>
            </div>
          </div>
          <p class="mt-5 max-w-md text-xs leading-relaxed text-white/60">{{ t('appPage.soonNote') }}</p>
        </div>

        <div class="relative h-[26rem] sm:h-[30rem] lg:h-auto lg:min-h-[36rem]">
          <div class="absolute left-1/2 top-2 -translate-x-1/2 lg:top-20"><AppPhoneMockup /></div>
        </div>
      </div>
    </section>

    <!-- Avantages -->
    <section class="mx-auto max-w-tikeo-container px-4 py-14 md:px-6 md:py-20">
      <SectionHeading :title="t('appPage.featuresTitle')" :text="t('appPage.featuresText')" />
      <div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        <article v-for="f in features" :key="f.title" class="group border border-tikeo-border bg-tikeo-surface p-6 shadow-card">
          <span class="flex h-12 w-12 items-center justify-center bg-tikeo-ink text-white transition-colors duration-200 group-hover:bg-[#FF7A00] group-hover:text-tikeo-ink dark:bg-[#FF7A00] dark:text-tikeo-ink">
            <AppIcon :name="f.icon" class="h-6 w-6" />
          </span>
          <h3 class="mt-5 font-display text-lg font-extrabold leading-tight text-tikeo-black">{{ f.title }}</h3>
          <p class="mt-2 text-sm leading-relaxed text-tikeo-gray-text">{{ f.text }}</p>
        </article>
      </div>
    </section>

    <!-- Installer : étapes + alternative navigateur -->
    <section class="border-y border-tikeo-border bg-tikeo-surface-alt">
      <div class="mx-auto grid max-w-tikeo-container gap-10 px-4 py-14 md:px-6 md:py-20 lg:grid-cols-2 lg:gap-16">
        <div>
          <SectionHeading :title="t('appPage.stepsTitle')" />
          <!-- Vraie séquence : la numérotation a un sens -->
          <ol class="relative mt-8 space-y-7">
            <span class="absolute bottom-3 left-[17px] top-3 w-px bg-tikeo-border" aria-hidden="true" />
            <li v-for="(s, i) in steps" :key="s.title" class="relative flex gap-5">
              <span class="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center bg-tikeo-ink font-display text-base font-extrabold text-white dark:bg-[#FF7A00] dark:text-tikeo-ink">{{ i + 1 }}</span>
              <div class="pt-0.5">
                <h3 class="font-display text-lg font-bold text-tikeo-black">{{ s.title }}</h3>
                <p class="mt-1 text-sm leading-relaxed text-tikeo-gray-text">{{ s.text }}</p>
              </div>
            </li>
          </ol>
        </div>

        <div class="self-start border border-tikeo-border bg-tikeo-surface p-6 shadow-card md:p-8">
          <span class="flex h-11 w-11 items-center justify-center bg-[#FF7A00] text-tikeo-ink"><AppIcon name="globe" class="h-6 w-6" /></span>
          <h3 class="mt-4 font-display text-xl font-extrabold text-tikeo-black">{{ t('appPage.pwaTitle') }}</h3>
          <p class="mt-2 text-sm leading-relaxed text-tikeo-gray-text">{{ t('appPage.pwaText') }}</p>

          <button v-if="installEvent && !installed" type="button" class="btn-ink mt-5" @click="installPwa">
            <AppIcon name="download" class="h-4 w-4" :stroke="2.2" />
            {{ t('appPage.pwaButton') }}
          </button>
          <ul v-else class="mt-5 space-y-2.5 text-sm text-tikeo-black">
            <li v-if="ios" class="flex gap-2.5"><AppIcon name="check" class="mt-0.5 h-4 w-4 shrink-0 text-[#FF7A00]" :stroke="3" />{{ t('pwa.iosHelp') }}</li>
            <li v-else class="flex gap-2.5"><AppIcon name="check" class="mt-0.5 h-4 w-4 shrink-0 text-[#FF7A00]" :stroke="3" />{{ t('appPage.pwaAndroid') }}</li>
            <li class="flex gap-2.5"><AppIcon name="check" class="mt-0.5 h-4 w-4 shrink-0 text-[#FF7A00]" :stroke="3" />{{ t('appPage.pwaSame') }}</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="mx-auto max-w-3xl px-4 py-14 md:px-6 md:py-20">
      <SectionHeading :title="t('appPage.faqTitle')" center />
      <div class="mt-8 space-y-3">
        <details v-for="f in faqs" :key="f.q" class="group border border-tikeo-border bg-tikeo-surface shadow-card">
          <summary class="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-display text-[17px] font-bold text-tikeo-black [&::-webkit-details-marker]:hidden">
            {{ f.q }}
            <AppIcon name="chevron-down" class="h-5 w-5 shrink-0 transition-transform duration-200 group-open:rotate-180" :stroke="2.4" />
          </summary>
          <p class="border-t border-tikeo-border px-5 py-4 text-sm leading-relaxed text-tikeo-gray-text">{{ f.a }}</p>
        </details>
      </div>
    </section>

    <!-- Appel final -->
    <section class="mx-auto max-w-tikeo-container px-4 pb-14 md:px-6 md:pb-20">
      <div class="relative isolate overflow-hidden bg-tikeo-ink p-6 text-white md:p-12">
        <div class="absolute inset-x-0 top-0 h-1 bg-tikeo-brand" aria-hidden="true" />
        <div class="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div class="max-w-xl">
            <h2 class="font-display text-3xl font-extrabold leading-[1.05] tracking-tight md:text-4xl">{{ t('appPage.ctaTitle') }}</h2>
            <p class="mt-3 text-white/75">{{ t('appPage.ctaText') }}</p>
          </div>
          <StoreBadges size="lg" />
        </div>
      </div>
    </section>
  </div>
</template>
