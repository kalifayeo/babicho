<script setup lang="ts">
const { t } = useI18n()
const steps = computed(() => [
  { title: t('organizerBanner.step1Title'), text: t('organizerBanner.step1Text') },
  { title: t('organizerBanner.step2Title'), text: t('organizerBanner.step2Text') },
  { title: t('organizerBanner.step3Title'), text: t('organizerBanner.step3Text') },
])
</script>

<template>
  <section class="mx-auto max-w-tikeo-container px-4 py-14 md:px-6 md:py-20">
    <div v-reveal:zoom class="grid gap-10 bg-tikeo-ink p-6 text-white md:p-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
      <div class="flex flex-col items-start">
        <SplitHeading tag="h2" :text="t('organizerBanner.title')" :delay="200" class="font-display text-3xl font-extrabold leading-[1.05] tracking-tight md:text-5xl" />
        <p v-reveal:up="350" class="mt-4 max-w-md text-base leading-relaxed text-white/75">{{ t('organizerBanner.subtitle') }}</p>
        <NuxtLink
          v-magnetic
          to="/organisateur/evenements/nouveau"
          class="tk-shine mt-7 inline-flex h-12 items-center justify-center bg-[#FF7A00] px-7 text-sm font-bold text-tikeo-ink transition-colors hover:bg-white"
        >
          {{ t('organizerBanner.cta') }}
        </NuxtLink>
      </div>

      <!-- Vraie séquence : la numérotation a un sens ici -->
      <div v-reveal:up="250" class="relative">
        <!-- le fil se trace de haut en bas quand le bloc apparaît -->
        <span class="rv-draw absolute bottom-3 left-[17px] top-3 w-px bg-white/30" aria-hidden="true" />
        <ol v-stagger:left="{ step: 220, delay: 450 }" class="relative space-y-7">
        <li v-for="(step, i) in steps" :key="step.title" class="relative flex gap-5">
          <span class="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center bg-[#FF7A00] font-display text-base font-extrabold text-tikeo-ink">{{ i + 1 }}</span>
          <div class="pt-0.5">
            <h3 class="font-display text-lg font-bold">{{ step.title }}</h3>
            <p class="mt-1 text-sm leading-relaxed text-white/70">{{ step.text }}</p>
          </div>
        </li>
        </ol>
      </div>
    </div>
  </section>
</template>
