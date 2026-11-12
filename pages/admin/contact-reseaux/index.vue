<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin', adminPermission: 'site.manage' })

import { SOCIAL_NETWORKS } from '~/utils/socialLinks'
import { safeHttpsUrl } from '~/composables/useSiteSettings'

const { t } = useI18n()
const { form, loading, saving, error, dirty, load, save } = useAdminSiteSettings()

const savedMsg = ref('')
const errorMsg = ref('')
onMounted(load)

const CONTACT_FIELDS = [
  { key: 'contact_email', label: 'adminSite.email', icon: 'mail', type: 'email', placeholder: 'contact@babicho.com', max: 120 },
  { key: 'contact_phone', label: 'adminSite.phone', icon: 'phone', type: 'tel', placeholder: '+225 07 00 00 00 00', max: 40 },
  { key: 'contact_address', label: 'adminSite.address', icon: 'pin', type: 'text', placeholder: "Abidjan, Côte d'Ivoire", max: 200 },
  { key: 'contact_hours', label: 'adminSite.hours', icon: 'clock', type: 'text', placeholder: 'Du lundi au vendredi, 9h – 18h', max: 120 },
] as const

const LINK_FIELDS = [
  ...SOCIAL_NETWORKS.map((n) => ({ key: n.field as string, name: n.name, path: n.path as string | null, placeholder: `https://${n.name.toLowerCase()}.com/babicho` })),
  { key: 'whatsapp_channel_url', name: 'WhatsApp', path: null as string | null, placeholder: 'https://whatsapp.com/channel/…' },
]

const f = form as unknown as Record<string, string>

// Logo & en-tête : l'aperçu reprend exactement les réglages saisis (avant enregistrement).
const sizeOptions = [
  { value: '', label: 'adminSite.sizeMd', cls: 'h-10' },
  { value: 'sm', label: 'adminSite.sizeSm', cls: 'h-8' },
  { value: 'lg', label: 'adminSite.sizeLg', cls: 'h-12' },
] as const
const previewSizeCls = computed(() => (f.logo_size === 'sm' ? 'h-8' : f.logo_size === 'lg' ? 'h-12' : 'h-10'))
const previewLight = computed(() => safeHttpsUrl(f.logo_url) || '/logo-babicho.png')
const previewDark = computed(() => safeHttpsUrl(f.logo_dark_url) || previewLight.value)
const previewName = computed(() => (f.site_name ?? '').trim() || 'Babicho')
const previewTagline = computed(() => (f.header_tagline ?? '').trim())
const previewStrip = computed(() => f.header_strip !== 'hide')

function urlInvalid(key: string) {
  const v = (f[key] ?? '').trim()
  if (!v) return false
  if (key === 'whatsapp_channel_url') return !/^https:\/\/(www\.)?(whatsapp\.com|wa\.me|chat\.whatsapp\.com)\//i.test(v)
  return !safeHttpsUrl(v)
}
const emailInvalid = computed(() => {
  const v = (f.contact_email ?? '').trim()
  return !!v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
})
const hasErrors = computed(() => emailInvalid.value || LINK_FIELDS.some((l) => urlInvalid(l.key)))

const preview = computed(() => LINK_FIELDS.filter((l) => safeHttpsUrl(f[l.key]) && !urlInvalid(l.key)))

