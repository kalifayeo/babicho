import { safeHttpsUrl, useSiteSettings } from '~/composables/useSiteSettings'

export const DEFAULT_LOGO = '/logo-babicho.png'

/** Hauteur du logo dans l'en-tête (mobile / ordinateur), réglable dans l'admin. */
export const LOGO_SIZES = {
  sm: 'h-9 md:h-12',
  md: 'h-11 md:h-[3.75rem]',
  lg: 'h-12 md:h-[4.25rem]',
} as const

/**
 * Identité visuelle de l'en-tête, gérée dans /admin/contact-reseaux :
 * logo (clair / sombre), nom, slogan, taille, filet de couleur.
 * Tant que les réglages ne sont pas chargés, `ready` reste faux : le logo est
 * alors masqué (fondu) plutôt que d'afficher un instant le mauvais logo.
 */
export function useSiteBranding() {
  const { current } = useSiteSettings()
  const { theme } = useTheme()
  const loaded = useState<boolean>('tikeo-site-settings-loaded', () => false)
  const timedOut = ref(false)

  if (import.meta.client) {
    onMounted(() => {
      if (!loaded.value) setTimeout(() => (timedOut.value = true), 1500)
    })
  }
  const ready = computed(() => loaded.value || timedOut.value)

  const name = computed(() => (current.value.site_name ?? '').trim() || 'Babicho')
  const tagline = computed(() => (current.value.header_tagline ?? '').trim())
  const logoLight = computed(() => safeHttpsUrl(current.value.logo_url) || DEFAULT_LOGO)
  const logoDark = computed(() => safeHttpsUrl(current.value.logo_dark_url) || logoLight.value)
  const logo = computed(() => (theme.value === 'dark' ? logoDark.value : logoLight.value))
  // Logo posable directement sur fond foncé (pied de page, menu) : le logo Babicho par défaut
  // est transparent et se lit sur marine ; un logo clair téléversé par l'admin garde sa pastille blanche.
  const onDarkOk = computed(() => !!safeHttpsUrl(current.value.logo_dark_url) || !safeHttpsUrl(current.value.logo_url))
  const sizeClass = computed(() => LOGO_SIZES[(current.value.logo_size as keyof typeof LOGO_SIZES) ?? 'md'] ?? LOGO_SIZES.md)
  const showStrip = computed(() => current.value.header_strip !== 'hide')

  return { name, tagline, logo, logoLight, logoDark, sizeClass, showStrip, ready, onDarkOk }
}
