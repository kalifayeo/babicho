<script setup lang="ts">
/**
 * Retour de Google / Apple après l'authentification (voir useAuth.loginWithOAuth).
 * Supabase renvoie ici avec la session (dans l'URL) ; on attend qu'elle soit
 * installée, on charge le profil, puis on redirige comme la page de connexion :
 * ?redirect=… si présent, /admin pour un administrateur, sinon l'espace membre.
 * Page rendue côté navigateur uniquement (routeRules '/auth/**' dans nuxt.config.ts).
 */
import type { Session } from '@supabase/supabase-js'

definePageMeta({ layout: false })
useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const supabase = useSupabase()
const authStore = useAuthStore()

const failed = ref(false)

const redirectTarget = computed(() => {
  const target = route.query.redirect
  if (typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')) return target
  return null
})

/** Erreur renvoyée par le fournisseur (ex. l'utilisateur a refusé) : dans la query ou dans le hash. */
function providerError(): string | null {
  const q = route.query
  if (typeof q.error === 'string') return q.error
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  return hash.get('error')
}

/** Attend que le client Supabase ait lu la session dans l'URL (au plus 8 s). */
async function waitForSession(timeoutMs = 8000): Promise<Session | null> {
  const { data } = await supabase.auth.getSession()
  if (data.session) return data.session
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      listener.data.subscription.unsubscribe()
      resolve(null)
    }, timeoutMs)
    const listener = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) return
      clearTimeout(timer)
      listener.data.subscription.unsubscribe()
      resolve(session)
    })
  })
}

onMounted(async () => {
  if (providerError()) {
    failed.value = true
    return
  }

  const session = await waitForSession()
  if (!session) {
    failed.value = true
    return
  }

  let user = session.user
  // Preuve horodatée d'acceptation des CGU (case cochée à l'inscription, ou mention
  // sur l'écran de connexion), conservée une seule fois dans les métadonnées du compte.
  if (route.query.terms === '1' && !user.user_metadata?.terms_accepted_at) {
    try {
      const { data } = await supabase.auth.updateUser({ data: { terms_accepted_at: new Date().toISOString() } })
      if (data.user) user = data.user
    } catch {
      // best-effort : ne bloque jamais la connexion
    }
  }

  authStore.setUser(user)
  await authStore.fetchProfile()

  // fetchProfile() déconnecte un compte suspendu / supprimé et renseigne lockedReason :
  // la page de connexion affiche alors le bon message.
  if (!authStore.user) {
    await router.replace('/connexion')
    return
  }

  if (!redirectTarget.value && authStore.profile?.role === 'admin') {
    await router.replace('/admin')
    return
  }
  await router.replace(redirectTarget.value ?? '/mon-espace/tableau-de-bord')
})
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-4 bg-tikeo-gray-light px-6 text-center">
    <template v-if="!failed">
      <TikeoSpinner :size="36" />
      <p class="text-sm font-semibold text-tikeo-black">{{ t('auth.oauthCallbackLoading') }}</p>
    </template>
    <template v-else>
      <p class="acc-alert-error max-w-sm text-left">{{ t('auth.oauthCallbackFailed') }}</p>
      <NuxtLink to="/connexion" class="btn-ink">{{ t('auth.backToLogin') }}</NuxtLink>
    </template>
  </div>
</template>
