<script setup lang="ts">
const { t } = useI18n()
useSeoMeta({
  title: () => `${t('sitemapPage.title')} | Babicho`,
  description: () => t('sitemapPage.intro'),
})

const groups = computed(() => [
  {
    title: t('footer.discover'),
    links: [
      { to: '/', label: t('nav.home') },
      { to: '/evenements', label: t('footer.allEvents') },
      { to: '/recherche', label: t('header.search') },
      { to: '/comment-ca-marche', label: t('footer.howItWorks') },
      { to: '/application', label: t('footer.getApp') },
    ],
  },
  {
    title: t('footer.organizer'),
    links: [
      { to: '/organisateur', label: t('footer.becomeOrganizer') },
      { to: '/organisateur/tarifs', label: t('header.pricing') },
    ],
  },
  {
    title: t('sitemapPage.account'),
    links: [
      { to: '/connexion', label: t('header.login') },
      { to: '/inscription', label: t('header.register') },
      { to: '/mon-espace/mes-billets', label: t('header.myTickets') },
      { to: '/mon-espace/mes-favoris', label: t('header.favorites') },
    ],
  },
  {
    title: t('footer.support'),
    links: [
      { to: '/faq', label: t('header.faq') },
      { to: '/contact', label: t('footer.customerService') },
      { to: '/securite', label: t('footer.security') },
      { to: '/avis', label: t('feedback.footerLink') },
    ],
  },
  {
    title: t('footer.about'),
    links: [
      { to: '/qui-sommes-nous', label: t('header.about') },
      { to: '/blog', label: t('blog.navLabel') },
      { to: '/presse', label: t('press.navLabel') },
      { to: '/partenaires', label: t('partners.navLabel') },
    ],
  },
  {
    title: t('sitemapPage.legal'),
    links: [
      { to: '/conditions', label: t('footer.terms') },
      { to: '/remboursement', label: t('footer.refundPolicy') },
      { to: '/confidentialite', label: t('footer.privacy') },
      { to: '/cookies', label: t('footer.cookiesPolicy') },
      { to: '/mentions-legales', label: t('footer.legal') },
    ],
  },
])
</script>

<template>
  <div>
    <PageHero :eyebrow="t('sitemapPage.eyebrow')" :title="t('sitemapPage.title')" :subtitle="t('sitemapPage.intro')" />
    <div class="mx-auto max-w-tikeo-container px-4 py-10 md:px-6 md:py-16">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
        <section v-for="g in groups" :key="g.title" class="border border-tikeo-border bg-tikeo-surface p-6 shadow-card">
          <h2 class="flex items-center gap-2 font-display text-lg font-extrabold text-tikeo-black">
            <span class="h-4 w-1 bg-[#FF7A00]" aria-hidden="true" />{{ g.title }}
          </h2>
          <ul class="mt-4 space-y-2">
            <li v-for="l in g.links" :key="l.to">
              <NuxtLink :to="l.to" class="group inline-flex items-center gap-1.5 text-sm font-semibold text-tikeo-gray-text transition-colors hover:text-tikeo-black">
                <span class="underline decoration-transparent decoration-2 underline-offset-[5px] transition-colors group-hover:decoration-[#FF7A00]">{{ l.label }}</span>
              </NuxtLink>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>
