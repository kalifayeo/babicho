<script setup lang="ts">
const { t } = useI18n()
const year = new Date().getFullYear()
const { openPreferences } = useCookieConsent()
const { socialLinks, contact } = useSiteSettings()

function scrollTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Logos réellement utilisés au paiement (public/paiement/*).
const payments = [
  { name: 'Orange Money', src: '/paiement/orange-money.png' },
  { name: 'MTN MoMo', src: '/paiement/mtn.png' },
  { name: 'Moov Money', src: '/paiement/moov.png' },
  { name: 'Wave', src: '/paiement/wave.png' },
  { name: 'Djamo', src: '/paiement/djamo.png' },
  { name: 'Carte bancaire', src: '/paiement/carte.png' },
]

const trust = computed(() => [
  { icon: 'shield-check', title: t('footer.trust1Title'), desc: t('footer.trust1Desc') },
  { icon: 'qr', title: t('footer.trust2Title'), desc: t('footer.trust2Desc') },
  { icon: 'user-check', title: t('footer.trust3Title'), desc: t('footer.trust3Desc') },
  { icon: 'headset', title: t('footer.trust4Title'), desc: t('footer.trust4Desc') },
])

const columns = computed(() => [
  {
    title: t('footer.discover'),
    icon: 'compass',
    links: [
      { to: '/evenements', label: t('footer.allEvents'), icon: 'calendar' },
      { to: '/recherche', label: t('header.search'), icon: 'search' },
      { to: '/mon-espace/mes-billets', label: t('header.myTickets'), icon: 'ticket' },
      { to: '/mon-espace/mes-favoris', label: t('header.favorites'), icon: 'heart' },
      { to: '/comment-ca-marche', label: t('footer.howItWorks'), icon: 'help' },
      { to: '/application', label: t('footer.getApp'), icon: 'phone' },
    ],
  },
  {
    title: t('footer.organizer'),
    icon: 'briefcase',
    links: [
      { to: '/organisateur', label: t('footer.becomeOrganizer'), icon: 'users' },
      { to: '/organisateur/evenements/nouveau', label: t('header.publish'), icon: 'calendar-plus' },
      { to: '/organisateur/tarifs', label: t('header.pricing'), icon: 'tag' },
    ],
  },
  {
    title: t('footer.support'),
    icon: 'headset',
    links: [
      { to: '/faq', label: t('header.faq'), icon: 'help' },
      { to: '/contact', label: t('footer.customerService'), icon: 'mail' },
      { to: '/securite', label: t('footer.security'), icon: 'shield-check' },
      { to: '/avis', label: t('feedback.footerLink'), icon: 'star' },
      { to: '/remboursement', label: t('footer.refundPolicy'), icon: 'receipt' },
      { to: '/mentions-legales', label: t('footer.legal'), icon: 'file-text' },
    ],
  },
  {
    title: t('footer.about'),
    icon: 'building',
    links: [
      { to: '/qui-sommes-nous', label: t('header.about'), icon: 'info' },
      { to: '/blog', label: t('blog.navLabel'), icon: 'newspaper' },
      { to: '/presse', label: t('press.navLabel'), icon: 'mic' },
      { to: '/partenaires', label: t('partners.navLabel'), icon: 'handshake' },
      { to: '/contact', label: t('header.contact2'), icon: 'send' },
      { to: '/conditions', label: t('footer.terms'), icon: 'clipboard' },
      { to: '/confidentialite', label: t('footer.privacy'), icon: 'lock' },
      { to: '/cookies', label: t('footer.cookiesPolicy'), icon: 'settings' },
    ],
  },
])
</script>

<template>
  <footer class="mt-12 border-t border-tikeo-border bg-tikeo-surface text-tikeo-black">
    <!-- Engagements -->
    <div class="border-b border-tikeo-border">
      <ul class="mx-auto grid max-w-tikeo-container grid-cols-2 gap-x-4 gap-y-6 px-4 py-6 md:px-6 lg:grid-cols-4 lg:gap-8 lg:py-7">
        <li v-for="item in trust" :key="item.title" class="flex items-start gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-tikeo-border bg-tikeo-surface-alt text-tikeo-black">
            <AppIcon :name="item.icon" class="h-5 w-5" :stroke="1.7" />
          </span>
          <div class="min-w-0">
            <p class="text-sm font-bold leading-tight text-tikeo-black">{{ item.title }}</p>
            <p class="mt-0.5 text-xs leading-snug text-tikeo-gray-text">{{ item.desc }}</p>
          </div>
        </li>
      </ul>
    </div>

    <div class="mx-auto max-w-tikeo-container px-4 pb-24 pt-10 md:px-6 md:pb-6 md:pt-12">
      <div class="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,2.85fr)] lg:gap-14">
        <!-- Marque + contact -->
        <div>
          <NuxtLink to="/" class="inline-block" aria-label="Babicho">
            <SiteLogo />
          </NuxtLink>
          <p class="mt-4 max-w-xs text-sm leading-relaxed text-tikeo-gray-text">{{ t('footer.tagline') }}</p>

          <ul class="mt-5 space-y-2.5 text-sm">
            <li v-if="contact.email">
              <a :href="`mailto:${contact.email}`" class="group inline-flex items-center gap-2.5 text-tikeo-black transition-colors hover:text-tikeo-orange">
                <AppIcon name="mail" class="h-4 w-4 shrink-0 text-tikeo-gray-text transition-colors group-hover:text-tikeo-orange" />{{ contact.email }}
              </a>
            </li>
            <li v-if="contact.phone">
              <a :href="`tel:${contact.phone.replace(/\s+/g, '')}`" class="group inline-flex items-center gap-2.5 text-tikeo-black transition-colors hover:text-tikeo-orange">
                <AppIcon name="phone" class="h-4 w-4 shrink-0 text-tikeo-gray-text transition-colors group-hover:text-tikeo-orange" />{{ contact.phone }}
              </a>
            </li>
            <li v-if="contact.address" class="flex items-start gap-2.5 text-tikeo-gray-text">
              <AppIcon name="pin" class="mt-0.5 h-4 w-4 shrink-0" />{{ contact.address }}
            </li>
            <li v-if="contact.hours" class="flex items-start gap-2.5 text-tikeo-gray-text">
              <AppIcon name="clock" class="mt-0.5 h-4 w-4 shrink-0" />{{ contact.hours }}
            </li>
          </ul>

          <div v-if="socialLinks.length" class="mt-5">
            <p class="mb-2 text-[11px] font-bold uppercase tracking-wider text-tikeo-gray-text">{{ t('footer.followUs') }}</p>
            <ul class="flex flex-wrap gap-2">
              <li v-for="s in socialLinks" :key="s.name">
                <a
                  :href="s.href"
                  target="_blank"
                  rel="noopener noreferrer"
                  :aria-label="s.name"
                  :title="s.name"
                  class="flex h-10 w-10 items-center justify-center rounded-xl border border-tikeo-border text-tikeo-black transition-all duration-200 hover:-translate-y-0.5 hover:border-tikeo-ink hover:bg-tikeo-ink hover:text-white dark:hover:border-[#FF7A00] dark:hover:bg-[#FF7A00] dark:hover:text-tikeo-ink"
                >
                  <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor"><path :d="s.path" /></svg>
                </a>
              </li>
            </ul>
          </div>

          <div class="mt-5">
            <p class="mb-2 text-[11px] font-bold uppercase tracking-wider text-tikeo-gray-text">{{ t('footer.downloadApp') }}</p>
            <StoreBadges size="sm" />
          </div>
        </div>

        <!-- Liens -->
        <nav class="grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-4" aria-label="Babicho">
          <div v-for="col in columns" :key="col.title">
            <h3 class="mb-4 flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-wider text-tikeo-black">
              <AppIcon :name="col.icon" class="h-4 w-4 text-tikeo-gray-text" :stroke="2" />
              {{ col.title }}
            </h3>
            <ul class="space-y-2.5 text-[13px] leading-snug">
              <li v-for="l in col.links" :key="l.label">
                <NuxtLink :to="l.to" class="group inline-flex items-start gap-2 text-tikeo-gray-text transition-colors hover:text-tikeo-black">
                  <AppIcon :name="l.icon" class="mt-px h-[15px] w-[15px] shrink-0 opacity-70 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-tikeo-orange group-hover:opacity-100" :stroke="1.8" />
                  <span>{{ l.label }}</span>
                </NuxtLink>
              </li>
            </ul>
          </div>
        </nav>
      </div>

      <!-- Moyens de paiement -->
      <div class="mt-10 flex flex-col gap-4 border-t border-tikeo-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p class="flex items-center gap-2 text-xs font-semibold text-tikeo-gray-text">
          <AppIcon name="shield-check" class="h-4 w-4" />{{ t('footer.payTitle') }}
        </p>
        <ul class="flex flex-wrap gap-2">
          <li v-for="p in payments" :key="p.name">
            <img :src="p.src" :alt="p.name" :title="p.name" width="40" height="40" loading="lazy" class="h-10 w-10 rounded-lg border border-tikeo-border bg-white object-contain p-1.5" />
          </li>
        </ul>
      </div>

      <!-- Barre basse -->
      <div class="mt-6 flex flex-col gap-4 border-t border-tikeo-border pt-5 md:flex-row md:items-center md:justify-between">
        <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-tikeo-gray-text">
          <span>© {{ year }} Babicho. {{ t('footer.rights') }}</span>
          <NuxtLink to="/confidentialite" class="inline-flex items-center gap-1.5 transition-colors hover:text-tikeo-black"><AppIcon name="lock" class="h-3.5 w-3.5" />{{ t('footer.privacy') }}</NuxtLink>
          <NuxtLink to="/conditions" class="inline-flex items-center gap-1.5 transition-colors hover:text-tikeo-black"><AppIcon name="clipboard" class="h-3.5 w-3.5" />{{ t('footer.terms') }}</NuxtLink>
          <NuxtLink to="/plan-du-site" class="inline-flex items-center gap-1.5 transition-colors hover:text-tikeo-black"><AppIcon name="list" class="h-3.5 w-3.5" />{{ t('footer.sitemap') }}</NuxtLink>
          <button type="button" class="inline-flex items-center gap-1.5 transition-colors hover:text-tikeo-black" @click="openPreferences"><AppIcon name="settings" class="h-3.5 w-3.5" />{{ t('footer.cookies') }}</button>
        </div>

        <div class="flex items-center justify-between gap-4 md:justify-end">
          <p class="flex items-center gap-1.5 text-xs text-tikeo-gray-text"><AppIcon name="heart" class="h-3.5 w-3.5" />{{ t('footer.madeIn') }}</p>
          <div class="flex items-center gap-2">
            <LanguageSwitcher up />
            <button
              type="button"
              class="flex h-10 w-10 items-center justify-center rounded-xl border border-tikeo-border text-tikeo-black transition-all duration-200 hover:-translate-y-0.5 hover:border-tikeo-ink hover:bg-tikeo-ink hover:text-white dark:hover:border-[#FF7A00] dark:hover:bg-[#FF7A00] dark:hover:text-tikeo-ink"
              :aria-label="t('footer.backToTop')"
              @click="scrollTop"
            >
              <AppIcon name="arrow-up" class="h-4 w-4" :stroke="2.4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>
