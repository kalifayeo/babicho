<script setup lang="ts">
// Tarifs organisateurs : une commission par billet vendu qui BAISSE avec les
// ventes cumulées (paliers lus dans la table commission_tiers, migration 0047).
// Aucun forfait à choisir ni à payer. L'organisateur choisit, par événement,
// qui paie la commission (lui ou l'acheteur) — voir l'assistant de création.
const { t, locale } = useI18n()
const { isAuthenticated } = useAuth()
const { tiers, status, fetchTiers, fetchStatus } = useCommission()

useSeoMeta({
  title: () => `${t('organizerPricingPage.eyebrow')} | Babicho`,
  description: () => t('organizerPricingPage.intro'),
})

onMounted(async () => {
  await fetchTiers()
  if (isAuthenticated.value) await fetchStatus()
})

const fmt = (n: number) => new Intl.NumberFormat(locale.value, { maximumFractionDigits: 0 }).format(Math.round(n))
const fmtRate = (n: number) => String(n).replace('.', ',')

// Paliers triés + bornes lisibles : « de 0 à 1 000 000 », « au-delà de 20 000 000 ».
const ladder = computed(() => {
  const list = [...tiers.value].sort((a, b) => a.min_sales - b.min_sales)
  return list.map((tier, i) => {
    const next = list[i + 1]
    return {
      ...tier,
      max: next ? next.min_sales : null,
      range: next
        ? t('organizerPricingPage.tierRange', { from: fmt(tier.min_sales), to: fmt(next.min_sales) })
        : t('organizerPricingPage.tierBeyond', { from: fmt(tier.min_sales) }),
      current: !!status.value && !status.value.custom && status.value.rate === tier.rate && status.value.sales >= tier.min_sales && (!next || status.value.sales < next.min_sales),
    }
  })
})

const steps = computed(() => [
  { title: t('organizerBanner.step1Title'), text: t('organizerBanner.step1Text') },
  { title: t('organizerBanner.step2Title'), text: t('organizerBanner.step2Text') },
  { title: t('organizerBanner.step3Title'), text: t('organizerBanner.step3Text') },
])

const included = computed(() => [
  { icon: 'qr', text: t('organizerPricingPage.included1') },
  { icon: 'card', text: t('organizerPricingPage.included2') },
  { icon: 'dashboard', text: t('organizerPricingPage.included3') },
  { icon: 'shield-check', text: t('organizerPricingPage.included4') },
])

// --- Simulateur : calcul progressif par palier (comme en base : chaque vente
// est facturée au taux du palier atteint par les ventes cumulées) ------------
const price = ref(5000)
const qty = ref(200)
const safe = (n: unknown) => Math.max(0, Number(n) || 0)
const gross = computed(() => safe(price.value) * safe(qty.value))
const breakdown = computed(() =>
  ladder.value
    .map((tier) => {
      const upper = tier.max ?? Infinity
      const amount = Math.max(0, Math.min(gross.value, upper) - tier.min_sales)
      return { ...tier, amount, fee: (amount * tier.rate) / 100 }
    })
    .filter((row) => row.amount > 0),
)
const fee = computed(() => breakdown.value.reduce((sum, r) => sum + r.fee, 0))
const avgRate = computed(() => (gross.value > 0 ? (fee.value / gross.value) * 100 : 0))
const feePerTicket = computed(() => (safe(qty.value) > 0 ? fee.value / safe(qty.value) : 0))

const faqs = computed(() => [
  { q: t('organizerPricingPage.faq1q'), a: t('organizerPricingPage.faq1a') },
  { q: t('organizerPricingPage.faq2q'), a: t('organizerPricingPage.faq2a') },
  { q: t('organizerPricingPage.faq3q'), a: t('organizerPricingPage.faq3a') },
  { q: t('organizerPricingPage.faq4q'), a: t('organizerPricingPage.faq4a') },
])
const openFaq = ref<number | null>(0)

