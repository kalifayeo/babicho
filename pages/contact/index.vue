<script setup lang="ts">
const { t } = useI18n()
const { csrfHeader } = useCsrf()

useSeoMeta({
  title: () => `${t('contactPage.title')} | Babicho`,
  description: () => t('contactPage.intro'),
})

// Anti-robots Turnstile (inactif tant que NUXT_PUBLIC_TURNSTILE_SITE_KEY est
// vide) — vérifié côté serveur dans server/api/contact.post.ts, contrairement
// aux écrans d'auth où Supabase s'en charge lui-même.
const { token: captchaToken, widget, ready: captchaReady, onVerify, onExpire, reset: resetCaptcha } = useCaptcha()

const form = reactive({ fullName: '', email: '', subject: '', message: '', website: '' })
// Lien « Devenir partenaire » : /contact?sujet=partenaire pré-remplit le sujet.
const route = useRoute()
if (route.query.sujet === 'partenaire') form.subject = t('partners.contactSubject')
else if (route.query.sujet === 'presse') form.subject = t('press.contactSubject')

const sending = ref(false)
const successMessage = ref(false)
const errorMessage = ref('')

// Sujets rapides : pré-remplissent le champ « Sujet » (toujours modifiable).
const topics = computed(() => [
  { icon: 'ticket', label: t('contactPage.topic1') },
  { icon: 'card', label: t('contactPage.topic2') },
  { icon: 'calendar-plus', label: t('contactPage.topic3') },
  { icon: 'help', label: t('contactPage.topic4') },
])
function pickTopic(label: string) {
  form.subject = label
}

async function handleSubmit() {
  errorMessage.value = ''
  successMessage.value = false

  if (!form.website && !captchaReady.value) {
    errorMessage.value = t('auth.captchaRequired')
    return
  }

  sending.value = true
  try {
    await $fetch('/api/contact', {
      method: 'POST',
      headers: await csrfHeader(),
      body: {
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        subject: form.subject.trim(),
        message: form.message.trim(),
        website: form.website, // honeypot : doit rester vide (champ masqué en CSS)
        captchaToken: captchaToken.value,
      },
    })
    successMessage.value = true
    form.fullName = ''
    form.email = ''
    form.subject = ''
    form.message = ''
  } catch (e: any) {
    errorMessage.value = e?.data?.statusMessage || e?.message || t('contactPage.errorMessage')
  } finally {
    sending.value = false
    resetCaptcha() // le jeton Turnstile est à usage unique
  }
}

// Coordonnées et réseaux : gérés depuis /admin/contact-reseaux (un champ vide est masqué).
const { contact, socialLinks } = useSiteSettings()
const infoItems = computed(() =>
  [
    { label: t('contactPage.infoEmailLabel'), value: contact.value.email, href: contact.value.email ? `mailto:${contact.value.email}` : '', icon: 'mail' },
    { label: t('contactPage.infoPhoneLabel'), value: contact.value.phone, href: contact.value.phone ? `tel:${contact.value.phone.replace(/\s+/g, '')}` : '', icon: 'phone' },
    { label: t('contactPage.infoAddressLabel'), value: contact.value.address, href: '', icon: 'pin' },
    { label: t('contactPage.infoHoursLabel'), value: contact.value.hours || t('contactPage.infoHours'), href: '', icon: 'clock' },
  ].filter((i) => i.value)
)
</script>

