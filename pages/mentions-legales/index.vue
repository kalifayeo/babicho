<script setup lang="ts">
import { COMPANY } from '~/utils/company'

const { t } = useI18n()
useSeoMeta({
  title: () => `${t('legalNoticePage.title')} | Babicho`,
  description: () => t('legalNoticePage.intro'),
})

// Les champs laissés vides dans utils/company.ts sont simplement omis.
const editor = computed(() => {
  const parts = [
    COMPANY.legalName || COMPANY.brand,
    COMPANY.legalForm,
    COMPANY.capital && `${t('legalNoticePage.lblCapital')} : ${COMPANY.capital}`,
    COMPANY.registration && `${t('legalNoticePage.lblRegistration')} : ${COMPANY.registration}`,
    COMPANY.taxId && `${t('legalNoticePage.lblTax')} : ${COMPANY.taxId}`,
    COMPANY.address && `${t('legalNoticePage.lblAddress')} : ${COMPANY.address}`,
    COMPANY.publicationDirector && `${t('legalNoticePage.lblDirector')} : ${COMPANY.publicationDirector}`,
  ].filter(Boolean)
  return parts.join(' — ')
})
const contact = computed(() =>
  [COMPANY.email && `Email : ${COMPANY.email}`, COMPANY.phone && `${t('legalNoticePage.lblPhone')} : ${COMPANY.phone}`].filter(Boolean).join(' — '),
)
const hosting = computed(() =>
  COMPANY.hosting.map((h) => `${h.name} (${h.role}) — ${h.address}`).join(' · '),
)

const sections = computed(() => [
  { title: t('legalNoticePage.s1Title'), text: editor.value },
  { title: t('legalNoticePage.s2Title'), text: `${t('legalNoticePage.s2Text')} ${hosting.value}` },
  { title: t('legalNoticePage.s3Title'), text: `${t('legalNoticePage.s3Text')} ${contact.value}` },
  { title: t('legalNoticePage.s4Title'), text: t('legalNoticePage.s4Text') },
  { title: t('legalNoticePage.s5Title'), text: t('legalNoticePage.s5Text') },
  { title: t('legalNoticePage.s6Title'), text: t('legalNoticePage.s6Text') },
  { title: t('legalNoticePage.s7Title'), text: t('legalNoticePage.s7Text') },
])
</script>

<template>
  <LegalLayout
    :title="t('legalNoticePage.title')"
    :updated-at="t('legalNoticePage.updatedAt')"
    :intro="t('legalNoticePage.intro')"
    :sections="sections"
    :other="{ to: '/conditions', label: t('termsPage.title') }"
  />
</template>
