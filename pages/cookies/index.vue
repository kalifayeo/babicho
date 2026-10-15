<script setup lang="ts">
const { t } = useI18n()
const { openPreferences } = useCookieConsent()
useSeoMeta({
  title: () => `${t('cookiesPage.title')} | Babicho`,
  description: () => t('cookiesPage.intro'),
})
const sections = computed(() =>
  Array.from({ length: 6 }, (_, i) => ({ title: t(`cookiesPage.s${i + 1}Title`), text: t(`cookiesPage.s${i + 1}Text`) })),
)
</script>

<template>
  <div>
    <LegalLayout
      :title="t('cookiesPage.title')"
      :updated-at="t('cookiesPage.updatedAt')"
      :intro="t('cookiesPage.intro')"
      :sections="sections"
      :other="{ to: '/confidentialite', label: t('privacyPage.title') }"
    />
    <div class="mx-auto max-w-tikeo-container px-4 pb-10 md:px-6 print:hidden">
      <button type="button" class="btn-ink" @click="openPreferences">{{ t('footer.cookies') }}</button>
    </div>
  </div>
</template>
