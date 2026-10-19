<script setup lang="ts">
const { t } = useI18n()
const { register, verifyOtp } = useAuth()
const router = useRouter()
const route = useRoute()

const redirectTarget = computed(() => {
  const target = route.query.redirect
  if (typeof target === 'string' && target.startsWith('/')) return target
  return '/mon-espace/tableau-de-bord'
})

const step = ref<'form' | 'otp'>('form')

const fullName = ref('')
const email = ref('')
const phone = ref('')
const password = ref('')
const code = ref('')

// Acceptation des CGU + politique de confidentialité (obligatoire).
const acceptTerms = ref(false)

// Honeypot : champ invisible que seuls les robots remplissent. S'il est
// rempli, on fait semblant de réussir sans rien envoyer (comme /api/contact).
const website = ref('')

// Anti-robots Turnstile (inactif tant que NUXT_PUBLIC_TURNSTILE_SITE_KEY est vide).
const { token: captchaToken, widget, ready: captchaReady, onVerify, onExpire, reset: resetCaptcha } = useCaptcha()

const loading = ref(false)
const errorMessage = ref('')
const infoMessage = ref('')

async function submitRegister() {
  errorMessage.value = ''
  if (!acceptTerms.value) {
    errorMessage.value = t('auth.mustAcceptTerms')
    return
  }
  if (website.value) {
    step.value = 'otp'
    infoMessage.value = t('auth.registerOtpInfo')
    return
  }
  if (!captchaReady.value) {
    errorMessage.value = t('auth.captchaRequired')
    return
  }

  loading.value = true
  try {
    await register({
      fullName: fullName.value,
      email: email.value,
      phone: phone.value || undefined,
      password: password.value || undefined,
      captchaToken: captchaToken.value,
    })
    step.value = 'otp'
    infoMessage.value = t('auth.registerOtpInfo')
  } catch (e: any) {
    errorMessage.value = e?.message || e?.data?.statusMessage || t('auth.registerError')
  } finally {
    loading.value = false
    resetCaptcha() // le jeton est à usage unique
  }
}

async function submitVerify() {
  errorMessage.value = ''
  loading.value = true
  try {
    await verifyOtp(email.value, code.value, 'signup')
    router.push(redirectTarget.value)
  } catch (e: any) {
    errorMessage.value = e?.message || e?.data?.statusMessage || t('auth.otpVerifyError')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthSplitLayout wide :title="t('auth.registerTitle')" :subtitle="t('auth.registerSubtitle')">
    <p v-if="errorMessage" role="alert" class="auth-alert-error mb-4">{{ errorMessage }}</p>
    <p v-if="infoMessage" role="status" class="auth-alert-info mb-4">{{ infoMessage }}</p>

    <form v-if="step === 'form'" class="grid gap-x-4 gap-y-4 sm:grid-cols-2" @submit.prevent="submitRegister">
      <AuthField
        v-model="fullName"
        icon="user"
        :label="t('auth.fullNamePlaceholder')"
        type="text"
        name="name"
        autocomplete="name"
        required
        maxlength="120"
      />
      <AuthField
        v-model="phone"
        icon="phone"
        :label="t('auth.phonePlaceholder')"
        type="tel"
        name="tel"
        autocomplete="tel"
        maxlength="30"
      />
      <AuthField
        v-model="email"
        icon="mail"
        wrapper-class="sm:col-span-2"
        :label="t('auth.emailPlaceholder')"
        type="email"
        name="email"
        autocomplete="email"
        required
        maxlength="254"
      />
      <AuthField
        v-model="password"
        icon="lock"
        wrapper-class="sm:col-span-2"
        :label="t('auth.passwordOptionalPlaceholder')"
        type="password"
        name="new-password"
        autocomplete="new-password"
        minlength="8"
        maxlength="72"
      />

      <!-- Honeypot anti-spam : invisible pour un humain, tentant pour un robot -->
      <div class="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <input v-model="website" type="text" name="website" tabindex="-1" autocomplete="off" />
      </div>

      <label class="flex items-start gap-3 rounded-xl border border-tikeo-border bg-tikeo-surface-alt/50 p-3.5 text-xs leading-relaxed text-tikeo-gray-text sm:col-span-2">
        <input
          v-model="acceptTerms"
          type="checkbox"
          required
          class="mt-0.5 h-4 w-4 shrink-0 rounded accent-[rgb(var(--tikeo-orange-strong))]"
        />
        <span>
          {{ t('auth.termsConsentPrefix') }}
          <NuxtLink to="/conditions" target="_blank" class="font-semibold text-tikeo-black underline decoration-[#FF7A00] decoration-2 underline-offset-[3px]">{{ t('auth.termsConsentTerms') }}</NuxtLink>
          {{ t('auth.termsConsentAnd') }}
          <NuxtLink to="/confidentialite" target="_blank" class="font-semibold text-tikeo-black underline decoration-[#FF7A00] decoration-2 underline-offset-[3px]">{{ t('auth.termsConsentPrivacy') }}</NuxtLink>
        </span>
      </label>

      <TurnstileWidget ref="widget" class="sm:col-span-2" @verify="onVerify" @expire="onExpire" />

      <button type="submit" class="auth-cta w-full sm:col-span-2" :disabled="loading">
        {{ loading ? t('auth.creatingAccount') : t('auth.createAccount') }}
        <AppIcon v-if="!loading" name="arrow-right" class="h-4 w-4" :stroke="2.4" />
      </button>
    </form>

    <!-- Google / Apple (iCloud) : les CGU doivent être cochées avant de partir -->
    <OAuthButtons
      v-if="step === 'form'"
      mode="signup"
      :terms-accepted="acceptTerms"
      :redirect="typeof route.query.redirect === 'string' ? route.query.redirect : undefined"
      @error="errorMessage = $event"
    />

    <form v-if="step === 'otp'" class="flex flex-col gap-4" @submit.prevent="submitVerify">
      <div class="flex items-center gap-3 rounded-xl bg-tikeo-surface-alt px-4 py-3">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FF7A00]/15 text-[rgb(var(--tikeo-orange-strong))]">
          <AppIcon name="mail" class="h-[18px] w-[18px]" />
        </span>
        <p class="min-w-0 truncate text-sm font-medium text-tikeo-black">{{ email }}</p>
      </div>
      <AuthField
        v-model="code"
        :label="t('auth.codePlaceholder')"
        type="text"
        inputmode="numeric"
        maxlength="10"
        required
        class="text-center font-mono text-xl tracking-[0.5em]"
      />
      <button type="submit" class="auth-cta mt-1 w-full" :disabled="loading">
        {{ loading ? t('auth.confirmingAccount') : t('auth.confirmAccount') }}
      </button>
    </form>

    <p class="mt-7 text-center text-sm text-tikeo-gray-text">
      {{ t('auth.haveAccount') }}
      <NuxtLink :to="{ path: '/connexion', query: route.query }" class="auth-link ml-1 font-bold">{{ t('auth.login') }}</NuxtLink>
    </p>
  </AuthSplitLayout>
</template>
