<script setup lang="ts">
// Bannière organisateur : trois étapes reliées par une ligne lumineuse qui se remplit pendant
// le défilement. Chaque étape a une petite maquette animée (sans texte, donc rien à traduire).
const { t } = useI18n()
const steps = computed(() => [
  { title: t('organizerBanner.step1Title'), text: t('organizerBanner.step1Text') },
  { title: t('organizerBanner.step2Title'), text: t('organizerBanner.step2Text') },
  { title: t('organizerBanner.step3Title'), text: t('organizerBanner.step3Text') },
])

const stepsEl = ref<HTMLElement | null>(null)
const progress = ref(0)
const active = computed(() => [0, 1, 2].map((i) => progress.value > (i + 0.15) / 3 - 0.02))

function update() {
  const el = stepsEl.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const vh = window.innerHeight
  progress.value = Math.max(0, Math.min(1, (vh * 0.8 - r.top) / (r.height * 0.9 + vh * 0.1)))
}
onMounted(() => {
  update()
  window.addEventListener('scroll', update, { passive: true })
  window.addEventListener('resize', update)
})
onUnmounted(() => {
  window.removeEventListener('scroll', update)
  window.removeEventListener('resize', update)
})
</script>

<template>
  <section class="mx-auto max-w-tikeo-content px-4 pt-16 md:px-6 md:pt-24">
    <div class="org relative isolate overflow-hidden rounded-[2rem] bg-tikeo-ink px-5 py-10 text-white sm:px-10 md:rounded-[2.25rem] md:px-14 md:py-14">
      <!-- Décor : grille fine + halos qui glissent -->
      <div class="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div class="absolute inset-0 bg-[linear-gradient(180deg,#0E2240_0%,#0B1B35_100%)]" />
        <div
          class="absolute inset-0 opacity-[0.06]"
          style="background-image: linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px); background-size: 56px 56px; -webkit-mask-image: radial-gradient(ellipse 90% 80% at 70% 20%, #000 10%, transparent 75%); mask-image: radial-gradient(ellipse 90% 80% at 70% 20%, #000 10%, transparent 75%)"
        />
        <div v-parallax="0.1" class="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#FF7A00]/25 blur-3xl" />
        <div v-parallax="-0.1" class="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-[#0057B8]/45 blur-3xl" />
        <div class="absolute inset-x-0 top-0 h-px bg-tikeo-brand" />
      </div>

      <p v-reveal:up class="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[13px] font-semibold text-[#FFB066]">
        <span class="h-1.5 w-1.5 rounded-full bg-[#FF7A00]" aria-hidden="true" />{{ t('organizerBanner.eyebrow') }}
      </p>
      <h2 v-reveal:title class="mt-5 max-w-2xl text-[1.9rem] font-bold leading-[1.06] tracking-[-0.035em] sm:text-4xl md:text-[3.1rem]" style="text-wrap: balance">{{ t('organizerBanner.title') }}</h2>
      <p v-reveal:up="140" class="mt-4 max-w-xl text-base leading-relaxed text-white/70 md:text-lg">{{ t('organizerBanner.subtitle') }}</p>

      <!-- Étapes -->
      <ol ref="stepsEl" class="org-steps relative mt-12 grid gap-2 md:grid-cols-3 md:gap-6">
        <span class="org-rail" :style="{ '--p': progress }" aria-hidden="true"><i /></span>

        <li v-for="(step, i) in steps" :key="step.title" v-reveal:up="i * 120" class="org-step relative pb-6 pl-[3.9rem] md:pb-0 md:pl-0 md:pt-14" :class="{ 'is-on': active[i] }">
          <span class="org-n" aria-hidden="true">{{ i + 1 }}</span>
          <h3 class="text-lg !font-[700] tracking-[-0.01em] md:text-xl">{{ step.title }}</h3>
          <p class="mt-1.5 text-[15px] leading-relaxed text-white/65">{{ step.text }}</p>

          <!-- Maquettes animées, décoratives -->
          <div class="org-mock mt-5 hidden rounded-2xl border border-white/10 bg-white/[0.05] p-4 md:block" aria-hidden="true">
            <template v-if="i === 0">
              <div class="flex h-10 items-center rounded-xl bg-white/10 px-3"><span class="org-type h-2.5 rounded bg-white/70" /><span class="org-caret" /></div>
              <div class="mt-2.5 grid grid-cols-2 gap-2.5"><span class="h-10 rounded-xl bg-[#FF7A00]/25" /><span class="h-10 rounded-xl bg-white/10" /></div>
              <span class="mt-2.5 block h-10 rounded-xl bg-[#FF7A00]" />
            </template>
            <template v-else-if="i === 1">
              <div v-for="(price, k) in ['5 000', '15 000', '3 000']" :key="price" class="mb-2 flex h-10 items-center justify-between rounded-xl bg-white/10 px-3 last:mb-0">
                <span class="h-2 w-14 rounded bg-white/40" />
                <span class="text-xs font-bold text-[#FFB066]">{{ price }}</span>
                <span class="org-tg" :class="{ 'is-on': k < 2 }" />
              </div>
            </template>
            <template v-else>
              <div class="flex items-baseline justify-between"><b class="text-3xl !font-[800] tabular-nums"><OrgCountUp :value="248" :duration="1600" on-view /></b><span class="text-xs font-bold text-emerald-300">+12</span></div>
              <div class="org-chart mt-2 flex h-20 items-end gap-1.5">
                <i v-for="(h, k) in [30, 45, 38, 65, 55, 82, 100]" :key="k" class="flex-1 rounded-t-md bg-gradient-to-b from-[#FF9A3D] to-[#FF7A00]" :style="{ height: `${h}%`, '--i': k }" />
              </div>
            </template>
          </div>
        </li>
      </ol>

      <div v-reveal:up="200" class="mt-10 flex flex-wrap items-center gap-3">
        <NuxtLink
          v-magnetic
          to="/organisateur/evenements/nouveau"
          class="group inline-flex h-[3.25rem] items-center justify-center gap-2 rounded-full bg-[#FF7A00] px-7 text-[15px] font-bold text-tikeo-ink shadow-[0_16px_34px_-12px_rgba(255,122,0,0.85)] transition-colors hover:bg-[#FF9A3D] max-sm:w-full"
        >
          {{ t('organizerBanner.cta') }}
          <AppIcon name="arrow-right" class="h-4 w-4 transition-transform group-hover:translate-x-1" :stroke="2.4" />
        </NuxtLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Ligne de progression : horizontale sur ordinateur, verticale sur mobile. */
.org-rail { position: absolute; background: rgba(255, 255, 255, 0.14); left: 1.19rem; top: 1.2rem; bottom: 1.2rem; width: 2px; }
.org-rail i { position: absolute; inset: 0; transform-origin: 50% 0; transform: scaleY(var(--p, 0)); background: linear-gradient(180deg, #ff7a00, #ffb066); box-shadow: 0 0 16px rgba(255, 122, 0, 0.8); }
@media (min-width: 768px) {
  .org-rail { left: 0; right: 0; top: 1.2rem; bottom: auto; width: auto; height: 2px; }
  .org-rail i { transform-origin: 0 50%; transform: scaleX(var(--p, 0)); }
}
.org-n {
  position: absolute; left: 0; top: 0; z-index: 1; display: grid; place-items: center; width: 2.5rem; height: 2.5rem; border-radius: 999px;
  background: #0e2240; border: 2px solid rgba(255, 255, 255, 0.25); color: rgba(255, 255, 255, 0.7); font-weight: 800; box-shadow: 0 0 0 8px #0e2240;
  transition: all 0.5s var(--ease-tikeo);
}
.is-on .org-n { background: #ff7a00; border-color: #ff7a00; color: #0e2240; transform: scale(1.12); }
.org-mock { transition: border-color 0.4s, background-color 0.4s; }
.is-on .org-mock { border-color: rgba(255, 122, 0, 0.45); background: rgba(255, 255, 255, 0.09); }
.org-type { width: 0; }
.is-on .org-type { animation: org-type 1.6s steps(14) forwards; }
@keyframes org-type { to { width: 7rem; } }
.org-caret { width: 2px; height: 1.1rem; margin-left: 2px; background: #ff7a00; animation: org-blink 1s steps(1) infinite; }
@keyframes org-blink { 50% { opacity: 0; } }
.org-tg { position: relative; width: 34px; height: 20px; border-radius: 20px; background: rgba(255, 255, 255, 0.2); transition: background-color 0.4s; }
.org-tg::after { content: ''; position: absolute; top: 3px; left: 3px; width: 14px; height: 14px; border-radius: 50%; background: #fff; transition: left 0.4s var(--ease-tikeo); }
.org-tg.is-on { background: #ff7a00; }
.org-tg.is-on::after { left: 17px; background: #0e2240; }
.org-chart i { transform-origin: bottom; transform: scaleY(0.1); transition: transform 1s var(--ease-tikeo); transition-delay: calc(var(--i) * 70ms); }
.is-on .org-chart i { transform: scaleY(1); }
@media (prefers-reduced-motion: reduce) {
  .org-caret { animation: none; }
  .org-type { width: 7rem; animation: none !important; }
  .org-chart i { transform: none; transition: none; }
}
:global(html.ui-reduce-motion) .org-caret { animation: none; }
:global(html.ui-reduce-motion) .org-type { width: 7rem; animation: none !important; }
:global(html.ui-reduce-motion) .org-chart i { transform: none; transition: none; }
</style>
