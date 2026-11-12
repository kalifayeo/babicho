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

const columns = computed(() => [
  {
    title: t('footer.discover'),
    links: [
      { to: '/evenements', label: t('footer.allEvents') },
      { to: '/comment-ca-marche', label: t('footer.howItWorks') },
      { to: '/application', label: t('footer.getApp') },
      { to: '/mon-espace/mes-billets', label: t('header.myTickets') },
    ],
  },
  {
    title: t('footer.organizer'),
    links: [
      { to: '/organisateur', label: t('footer.becomeOrganizer') },
      { to: '/organisateur/evenements/nouveau', label: t('header.publish') },
      { to: '/organisateur/tarifs', label: t('header.pricing') },
    ],
  },
  {
    title: t('footer.support'),
    links: [
      { to: '/faq', label: t('header.faq') },
      { to: '/contact', label: t('footer.customerService') },
      { to: '/securite', label: t('footer.security') },
      { to: '/remboursement', label: t('footer.refundPolicy') },
    ],
  },
  {
    title: t('footer.about'),
    links: [
      { to: '/qui-sommes-nous', label: t('header.about') },
      { to: '/blog', label: t('blog.navLabel') },
      { to: '/partenaires', label: t('partners.navLabel') },
    ],
  },
])
</script>

<template>
  <footer class="mt-16 rounded-t-[2rem] bg-tikeo-ink text-white md:rounded-t-[3rem]">
    <div class="mx-auto max-w-tikeo-content px-4 pb-24 pt-10 md:px-6 md:pb-8 md:pt-14">
      <div class="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)] lg:gap-16">
        <!-- Marque -->
        <div>
          <NuxtLink to="/" class="inline-block rounded-2xl bg-white px-4 py-2.5" aria-label="Babicho"><SiteLogo /></NuxtLink>
          <p class="mt-4 max-w-xs text-[15px] leading-relaxed text-white/65">{{ t('footer.tagline') }}</p>

          <div class="mt-5 flex flex-wrap items-center gap-2">
            <a v-if="contact.email" :href="`mailto:${contact.email}`" class="inline-flex h-10 items-center gap-2 rounded-full border border-white/20 px-4 text-sm font-semibold transition-colors hover:bg-white hover:text-tikeo-ink">
              <AppIcon name="mail" class="h-4 w-4" />{{ contact.email }}
            </a>
            <ul v-if="socialLinks.length" class="flex gap-1.5">
              <li v-for="s in socialLinks" :key="s.name">
                <a :href="s.href" target="_blank" rel="noopener noreferrer" :aria-label="s.name" :title="s.name" class="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#FF7A00] hover:bg-[#FF7A00] hover:text-tikeo-ink">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path :d="s.path" /></svg>
                </a>
              </li>
            </ul>
          </div>
          <div class="mt-5"><StoreBadges size="sm" /></div>
        </div>

        <!-- Liens -->
        <nav class="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4" aria-label="Babicho">
          <div v-for="col in columns" :key="col.title">
            <h3 class="mb-3.5 text-xs font-bold uppercase tracking-[0.14em] text-[#FFB066]">{{ col.title }}</h3>
            <ul class="space-y-2.5 text-[15px]">
              <li v-for="l in col.links" :key="l.label">
                <NuxtLink :to="l.to" class="inline-block text-white/70 transition-all duration-200 hover:translate-x-1 hover:text-white">{{ l.label }}</NuxtLink>
              </li>
            </ul>
          </div>
        </nav>
      </div>

      <!-- Barre basse : légal · paiement · langue -->
      <div class="mt-10 flex flex-col gap-4 border-t border-white/12 pt-6 md:flex-row md:items-center md:justify-between">
        <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-white/55">
          <span>© {{ year }} Babicho</span>
          <NuxtLink to="/mentions-legales" class="transition-colors hover:text-white">{{ t('footer.legal') }}</NuxtLink>
          <NuxtLink to="/conditions" class="transition-colors hover:text-white">{{ t('footer.terms') }}</NuxtLink>
          <NuxtLink to="/confidentialite" class="transition-colors hover:text-white">{{ t('footer.privacy') }}</NuxtLink>
          <button type="button" class="transition-colors hover:text-white" @click="openPreferences">{{ t('footer.cookies') }}</button>
        </div>
        <div class="flex items-center justify-between gap-4 md:justify-end">
          <ul class="flex gap-1.5">
            <li v-for="p in payments" :key="p.name">
              <img :src="p.src" :alt="p.name" :title="p.name" width="32" height="32" loading="lazy" class="h-8 w-8 rounded-lg bg-white object-contain p-1" />
            </li>
          </ul>
          <div class="flex items-center gap-2 [&_button]:!border-white/25 [&_button]:!bg-transparent [&_button]:!text-white [&_svg]:!text-white">
            <LanguageSwitcher up />
            <button type="button" class="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-tikeo-ink" :aria-label="t('footer.backToTop')" @click="scrollTop">
              <AppIcon name="arrow-up" class="h-4 w-4" :stroke="2.4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>
