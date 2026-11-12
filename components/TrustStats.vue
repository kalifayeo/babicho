<script setup lang="ts">
// « Pourquoi Babicho » : mosaïque (bento) de 4 blocs, chacun avec sa petite animation :
// billet QR scanné par un laser, logos de paiement en orbite, ondes du support,
// chiffres réels (base de données) qui montent. Rien n'est inventé : les chiffres
// viennent de useHomeStats, le bloc disparaît s'ils ne sont pas encore chargés.
const { t } = useI18n()
const { stats } = useHomeStats()
const showStats = computed(() => stats.value.loaded && stats.value.events > 0)
const statItems = computed(() => [
  { value: stats.value.events, label: t('trustStats.statEvents') },
  { value: stats.value.organizers, label: t('trustStats.statOrganizers') },
  { value: stats.value.cities, label: t('trustStats.statCities') },
])
// Faux QR code décoratif (motif fixe, déterministe pour éviter tout écart SSR / client).
const qrCells = (() => {
  let seed = 7
  return Array.from({ length: 100 }, () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280 > 0.5
  })
})()

const badges = computed(() => [
  {
    title: t('trustStats.badgePaymentTitle'),
    text: t('trustStats.badgePaymentText'),
    icon: 'M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zM3 10h18M16 15h2',
  },
  {
    title: t('trustStats.badgeQrTitle'),
    text: t('trustStats.badgeQrText'),
    icon: 'M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 2h2v2h-2v-2zm4 0h2v2h-2v-2zm-4 4h2v2h-2v-2zm4 0h2v2h-2v-2zm0-8h2v2h-2v-2z',
  },
  {
    title: t('trustStats.badgeSupportTitle'),
    text: t('trustStats.badgeSupportText'),
    icon: 'M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  },
])

// Logos réellement utilisés au paiement (public/paiement/*).
const payments = [
  { name: 'Orange Money', src: '/paiement/orange-money.png' },
  { name: 'MTN MoMo', src: '/paiement/mtn.png' },
  { name: 'Moov Money', src: '/paiement/moov.png' },
  { name: 'Wave', src: '/paiement/wave.png' },
  { name: 'Djamo', src: '/paiement/djamo.png' },
  { name: 'Carte bancaire', src: '/paiement/carte.png' },
]
</script>

<template>
  <section class="mx-auto max-w-tikeo-content px-4 pt-16 md:px-6 md:pt-24" :aria-label="t('trustStats.title')">
    <div class="mb-8 md:mb-10">
      <span v-reveal:pop class="mb-4 flex w-fit items-center gap-1.5" aria-hidden="true">
        <span class="h-1.5 w-8 rounded-full bg-[#FF7A00]" /><span class="h-1.5 w-1.5 rounded-full bg-[#0057B8]" />
      </span>
      <h2 v-reveal:title class="sec-title max-w-2xl">{{ t('trustStats.title') }}</h2>
      <p v-reveal:up="100" class="sec-sub mt-3 max-w-xl">{{ t('trustStats.subtitle') }}</p>
    </div>

    <div class="grid gap-4 md:grid-cols-12 md:gap-5">
      <!-- 1. Billets QR : laser de scan -->
      <article v-reveal:up class="bento-tile group relative isolate min-h-[22rem] overflow-hidden rounded-[1.75rem] bg-tikeo-ink p-7 text-white md:col-span-7 md:min-h-[20rem]">
        <div class="pointer-events-none absolute -right-16 -top-20 -z-10 h-72 w-72 rounded-full bg-[#0057B8]/50 blur-[80px]" aria-hidden="true" />
        <h3 class="max-w-[22rem] text-2xl !font-[800] leading-tight tracking-[-0.025em]">{{ badges[1].title }}</h3>
        <p class="mt-2 max-w-[18rem] text-[15px] leading-relaxed text-white/70">{{ badges[1].text }}</p>
        <div class="bento-ticket absolute -bottom-3 right-5 w-[13.5rem] rounded-3xl bg-white p-4 text-tikeo-ink shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)] sm:right-8 sm:w-[15rem]" aria-hidden="true">
          <span class="bento-ok absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#16A34A] px-2.5 py-1 text-[11px] font-bold text-white">
            <AppIcon name="check" class="h-3 w-3" :stroke="3" />OK
          </span>
          <span class="block h-2 w-16 rounded bg-tikeo-ink/15" /><span class="mt-2 block h-3.5 w-28 rounded bg-tikeo-ink/80" /><span class="mt-1.5 block h-3 w-20 rounded bg-tikeo-ink/25" />
          <div class="bento-qr relative mt-4 grid h-[7.5rem] w-[7.5rem] grid-cols-10 gap-[2px] overflow-hidden rounded-xl border border-slate-200 bg-white p-2">
            <i v-for="(on, k) in qrCells" :key="k" class="rounded-[1.5px]" :class="on ? 'bg-tikeo-ink' : ''" />
          </div>
        </div>
      </article>

      <!-- 2. Paiement : logos en orbite -->
      <article v-reveal:up="90" class="bento-tile group relative isolate min-h-[26rem] overflow-hidden rounded-[1.75rem] border border-tikeo-border bg-tikeo-surface p-7 md:col-span-5 md:min-h-[21rem]">
        <h3 class="max-w-[13.5rem] text-2xl !font-[800] leading-tight tracking-[-0.025em] text-tikeo-black">{{ badges[0].title }}</h3>
        <p class="tx-body mt-2 max-w-[13.5rem]">{{ badges[0].text }}</p>
        <div class="bento-orbit absolute bottom-4 right-3 h-[13.5rem] w-[13.5rem] sm:right-5" aria-hidden="true">
          <div class="bento-ring absolute inset-[1.4rem] rounded-full border-[1.5px] border-dashed border-tikeo-border">
            <img v-for="(p, k) in payments.slice(0, 4)" :key="p.name" :src="p.src" :alt="p.name" width="44" height="44" loading="lazy"
              class="bento-sat absolute h-11 w-11 rounded-full border border-tikeo-border bg-white object-contain p-1.5 shadow-md" :style="{ '--a': `${k * 90}deg` }" />
          </div>
          <div class="absolute inset-[4.75rem] grid place-items-center rounded-full bg-tikeo-ink text-sm !font-[800] text-white ring-8 ring-tikeo-ink/[0.06]">FCFA</div>
        </div>
      </article>

      <!-- 3. Support : ondes -->
      <article v-reveal:up="60" class="bento-tile group relative isolate min-h-[18rem] overflow-hidden rounded-[1.75rem] border border-tikeo-border bg-tikeo-surface p-7 md:col-span-5">
        <h3 class="max-w-[15rem] text-2xl !font-[800] leading-tight tracking-[-0.025em] text-tikeo-black">{{ badges[2].title }}</h3>
        <p class="tx-body mt-2 max-w-[17rem]">{{ badges[2].text }}</p>
        <div class="absolute -bottom-10 -right-10 h-52 w-52" aria-hidden="true">
          <span class="bento-wave absolute inset-0 rounded-full border-2 border-[#FF7A00]/60" />
          <span class="bento-wave absolute inset-0 rounded-full border-2 border-[#FF7A00]/60" style="animation-delay: 1.2s" />
          <span class="bento-wave absolute inset-0 rounded-full border-2 border-[#FF7A00]/60" style="animation-delay: 2.4s" />
          <span class="absolute inset-[4.2rem] grid place-items-center rounded-full bg-[#FF7A00] text-tikeo-ink shadow-[0_14px_30px_-10px_rgba(255,122,0,0.8)]">
            <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.9"><path stroke-linecap="round" stroke-linejoin="round" :d="badges[2].icon" /></svg>
          </span>
        </div>
      </article>

      <!-- 4. Chiffres réels (ou invitation à explorer tant qu'ils ne sont pas chargés) -->
      <article v-reveal:up="150" class="bento-tile relative isolate min-h-[18rem] overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#FF7A00] to-[#FF9A3D] p-7 text-tikeo-ink md:col-span-7">
        <div class="pointer-events-none absolute inset-0 -z-10 opacity-[0.14]" style="background-image: radial-gradient(circle, #0E2240 1.5px, transparent 1.8px); background-size: 22px 22px" aria-hidden="true" />
        <template v-if="showStats">
          <dl class="grid h-full grid-cols-3 content-end gap-4 pt-24">
            <div v-for="item in statItems" :key="item.label">
              <dd class="text-[2rem] !font-[800] leading-none tracking-[-0.04em] tabular-nums sm:text-5xl"><OrgCountUp :value="item.value" :duration="1600" on-view /></dd>
              <dt class="mt-2 text-[13px] font-semibold leading-snug text-tikeo-ink/80">{{ item.label }}</dt>
            </div>
          </dl>
          <div class="bento-bars absolute left-7 right-7 top-7 flex h-14 items-end gap-1.5" aria-hidden="true">
            <i v-for="(h, k) in [38, 60, 48, 78, 64, 100, 82]" :key="k" class="flex-1 rounded-t-md bg-tikeo-ink/85" :style="{ height: `${h}%`, '--i': k }" />
          </div>
        </template>
        <template v-else>
          <h3 class="max-w-sm text-2xl !font-[800] leading-tight tracking-[-0.025em]">{{ t('hero.eyebrow') }}</h3>
          <NuxtLink to="/evenements" class="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-tikeo-ink px-6 text-sm font-bold text-white">{{ t('nav.explore') }}<AppIcon name="arrow-right" class="h-4 w-4" :stroke="2.4" /></NuxtLink>
        </template>
      </article>
    </div>
  </section>
</template>

<style scoped>
/* Halo qui suit la souris + animations propres à chaque bloc. Tout est coupé avec « réduire les animations ». */
.bento-tile { transition: transform 0.5s var(--ease-tikeo), box-shadow 0.4s; }
.bento-tile:hover { transform: translateY(-4px); box-shadow: 0 28px 50px -26px rgba(14, 34, 64, 0.45); }
.bento-ticket { transform: rotate(-6deg); animation: bento-bob 6s ease-in-out infinite; }
@keyframes bento-bob { 50% { transform: rotate(-3deg) translateY(-10px); } }
.bento-qr::after { content: ''; position: absolute; left: 0; right: 0; height: 3px; background: #ff7a00; box-shadow: 0 0 18px 4px rgba(255, 122, 0, 0.8); animation: bento-scan 2.6s ease-in-out infinite; }
@keyframes bento-scan { 0%, 100% { top: 4%; } 50% { top: 92%; } }
.bento-ok { animation: bento-ok 2.6s ease-in-out infinite; }
@keyframes bento-ok { 0%, 45% { opacity: 0; transform: scale(0.6); } 55%, 90% { opacity: 1; transform: scale(1); } 100% { opacity: 0; } }
.bento-ring { animation: bento-spin 24s linear infinite; }
.bento-sat { left: 50%; top: 50%; margin: -22px; transform: rotate(var(--a)) translateY(-5.35rem) rotate(calc(var(--a) * -1)); }
@keyframes bento-spin { to { transform: rotate(360deg); } }
.bento-ring .bento-sat { animation: bento-counter 24s linear infinite; }
@keyframes bento-counter {
  from { transform: rotate(var(--a)) translateY(-5.35rem) rotate(calc(var(--a) * -1)); }
  to { transform: rotate(var(--a)) translateY(-5.35rem) rotate(calc(var(--a) * -1 - 360deg)); }
}
.bento-wave { animation: bento-wave 3.6s ease-out infinite; opacity: 0; }
@keyframes bento-wave { 0% { transform: scale(0.35); opacity: 0.9; } 100% { transform: scale(1.1); opacity: 0; } }
.bento-bars i { transform-origin: bottom; animation: bento-grow 1.2s var(--ease-tikeo) both; animation-delay: calc(var(--i) * 80ms + 300ms); }
@keyframes bento-grow { from { transform: scaleY(0.12); } to { transform: scaleY(1); } }
@media (prefers-reduced-motion: reduce) {
  .bento-ticket, .bento-qr::after, .bento-ok, .bento-ring, .bento-ring .bento-sat, .bento-wave, .bento-bars i { animation: none !important; }
  .bento-ok { opacity: 1; }
}
:global(html.ui-reduce-motion) .bento-ticket,
:global(html.ui-reduce-motion) .bento-qr::after,
:global(html.ui-reduce-motion) .bento-ring,
:global(html.ui-reduce-motion) .bento-ring .bento-sat,
:global(html.ui-reduce-motion) .bento-wave,
:global(html.ui-reduce-motion) .bento-bars i { animation: none !important; }
</style>