<template>
  <div>
    <PageHero :eyebrow="t('contactPage.eyebrow')" :title="t('contactPage.title')" :subtitle="t('contactPage.intro')" />

    <div class="mx-auto grid max-w-tikeo-container gap-6 px-4 py-8 md:px-6 md:py-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start lg:gap-8">
      <!-- Formulaire -->
      <section class="border border-tikeo-border bg-tikeo-surface p-5 shadow-card md:p-8">
        <h2 class="font-display text-2xl font-extrabold tracking-tight text-tikeo-black">{{ t('contactPage.formTitle') }}</h2>
        <p class="mt-1 text-sm text-tikeo-gray-text">{{ t('contactPage.formIntro') }}</p>

        <p v-if="successMessage" class="acc-alert-success mt-5" role="status">{{ t('contactPage.successMessage') }}</p>
        <p v-if="errorMessage" class="acc-alert-error mt-5" role="alert">{{ errorMessage }}</p>

        <form class="mt-6 space-y-5" @submit.prevent="handleSubmit">
          <!-- Honeypot anti-spam : invisible et non atteignable au clavier pour un
               humain, mais rempli par la plupart des robots de soumission automatique. -->
          <div class="hidden" aria-hidden="true">
            <label for="website">Site web</label>
            <input id="website" v-model="form.website" type="text" tabindex="-1" autocomplete="off" />
          </div>

          <div class="grid gap-5 sm:grid-cols-2">
            <div>
              <label for="c-name" class="acc-label mb-1.5 block">{{ t('contactPage.formName') }}</label>
              <input id="c-name" v-model="form.fullName" type="text" required autocomplete="name" class="field-input" />
            </div>
            <div>
              <label for="c-email" class="acc-label mb-1.5 block">{{ t('contactPage.formEmail') }}</label>
              <input id="c-email" v-model="form.email" type="email" required autocomplete="email" class="field-input" />
            </div>
          </div>

          <div>
            <p class="acc-label mb-2">{{ t('contactPage.topicsTitle') }}</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="tp in topics"
                :key="tp.label"
                type="button"
                class="inline-flex h-10 items-center gap-2 border px-3.5 text-sm font-semibold transition-colors duration-200"
                :class="
                  form.subject === tp.label
                    ? 'border-tikeo-ink bg-tikeo-ink text-white dark:border-[#FF7A00] dark:bg-[#FF7A00] dark:text-tikeo-ink'
                    : 'border-tikeo-border bg-tikeo-surface text-tikeo-black hover:border-tikeo-ink dark:hover:border-[#FF7A00]'
                "
                @click="pickTopic(tp.label)"
              >
                <AppIcon :name="tp.icon" class="h-4 w-4" />
                {{ tp.label }}
              </button>
            </div>
          </div>

          <div>
            <label for="c-subject" class="acc-label mb-1.5 block">{{ t('contactPage.formSubject') }}</label>
            <input id="c-subject" v-model="form.subject" type="text" required class="field-input" />
          </div>
          <div>
            <label for="c-message" class="acc-label mb-1.5 block">{{ t('contactPage.formMessage') }}</label>
            <textarea id="c-message" v-model="form.message" rows="6" required class="field-input !h-auto resize-none py-3"></textarea>
          </div>

          <TurnstileWidget ref="widget" @verify="onVerify" @expire="onExpire" />

          <button type="submit" class="btn-brand w-full" :disabled="sending">
            <TikeoSpinner v-if="sending" :size="18" class="!text-current" />
            {{ sending ? t('contactPage.formSending') : t('contactPage.formSubmit') }}
            <AppIcon v-if="!sending" name="arrow-right" class="h-4 w-4" :stroke="2.4" />
          </button>
        </form>
      </section>

      <!-- Colonne d'infos -->
      <aside class="space-y-6">
        <section class="border border-tikeo-border bg-tikeo-surface shadow-card">
          <h2 class="border-b border-tikeo-border px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-tikeo-gray-text md:px-6">
            {{ t('contactPage.infoTitle') }}
          </h2>
          <ul class="divide-y divide-tikeo-border">
            <li v-for="item in infoItems" :key="item.label">
              <component
                :is="item.href ? 'a' : 'div'"
                :href="item.href || undefined"
                class="group flex items-center gap-4 px-5 py-4 transition-colors md:px-6"
                :class="item.href ? 'hover:bg-tikeo-surface-alt' : ''"
              >
                <span
                  class="flex h-11 w-11 shrink-0 items-center justify-center bg-tikeo-ink text-white transition-colors duration-200 dark:bg-[#FF7A00] dark:text-tikeo-ink"
                  :class="item.href ? 'group-hover:bg-[#FF7A00] group-hover:text-tikeo-ink' : ''"
                >
                  <AppIcon :name="item.icon" class="h-5 w-5" />
                </span>
                <span class="min-w-0">
                  <span class="acc-label block">{{ item.label }}</span>
                  <span class="block break-words text-[15px] font-semibold text-tikeo-black">{{ item.value }}</span>
                </span>
              </component>
            </li>
          </ul>
          <p class="flex items-center gap-2 border-t border-dashed border-tikeo-border bg-tikeo-surface-alt px-5 py-3 text-xs text-tikeo-gray-text md:px-6">
            <AppIcon name="clock" class="h-4 w-4 shrink-0" />
            {{ t('contactPage.responseTime') }}
          </p>
        </section>

        <section class="relative isolate overflow-hidden bg-tikeo-ink p-6 text-white">
          <div class="absolute inset-x-0 top-0 h-1 bg-tikeo-brand" aria-hidden="true" />
          <span class="flex h-11 w-11 items-center justify-center bg-[#FF7A00] text-tikeo-ink">
            <AppIcon name="help" class="h-6 w-6" :stroke="2" />
          </span>
          <h2 class="mt-4 font-display text-xl font-extrabold">{{ t('contactPage.faqCardTitle') }}</h2>
          <p class="mt-1 text-sm text-white/75">{{ t('contactPage.faqLinkText') }}</p>
          <NuxtLink to="/faq" class="btn-brand mt-5 !h-11">
            {{ t('contactPage.faqCardButton') }}
            <AppIcon name="arrow-right" class="h-4 w-4" :stroke="2.4" />
          </NuxtLink>
        </section>

        <section v-if="socialLinks.length" class="border border-tikeo-border bg-tikeo-surface p-5 shadow-card md:p-6">
          <p class="acc-label">{{ t('contactPage.followUs') }}</p>
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <a
              v-for="s in socialLinks"
              :key="s.name"
              :href="s.href"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="s.name"
              class="flex h-11 w-11 items-center justify-center border border-tikeo-border text-tikeo-black transition-colors duration-200 hover:border-[#FF7A00] hover:bg-[#FF7A00] hover:text-tikeo-ink"
            >
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path :d="s.path" /></svg>
            </a>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>
