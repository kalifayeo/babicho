<script setup lang="ts">
const { t } = useI18n()
useSeoMeta({
  title: () => `${t('refundPage.title')} | Babicho`,
  description: () => t('refundPage.intro'),
})
const sections = computed(() =>
  Array.from({ length: 7 }, (_, i) => ({ title: t(`refundPage.s${i + 1}Title`), text: t(`refundPage.s${i + 1}Text`) })),
)
</script>

<template>
  <LegalLayout
    :title="t('refundPage.title')"
    :updated-at="t('refundPage.updatedAt')"
    :intro="t('refundPage.intro')"
    :sections="sections"
    :other="{ to: '/conditions', label: t('termsPage.title') }"
  />
</template>
