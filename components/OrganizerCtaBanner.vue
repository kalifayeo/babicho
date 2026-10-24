<script setup lang="ts">
const { t } = useI18n()
const steps = computed(() => [
  { title: t('organizerBanner.step1Title'), text: t('organizerBanner.step1Text') },
  { title: t('organizerBanner.step2Title'), text: t('organizerBanner.step2Text') },
  { title: t('organizerBanner.step3Title'), text: t('organizerBanner.step3Text') },
])
</script>

<template>
  <section class="mx-auto max-w-tikeo-container px-4 py-14 md:px-6 md:py-24">
    <div class="relative isolate grid gap-10 overflow-hidden rounded-3xl bg-tikeo-ink p-6 text-white sm:p-10 md:p-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center lg:gap-16">
      <!-- Décor : trame de points + halos aux couleurs de la marque -->
      <div class="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div class="absolute inset-0 opacity-[0.12]" style="background-image: radial-gradient(circle, #fff 1.2px, transparent 1.5px); background-size: 22px 22px" />
        <div class="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#FF7A00]/30 blur-3xl" />
        <div class="absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-[#0057B8]/40 blur-3xl" />
        <div class="absolute inset-x-0 top-0 h-1 bg-tikeo-brand" />
      </div>

      <div class="flex flex-col items-start">
        <p class="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[13px] font-semibold text-[#FFB066]">
          <span class="h-1.5 w-1.5 rounded-full bg-[#FF7A00]" aria-hidden="true" />{{ t('organizerBanner.eyebrow') }}
        </p>
        <h2 class="mt-5 text-[1.9rem] font-bold leading-[1.08] tracking-[-0.035em] sm:text-4xl md:text-5xl" style="text-wrap: balance">{{ t('organizerBanner.title') }}</h2>
        <p class="mt-4 max-w-md text-base font-medium leading-relaxed text-white/75 md:text-lg">{{ t('organizerBanner.subtitle') }}</p>
        <NuxtLink
          to="/organisateur/evenements/nouveau"
          class="group mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#FF7A00] px-7 text-[15px] font-bold text-tikeo-ink shadow-[0_14px_30px_-12px_rgba(255,122,0,0.8)] transition-colors hover:bg-[#FF9A3D] max-sm:w-full"
        >
          {{ t('organizerBanner.cta') }}
          <AppIcon name="arrow-right" class="h-4 w-4 transition-transform group-hover:translate-x-1" :stroke="2.4" />
        </NuxtLink>
      </div>

      <ol class="space-y-3 md:space-y-4">
        <li v-for="(step, i) in steps" :key="step.title" class="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm md:p-5">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FF7A00] text-base font-bold tabular-nums text-tikeo-ink">{{ i + 1 }}</span>
          <div>
            <h3 class="text-base font-bold tracking-[-0.01em] md:text-lg">{{ step.title }}</h3>
            <p class="mt-1 text-[15px] leading-relaxed text-white/70">{{ step.text }}</p>
          </div>
        </li>
      </ol>
    </div>
  </section>
</template>