async function onSave() {
  errorMsg.value = ''
  savedMsg.value = ''
  if (hasErrors.value) {
    errorMsg.value = t('adminSite.fixErrors')
    return
  }
  try {
    await save()
    savedMsg.value = t('adminSite.saved')
    setTimeout(() => (savedMsg.value = ''), 3000)
  } catch (e: any) {
    errorMsg.value = e?.message || t('adminSite.errorSave')
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-6 md:px-6">
    <h1 class="text-xl font-bold text-tikeo-black md:text-2xl">{{ t('adminSite.title') }}</h1>
    <p class="mt-1 max-w-2xl text-sm text-tikeo-gray-text">{{ t('adminSite.subtitle') }}</p>

    <div v-if="loading" class="flex justify-center py-16"><TikeoSpinner :size="32" /></div>

    <form v-else class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start" @submit.prevent="onSave">
      <div class="space-y-6">
        <p v-if="error" class="acc-alert-error" role="alert">{{ t('adminSite.errorLoad') }}</p>

        <!-- Logo & en-tête -->
        <section class="space-y-5 border border-tikeo-border bg-tikeo-surface p-5">
          <div>
            <h2 class="text-sm font-bold text-tikeo-black">{{ t('adminSite.brandingTitle') }}</h2>
            <p class="mt-1 text-xs text-tikeo-gray-text">{{ t('adminSite.brandingHint') }}</p>
          </div>

          <div class="grid gap-5 sm:grid-cols-2">
            <MediaInput v-model="f.logo_url" folder="site-branding" compact hide-url :label="t('adminSite.logoLight')" :help="t('adminSite.logoLightHelp')" />
            <MediaInput v-model="f.logo_dark_url" folder="site-branding" compact hide-url :label="t('adminSite.logoDark')" :help="t('adminSite.logoDarkHelp')" />
          </div>
          <p class="text-xs text-tikeo-gray-text">{{ t('adminSite.logoFormats') }}</p>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label for="s-site_name" class="text-sm font-semibold text-tikeo-black">{{ t('adminSite.siteName') }}</label>
              <input id="s-site_name" v-model="f.site_name" type="text" class="input-field mt-1.5" maxlength="60" placeholder="Babicho" />
              <p class="mt-1 text-xs text-tikeo-gray-text">{{ t('adminSite.siteNameHint') }}</p>
            </div>
            <div>
              <label for="s-header_tagline" class="text-sm font-semibold text-tikeo-black">{{ t('adminSite.tagline') }}</label>
              <input id="s-header_tagline" v-model="f.header_tagline" type="text" class="input-field mt-1.5" maxlength="80" :placeholder="t('adminSite.taglinePlaceholder')" />
              <p class="mt-1 text-xs text-tikeo-gray-text">{{ t('adminSite.taglineHint') }}</p>
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <fieldset>
              <legend class="text-sm font-semibold text-tikeo-black">{{ t('adminSite.logoSize') }}</legend>
              <div class="mt-1.5 grid grid-cols-3 border border-tikeo-border" role="radiogroup">
                <button
                  v-for="o in sizeOptions"
                  :key="o.value"
                  type="button"
                  role="radio"
                  :aria-checked="(f.logo_size ?? '') === o.value"
                  class="h-10 border-r border-tikeo-border text-sm font-semibold transition-colors last:border-r-0"
                  :class="(f.logo_size ?? '') === o.value ? 'bg-tikeo-ink text-white dark:bg-[#FF7A00] dark:text-tikeo-ink' : 'text-tikeo-gray-text hover:bg-tikeo-surface-alt'"
                  @click="f.logo_size = o.value"
                >{{ t(o.label) }}</button>
              </div>
            </fieldset>
            <fieldset>
              <legend class="text-sm font-semibold text-tikeo-black">{{ t('adminSite.strip') }}</legend>
              <div class="mt-1.5 grid grid-cols-2 border border-tikeo-border" role="radiogroup">
                <button
                  v-for="o in [{ value: '', label: 'adminSite.stripShow' }, { value: 'hide', label: 'adminSite.stripHide' }]"
                  :key="o.value"
                  type="button"
                  role="radio"
                  :aria-checked="(f.header_strip ?? '') === o.value"
                  class="h-10 border-r border-tikeo-border text-sm font-semibold transition-colors last:border-r-0"
                  :class="(f.header_strip ?? '') === o.value ? 'bg-tikeo-ink text-white dark:bg-[#FF7A00] dark:text-tikeo-ink' : 'text-tikeo-gray-text hover:bg-tikeo-surface-alt'"
                  @click="f.header_strip = o.value"
                >{{ t(o.label) }}</button>
              </div>
              <p class="mt-1 text-xs text-tikeo-gray-text">{{ t('adminSite.stripHint') }}</p>
            </fieldset>
          </div>
        </section>

        <!-- Coordonnées -->
        <section class="space-y-4 border border-tikeo-border bg-tikeo-surface p-5">
          <div>
            <h2 class="text-sm font-bold text-tikeo-black">{{ t('adminSite.contactTitle') }}</h2>
            <p class="mt-1 text-xs text-tikeo-gray-text">{{ t('adminSite.contactHint') }}</p>
          </div>
          <div v-for="c in CONTACT_FIELDS" :key="c.key">
            <label :for="`s-${c.key}`" class="flex items-center gap-2 text-sm font-semibold text-tikeo-black">
              <AppIcon :name="c.icon" class="h-4 w-4 text-tikeo-orange" />{{ t(c.label) }}
            </label>
            <input :id="`s-${c.key}`" v-model="f[c.key]" :type="c.type" class="input-field mt-1.5" :maxlength="c.max" :placeholder="c.placeholder" />
            <p v-if="c.key === 'contact_email' && emailInvalid" class="mt-1 text-xs text-tikeo-error">{{ t('adminSite.invalidEmail') }}</p>
            <p v-if="c.key === 'contact_hours'" class="mt-1 text-xs text-tikeo-gray-text">{{ t('adminSite.hoursHint') }}</p>
          </div>
        </section>

        <!-- Réseaux sociaux -->
        <section class="space-y-4 border border-tikeo-border bg-tikeo-surface p-5">
          <div>
            <h2 class="text-sm font-bold text-tikeo-black">{{ t('adminSite.socialTitle') }}</h2>
            <p class="mt-1 text-xs text-tikeo-gray-text">{{ t('adminSite.socialHint') }}</p>
          </div>
          <div v-for="l in LINK_FIELDS" :key="l.key">
            <label :for="`s-${l.key}`" class="flex items-center gap-2 text-sm font-semibold text-tikeo-black">
              <svg v-if="l.path" class="h-4 w-4 text-tikeo-orange" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path :d="l.path" /></svg>
              <AppIcon v-else name="phone" class="h-4 w-4 text-tikeo-orange" />
              {{ l.name }}
            </label>
            <input
              :id="`s-${l.key}`"
              v-model="f[l.key]"
              type="url"
              inputmode="url"
              class="input-field mt-1.5"
              :class="urlInvalid(l.key) ? '!border-tikeo-error' : ''"
              maxlength="300"
              :placeholder="l.placeholder"
            />
            <p v-if="urlInvalid(l.key)" class="mt-1 text-xs text-tikeo-error">{{ l.key === 'whatsapp_channel_url' ? t('adminSite.invalidWhatsapp') : t('adminSite.invalidUrl') }}</p>
          </div>
        </section>

        <p v-if="errorMsg" class="acc-alert-error" role="alert">{{ errorMsg }}</p>
        <p v-if="savedMsg" class="acc-alert-success" role="status">{{ savedMsg }}</p>

        <button type="submit" class="btn-ink disabled:opacity-60" :disabled="saving || !dirty">
          <TikeoSpinner v-if="saving" :size="16" class="!text-current" /><AppIcon v-else name="save" class="h-[18px] w-[18px]" />
          {{ saving ? t('adminSite.saving') : t('adminSite.save') }}
        </button>
      </div>

      <!-- Aperçu des réseaux affichés -->
      <aside class="space-y-4 lg:sticky lg:top-6">
        <!-- Aperçu de l'en-tête (clair + sombre) -->
        <div class="border border-tikeo-border bg-tikeo-surface p-5">
          <p class="text-xs font-bold uppercase tracking-wide text-tikeo-gray-text">{{ t('adminSite.previewHeader') }}</p>
          <div class="mt-3 overflow-hidden border border-[#EDEFF3] bg-white">
            <div v-if="previewStrip" class="h-[3px] bg-tikeo-brand" />
            <div class="flex h-16 items-center px-3">
              <img :src="previewLight" :alt="previewName" class="w-auto object-contain" :class="previewSizeCls" />
              <span v-if="previewTagline" class="ml-3 border-l border-[#EDEFF3] pl-3 text-xs font-semibold leading-tight text-[#4B5563]">{{ previewTagline }}</span>
            </div>
          </div>
          <p class="mb-0 mt-3 text-xs font-semibold text-tikeo-gray-text">{{ t('adminSite.previewDark') }}</p>
          <div class="mt-1.5 overflow-hidden border border-[#2E313A] bg-[#1A1C22]">
            <div v-if="previewStrip" class="h-[3px] bg-tikeo-brand" />
            <div class="flex h-16 items-center px-3">
              <img :src="previewDark" :alt="previewName" class="w-auto object-contain" :class="previewSizeCls" />
              <span v-if="previewTagline" class="ml-3 border-l border-[#2E313A] pl-3 text-xs font-semibold leading-tight text-[#9CA3AF]">{{ previewTagline }}</span>
            </div>
          </div>
        </div>

        <div class="border border-tikeo-border bg-tikeo-surface p-5">
          <p class="text-xs font-bold uppercase tracking-wide text-tikeo-gray-text">{{ t('adminSite.previewTitle') }}</p>
          <div v-if="preview.length" class="mt-3 flex flex-wrap gap-2">
            <span v-for="l in preview" :key="l.key" class="flex h-11 w-11 items-center justify-center border border-tikeo-border text-tikeo-black" :title="l.name">
              <svg v-if="l.path" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path :d="l.path" /></svg>
              <AppIcon v-else name="phone" class="h-5 w-5" />
            </span>
          </div>
          <p v-else class="mt-3 text-sm text-tikeo-gray-text">{{ t('adminSite.previewEmpty') }}</p>
          <p class="mt-4 text-xs leading-relaxed text-tikeo-gray-text">{{ t('adminSite.previewWhere') }}</p>
        </div>
      </aside>
    </form>
  </div>
</template>