// Curseurs du simulateur (synchronisés avec les champs numériques)
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n))
const priceSlider = computed({ get: () => clamp(safe(price.value), 0, 100000), set: (v: number) => (price.value = Number(v)) })
const qtySlider = computed({ get: () => clamp(safe(qty.value), 0, 5000), set: (v: number) => (qty.value = Number(v)) })
// Part de chaque palier dans la commission (barre empilée)
const feeShare = computed(() => breakdown.value.map((r) => ({ key: r.min_sales, pct: fee.value > 0 ? (r.fee / fee.value) * 100 : 0 })))
const payerCards = computed(() => [
  { icon: 'briefcase', title: t('organizerPricingPage.payerOrganizerTitle'), text: t('organizerPricingPage.payerOrganizerText'), tone: 'bg-tikeo-ink text-white dark:bg-white dark:text-tikeo-ink' },
  { icon: 'users', title: t('organizerPricingPage.payerBuyerTitle'), text: t('organizerPricingPage.payerBuyerText'), tone: 'bg-[#FF7A00] text-tikeo-ink' },
])

const ctaLink = computed(() => (isAuthenticated.value ? '/devenir-organisateur' : '/inscription'))
</script>

<template>
  <div class="pb-6">
    <PageHero
      :eyebrow="t('organizerPricingPage.eyebrow')"
      :title="t('organizerPricingPage.title')"
      :subtitle="t('organizerPricingPage.intro')"
    >
      <div class="flex flex-wrap gap-3">
        <a href="#paliers" class="btn-brand group !h-12 !rounded-full !px-7">
          {{ t('organizerPricingPage.seeTiers') }}
          <AppIcon name="arrow-down" class="h-4 w-4 transition-transform group-hover:translate-y-0.5" :stroke="2.4" />
        </a>
        <a
          href="#simulateur"
          class="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/30 px-7 text-sm font-bold text-white transition-colors hover:border-white hover:bg-white hover:text-tikeo-ink"
        >
          {{ t('organizerPricingPage.simTitle') }}
        </a>
      </div>
    </PageHero>

    <!-- ============ Paliers ============ -->
    <section id="paliers" class="mx-auto max-w-tikeo-content scroll-mt-24 px-4 pb-6 pt-10 md:px-6 md:pt-14">
      <p v-if="status" v-reveal:up class="mb-6 flex items-start gap-3 rounded-2xl bg-[#FF7A00]/10 px-5 py-4 text-sm text-tikeo-black">
        <AppIcon name="sparkles" class="mt-0.5 h-5 w-5 shrink-0 text-[#E05F00]" />
        <span>
          <template v-if="status.custom">{{ t('organizerPricingPage.yourRateCustom', { rate: fmtRate(status.rate) }) }}</template>
          <template v-else>
            {{ t('organizerPricingPage.yourRate', { rate: fmtRate(status.rate), sales: fmt(status.sales) }) }}
            <span v-if="status.next_min_sales"> {{ t('organizerPricingPage.yourNext', { rate: fmtRate(status.next_rate || 0), amount: fmt(status.next_min_sales - status.sales) }) }}</span>
          </template>
        </span>
      </p>

      <div v-stagger:up="{ step: 100 }" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:items-stretch">
        <article
          v-for="(tier, i) in ladder"
          :key="tier.min_sales"
          v-tilt
          class="tr-card group relative flex flex-col overflow-hidden rounded-[1.75rem] border p-6 transition-shadow duration-300 md:p-7"
          :class="tier.current ? 'border-[#FF7A00] bg-tikeo-ink text-white shadow-[0_30px_60px_-26px_rgba(255,122,0,0.55)]' : 'border-tikeo-border bg-tikeo-surface text-tikeo-black shadow-card hover:shadow-[0_30px_50px_-28px_rgba(14,34,64,0.4)]'"
        >
          <div v-if="tier.current" class="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-[#FF7A00]/35 blur-3xl" aria-hidden="true" />
          <div class="flex items-center justify-between">
            <span class="flex h-9 w-9 items-center justify-center rounded-xl font-display text-sm font-extrabold" :class="tier.current ? 'bg-[#FF7A00] text-tikeo-ink' : 'bg-tikeo-surface-alt text-tikeo-black'">{{ i + 1 }}</span>
            <span v-if="tier.current" class="rounded-full bg-[#FF7A00] px-3 py-1 text-[11px] font-bold text-tikeo-ink">{{ t('organizerPricingPage.yourTier') }}</span>
          </div>
          <p class="mt-6 flex items-baseline gap-2">
            <span class="font-display text-[3.4rem] font-extrabold leading-none tracking-[-0.04em]" :class="tier.current ? 'text-[#FF8A1A]' : 'text-tikeo-black'">{{ fmtRate(tier.rate) }}<small class="text-[0.55em]">%</small></span>
          </p>
          <p class="mt-1 text-xs font-semibold" :class="tier.current ? 'text-white/70' : 'text-tikeo-gray-text'">{{ t('organizerPricingPage.perTicketSold') }}</p>
          <p class="mt-6 border-t border-dashed pt-4 text-sm font-bold" :class="tier.current ? 'border-white/25' : 'border-tikeo-border'">{{ tier.range }}</p>
          <p class="mt-1 text-xs" :class="tier.current ? 'text-white/60' : 'text-tikeo-gray-text'">{{ t('organizerPricingPage.tierUnit') }}</p>
        </article>
      </div>
      <p class="mt-8 text-center text-xs text-tikeo-gray-text">{{ t('organizerPricingPage.commissionNote') }}</p>
    </section>

    <!-- ============ Qui paie la commission ============ -->
    <section v-reveal:up class="mx-auto max-w-tikeo-content px-4 py-8 md:px-6">
      <SectionHeading :eyebrow="t('organizerPricingPage.payerEyebrow')" :title="t('organizerPricingPage.payerTitle')" :text="t('organizerPricingPage.payerIntro')" />
      <div class="mt-8 grid gap-5 md:grid-cols-2">
        <div v-for="c in payerCards" :key="c.title" class="group flex gap-4 rounded-[1.75rem] border border-tikeo-border bg-tikeo-surface p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-[#FF7A00]/50 md:p-7">
          <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" :class="c.tone"><AppIcon :name="c.icon" class="h-6 w-6" /></span>
          <div>
            <h3 class="font-display text-lg font-extrabold text-tikeo-black">{{ c.title }}</h3>
            <p class="mt-2 text-sm leading-relaxed text-tikeo-gray-text">{{ c.text }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ Inclus partout ============ -->
    <section class="mx-auto max-w-tikeo-content px-4 py-6 md:px-6">
      <div v-reveal:up class="rounded-[1.75rem] border border-tikeo-border bg-tikeo-surface p-5 shadow-card md:p-7">
        <p class="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-tikeo-gray-text">{{ t('organizerPricingPage.includedTitle') }}</p>
        <ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <li v-for="it in included" :key="it.text" class="flex items-center gap-3 rounded-2xl bg-tikeo-surface-alt p-3.5">
            <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tikeo-surface text-[#E05F00] shadow-sm"><AppIcon :name="it.icon" class="h-5 w-5" /></span>
            <span class="text-sm font-semibold leading-snug text-tikeo-black">{{ it.text }}</span>
          </li>
        </ul>
      </div>
    </section>

    <!-- ============ Simulateur ============ -->
    <section id="simulateur" class="mx-auto max-w-tikeo-content scroll-mt-24 px-4 py-10 md:px-6 md:py-14">
      <SectionHeading :eyebrow="t('organizerPricingPage.simEyebrow')" :title="t('organizerPricingPage.simTitle')" :text="t('organizerPricingPage.simIntro')" />

      <div class="mt-8 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div v-reveal:left class="space-y-6 rounded-[1.75rem] border border-tikeo-border bg-tikeo-surface p-6 shadow-card md:p-8">
          <div>
            <label for="sim-price" class="acc-label mb-2 block">{{ t('organizerPricingPage.simPrice') }}</label>
            <input id="sim-price" v-model.number="price" type="number" min="0" step="500" inputmode="numeric" class="field-input !rounded-xl" />
            <input v-model.number="priceSlider" type="range" min="0" max="100000" step="500" class="tr-range mt-3 w-full" :aria-label="t('organizerPricingPage.simPrice')" />
          </div>
          <div>
            <label for="sim-qty" class="acc-label mb-2 block">{{ t('organizerPricingPage.simQty') }}</label>
            <input id="sim-qty" v-model.number="qty" type="number" min="0" step="10" inputmode="numeric" class="field-input !rounded-xl" />
            <input v-model.number="qtySlider" type="range" min="0" max="5000" step="10" class="tr-range mt-3 w-full" :aria-label="t('organizerPricingPage.simQty')" />
          </div>
          <div class="border-t-2 border-dashed border-tikeo-border pt-5">
            <p class="acc-label">{{ t('organizerPricingPage.simGross') }}</p>
            <p class="mt-1 font-display text-4xl font-extrabold tracking-[-0.03em] text-tikeo-black">
              {{ fmt(gross) }} <span class="text-base font-bold text-tikeo-gray-text">FCFA</span>
            </p>
          </div>
        </div>

        <div v-reveal:right class="overflow-hidden rounded-[1.75rem] border border-tikeo-border bg-tikeo-surface shadow-card">
          <div class="grid grid-cols-2 gap-px bg-tikeo-border">
            <div class="bg-tikeo-surface p-5 md:px-7 md:py-6">
              <p class="acc-label">{{ t('organizerPricingPage.simCommission') }}</p>
              <p class="mt-1 font-display text-2xl font-extrabold text-tikeo-black md:text-3xl">{{ fmt(fee) }} <span class="text-xs font-bold text-tikeo-gray-text">FCFA</span></p>
              <p class="mt-1 text-xs text-tikeo-gray-text">{{ t('organizerPricingPage.simAverage', { rate: avgRate.toFixed(1).replace('.', ','), perTicket: fmt(feePerTicket) }) }}</p>
            </div>
            <div class="bg-tikeo-surface p-5 md:px-7 md:py-6">
              <p class="acc-label">{{ t('organizerPricingPage.simNet') }}</p>
              <p class="mt-1 font-display text-2xl font-extrabold text-[#E05F00] md:text-3xl">{{ fmt(gross - fee) }} <span class="text-xs font-bold text-tikeo-gray-text">FCFA</span></p>
              <p class="mt-1 text-xs text-tikeo-gray-text">{{ t('organizerPricingPage.simIfOrganizerPays') }}</p>
            </div>
          </div>
          <!-- Barre : part de chaque palier dans la commission -->
          <div v-if="feeShare.length > 1" class="flex h-2 overflow-hidden bg-tikeo-surface-alt" aria-hidden="true">
            <span v-for="(f, i) in feeShare" :key="f.key" class="block h-full transition-all duration-500" :class="['bg-[#FF7A00]', 'bg-[#FF9A3D]', 'bg-[#0057B8]', 'bg-tikeo-ink'][i % 4]" :style="{ width: f.pct + '%' }" />
          </div>
          <p class="bg-tikeo-surface-alt px-5 py-3 text-xs text-tikeo-black md:px-7">
            {{ t('organizerPricingPage.simIfBuyerPays', { net: fmt(gross), perTicket: fmt(safe(price) + feePerTicket) }) }}
          </p>
          <ul class="divide-y divide-tikeo-border">
            <li v-for="row in breakdown" :key="row.min_sales" class="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm md:px-7">
              <span class="text-tikeo-gray-text">{{ row.range }}</span>
              <span class="font-semibold text-tikeo-black">{{ fmt(row.amount) }} × {{ fmtRate(row.rate) }}% = {{ fmt(row.fee) }} FCFA</span>
            </li>
          </ul>
          <p class="bg-tikeo-surface-alt px-5 py-3 text-[11px] text-tikeo-gray-text md:px-7">{{ t('organizerPricingPage.simNote') }}</p>
        </div>
      </div>
    </section>

    <!-- ============ Comment ça marche ============ -->
    <section class="mx-auto max-w-tikeo-content px-4 py-6 md:px-6 md:py-10">
      <div class="rounded-[2rem] bg-tikeo-surface-alt px-5 py-10 md:rounded-[2.5rem] md:px-10 md:py-14">
        <SectionHeading :eyebrow="t('organizerPricingPage.howEyebrow')" :title="t('organizerPricingPage.howTitle')" center />
        <ol v-stagger:up="{ step: 110 }" class="mt-10 grid gap-5 md:grid-cols-3">
          <li v-for="(s, i) in steps" :key="s.title" class="group relative rounded-[1.75rem] border border-tikeo-border bg-tikeo-surface p-6 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:border-[#FF7A00]/50">
            <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF7A00] font-display text-xl font-extrabold text-tikeo-ink transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">{{ i + 1 }}</span>
            <h3 class="mt-5 font-display text-lg font-bold text-tikeo-black">{{ s.title }}</h3>
            <p class="mt-1.5 text-sm leading-relaxed text-tikeo-gray-text">{{ s.text }}</p>
          </li>
        </ol>
      </div>
    </section>

    <!-- ============ Sur mesure ============ -->
    <section class="mx-auto max-w-tikeo-content px-4 py-6 md:px-6 md:py-10">
      <div v-reveal:up class="relative isolate overflow-hidden rounded-[2rem] bg-tikeo-ink p-7 text-white md:rounded-[2.5rem] md:p-12">
        <div class="pointer-events-none absolute -right-16 -top-16 -z-10 h-64 w-64 rounded-full bg-[#FF7A00]/30 blur-3xl" aria-hidden="true" />
        <div class="pointer-events-none absolute -bottom-24 left-1/3 -z-10 h-56 w-56 rounded-full bg-[#0057B8]/35 blur-3xl" aria-hidden="true" />
        <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div class="max-w-xl">
            <p class="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#FFB066]">
              <span class="h-1.5 w-6 rounded-full bg-[#FF7A00]" aria-hidden="true" />
              {{ t('organizerPricingPage.customTagline') }}
            </p>
            <h2 class="mt-3 font-display text-3xl font-extrabold tracking-[-0.03em] md:text-4xl">{{ t('organizerPricingPage.customName') }}</h2>
            <p class="mt-3 text-[15px] leading-relaxed text-white/70">{{ t('organizerPricingPage.customText') }}</p>
          </div>
          <NuxtLink to="/contact" class="btn-brand group shrink-0 self-start !h-12 !rounded-full !px-7 md:self-auto">
            {{ t('organizerPricingPage.customButton') }}
            <AppIcon name="arrow-right" class="h-4 w-4 transition-transform group-hover:translate-x-1" :stroke="2.4" />
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ============ FAQ ============ -->
    <section class="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
      <SectionHeading :title="t('organizerPricingPage.faqTitle')" center />
      <div v-reveal:up class="mt-8 divide-y divide-tikeo-border overflow-hidden rounded-[1.75rem] border border-tikeo-border bg-tikeo-surface shadow-card">
        <FaqItem
          v-for="(f, i) in faqs"
          :key="f.q"
          :question="f.q"
          :answer="f.a"
          :open="openFaq === i"
          @toggle="openFaq = openFaq === i ? null : i"
        />
      </div>
    </section>

    <!-- ============ CTA final ============ -->
    <section class="mx-auto max-w-tikeo-content px-4 pb-10 md:px-6 md:pb-14">
      <div v-reveal:zoom class="relative isolate overflow-hidden rounded-[2rem] bg-[#FF7A00] p-7 text-tikeo-ink md:rounded-[2.5rem] md:p-12">
        <div class="pointer-events-none absolute -right-10 -top-16 -z-10 h-64 w-64 rounded-full bg-white/30 blur-3xl" aria-hidden="true" />
        <div class="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 class="font-display text-3xl font-extrabold leading-tight tracking-[-0.03em] md:text-5xl">{{ t('organizerPricingPage.ctaTitle') }}</h2>
            <p class="mt-3 max-w-md text-[15px] font-medium md:text-base">{{ t('organizerPricingPage.ctaText') }}</p>
          </div>
          <NuxtLink
            :to="status ? '/organisateur/evenements/nouveau' : ctaLink"
            class="group inline-flex h-14 shrink-0 items-center justify-center gap-2 rounded-full bg-tikeo-ink px-8 text-sm font-bold text-white transition-colors hover:bg-white hover:text-tikeo-ink"
          >
            {{ status ? t('organizerPricingPage.ctaCreate') : t('organizerPricingPage.ctaButton') }}
            <AppIcon name="arrow-right" class="h-4 w-4 transition-transform group-hover:translate-x-1" :stroke="2.4" />
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.tr-range { appearance: none; height: 6px; border-radius: 9999px; background: rgb(var(--tikeo-border)); outline: none; cursor: pointer; }
.tr-range::-webkit-slider-thumb { appearance: none; width: 22px; height: 22px; border-radius: 50%; background: #ff7a00; border: 4px solid #fff; box-shadow: 0 4px 12px rgba(255, 122, 0, 0.55); transition: transform 0.15s; }
.tr-range::-webkit-slider-thumb:hover { transform: scale(1.15); }
.tr-range::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: #ff7a00; border: 4px solid #fff; box-shadow: 0 4px 12px rgba(255, 122, 0, 0.55); }
</style>
