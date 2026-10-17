<script setup lang="ts">
/**
 * Boutons « Continuer avec Google / Apple » des pages inscription et connexion.
 * « Apple » couvre les comptes iCloud : l'identifiant Apple (Apple ID) EST le
 * compte iCloud, il n'existe pas de bouton « iCloud » distinct.
 *
 * - mode « signup » : l'acceptation des CGU (case de la page) est exigée avant
 *   de quitter le site ; sinon on remonte l'erreur à la page (@error).
 * - mode « login » : une mention légale est affichée sous les boutons, car un
 *   nouveau compte peut aussi être créé depuis cet écran.
 */
const props = defineProps<{ mode: 'signup' | 'login'; termsAccepted?: boolean; redirect?: string }>()
const emit = defineEmits<{ error: [message: string] }>()

const { t } = useI18n()
const { loginWithOAuth } = useAuth()

const pending = ref<'google' | 'apple' | null>(null)

// Apple n'est pas encore configuré (compte Apple Developer, voir GOOGLE-APPLE-LOGIN.md) :
// le bouton reste visible mais grisé. Passer à true une fois Apple activé dans Supabase.
const APPLE_ENABLED = false

async function start(provider: 'google' | 'apple') {
  if (pending.value) return
  if (provider === 'apple' && !APPLE_ENABLED) return
  if (props.mode === 'signup' && !props.termsAccepted) {
    emit('error', t('auth.mustAcceptTerms'))
    return
  }
  pending.value = provider
  try {
    // En cas de succès le navigateur quitte la page : le spinner reste affiché.
    await loginWithOAuth(provider, { redirect: props.redirect, acceptedTerms: true })
  } catch {
    pending.value = null
    emit('error', t('auth.oauthError'))
  }
}

// Retour arrière depuis la page Google/Apple (cache de navigation) : on réarme les boutons.
function onPageShow(e: PageTransitionEvent) {
  if (e.persisted) pending.value = null
}
onMounted(() => window.addEventListener('pageshow', onPageShow))
onBeforeUnmount(() => window.removeEventListener('pageshow', onPageShow))
</script>

<template>
  <div class="mt-5">
    <div class="flex items-center gap-3" role="separator">
      <span class="h-px flex-1 bg-tikeo-border" aria-hidden="true" />
      <span class="text-[11px] font-bold uppercase tracking-wider text-tikeo-gray-text">{{ t('auth.orContinueWith') }}</span>
      <span class="h-px flex-1 bg-tikeo-border" aria-hidden="true" />
    </div>

    <div class="mt-4 grid gap-3 sm:grid-cols-2">
      <button type="button" class="acc-btn-ghost !h-11 w-full !px-3" :disabled="!!pending" @click="start('google')">
        <TikeoSpinner v-if="pending === 'google'" :size="20" />
        <svg v-else class="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
        {{ pending === 'google' ? t('auth.oauthRedirecting') : t('auth.continueWithGoogle') }}
      </button>

      <button
        type="button"
        class="acc-btn-ghost !h-11 w-full !px-3"
        :class="{ 'cursor-not-allowed opacity-50': !APPLE_ENABLED }"
        :disabled="!!pending || !APPLE_ENABLED"
        :aria-disabled="!APPLE_ENABLED"
        :title="APPLE_ENABLED ? undefined : t('auth.comingSoon')"
        @click="start('apple')"
      >
        <TikeoSpinner v-if="pending === 'apple'" :size="20" />
        <svg v-else class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
        </svg>
        {{ pending === 'apple' ? t('auth.oauthRedirecting') : t('auth.continueWithApple') }}
        <span v-if="!APPLE_ENABLED" class="bg-tikeo-gray-light px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-tikeo-gray-text">{{ t('auth.comingSoon') }}</span>
      </button>
    </div>

    <p v-if="mode === 'login'" class="mt-3 text-center text-xs leading-relaxed text-tikeo-gray-text">
      {{ t('auth.oauthConsentPrefix') }}
      <NuxtLink to="/conditions" target="_blank" class="font-bold text-tikeo-black underline decoration-[#FF7A00] decoration-2 underline-offset-[3px]">{{ t('auth.termsConsentTerms') }}</NuxtLink>
      {{ t('auth.termsConsentAnd') }}
      <NuxtLink to="/confidentialite" target="_blank" class="font-bold text-tikeo-black underline decoration-[#FF7A00] decoration-2 underline-offset-[3px]">{{ t('auth.termsConsentPrivacy') }}</NuxtLink>.
    </p>
  </div>
</template>
