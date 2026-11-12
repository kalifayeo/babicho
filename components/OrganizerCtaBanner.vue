<script setup lang="ts">
const { t } = useI18n()
const steps = computed(() => [
  { title: t('organizerBanner.step1Title'), text: t('organizerBanner.step1Text') },
  { title: t('organizerBanner.step2Title'), text: t('organizerBanner.step2Text') },
  { title: t('organizerBanner.step3Title'), text: t('organizerBanner.step3Text') },
])
</script>

<template>
  <section class="mx-auto max-w-tikeo-content px-4 pt-16 md:px-6 md:pt-24">
    <div class="relative isolate grid gap-10 overflow-hidden rounded-[2rem] bg-tikeo-ink p-6 text-white sm:p-10 md:p-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center lg:gap-14">
      <!-- Décor : fine grille + halos aux couleurs de la marque (glissent doucement) -->
      <div class="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div class="absolute inset-0 bg-[linear-gradient(180deg,#0E2240_0%,#0B1B35_100%)]" />
        <div
          class="absolute inset-0 opacity-[0.06]"
          style="background-image: linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px); background-size: 56px 56px; -webkit-mask-image: radial-gradient(ellipse 90% 80% at 70% 30%, #000 10%, transparent 75%); mask-image: radial-gradient(ellipse 90% 80% at 70% 30%, #000 10%, transparent 75%)"
        />
        <div v-parallax="0.1" class="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#FF7A00]/25 blur-3xl" />
        <div v-parallax="-0.1" class="absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-[#0057B8]/40 blur-3xl" />
        <div class="absolute inset-x-0 top-0 h-px bg-tikeo-brand" />
      </div>

      <div class="flex flex-col items-start">
        <p v-reveal:up class="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[13px] font-semibold text-[#FFB066]">
          <span class="h-1.5 w-1.5 rounded-full bg-[#FF7A00]" aria-hidden="true" />{{ t('organizerBanner.eyebrow') }}
        </p>
        <h2 v-reveal:title class="mt-5 text-[1.9rem] font-bold leading-[1.08] tracking-[-0.035em] sm:text-4xl md:text-[2.75rem]" style="text-wrap: balance">{{ t('organizerBanner.title') }}</h2>
        <p v-reveal:up="140" class="mt-4 max-w-md text-base leading-relaxed text-white/70 md:text-lg">{{ t('organizerBanner.subtitle') }}</p>
        <div v-reveal:up="260" class="max-sm:w-full">
          <NuxtLink
            to="/organisateur/evenements/nouveau"
            v-magnetic
            class="group mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#FF7A00] px-7 text-[15px] font-bold text-tikeo-ink shadow-[0_14px_30px_-12px_rgba(255,122,0,0.8)] transition-colors hover:bg-[#FF9A3D] max-sm:w-full"
          >
            {{ t('organizerBanner.cta') }}
            <AppIcon name="arrow-right" class="h-4 w-4 transition-transform group-hover:translate-x-1" :stroke="2.4" />
          </NuxtLink>
        </div>
      </div>

      <!-- Étapes : une ligne les relie, chaque carte arrive l'une après l'autre -->
      <ol v-stagger:left="{ step: 140, delay: 120 }" class="relative space-y-3">
        <span class="org-line pointer-events-none absolute bottom-10 left-[1.9rem] top-10 w-px bg-gradient-to-b from-[#FF7A00]/60 via-white/15 to-transparent md:left-[2.15rem]" aria-hidden="true" />
        <li v-for="(step, i) in steps" :key="step.title" class="org-step group relative flex gap-4 rounded-2xl border border-white/10 bg-white/[0.05] p-4 transition-colors duration-300 hover:border-[#FF7A00]/40 hover:bg-white/[0.09] md:p-5">
          <span class="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FF7A00] text-base font-bold tabular-nums text-tikeo-ink shadow-[0_0_0_6px_rgba(14,34,64,1)] transition-transform duration-300 group-hover:scale-110">{{ i + 1 }}</span>
          <div>
            <h3 class="text-base font-bold tracking-[-0.01em] md:text-lg">{{ step.title }}</h3>
            <p class="mt-1 text-[15px] leading-relaxed text-white/65">{{ step.text }}</p>
          </div>
        </li>
      </ol>
    </div>
  </section>
</template>
