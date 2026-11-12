import type { SiteSettings } from '~/types/database'
import { SOCIAL_NETWORKS } from '~/utils/socialLinks'

/** Valeurs affichées tant que les réglages ne sont pas chargés (ou si la table n'est pas disponible). Identiques au seed de la migration 0052. */
export const SITE_SETTINGS_DEFAULTS: SiteSettings = {
  contact_email: 'contact@babicho.com',
  contact_phone: '+225 07 00 00 00 00',
  contact_address: "Abidjan, Côte d'Ivoire",
  contact_hours: null,
  facebook_url: 'https://facebook.com/babicho',
  instagram_url: 'https://instagram.com/babicho',
  tiktok_url: 'https://tiktok.com/@babicho',
  linkedin_url: 'https://linkedin.com/company/babicho',
  x_url: null,
  youtube_url: null,
  whatsapp_channel_url: null,
  logo_url: null,
  logo_dark_url: null,
  site_name: null,
  header_tagline: null,
  logo_size: null,
  header_strip: null,
}

/** Seules les URLs https:// sont acceptées (jamais javascript: ni http:). */
export function safeHttpsUrl(v?: string | null): string {
  const u = (v ?? '').trim()
  return /^https:\/\/[^\s]+$/i.test(u) ? u : ''
}

let inflight: Promise<void> | null = null

/** Lecture publique : coordonnées de contact et réseaux sociaux (barre du haut, pied de page, page contact, bouton WhatsApp). */
export function useSiteSettings() {
  const settings = useState<SiteSettings | null>('tikeo-site-settings', () => null)
  const loaded = useState<boolean>('tikeo-site-settings-loaded', () => false)
  const config = useRuntimeConfig()

  async function fetchSettings() {
    if (loaded.value) return
    if (!inflight) {
      inflight = (async () => {
        try {
          const supabase = useSupabase()
          const { data, error } = await supabase.from('site_settings').select('*').eq('id', true).maybeSingle()
          if (error) throw error
          if (data) settings.value = data as unknown as SiteSettings
          loaded.value = true
        } catch {
          // Table absente ou réseau coupé : on garde les valeurs par défaut.
        } finally {
          inflight = null
        }
      })()
    }
    await inflight
  }
  if (import.meta.client) onMounted(fetchSettings)

  const current = computed<SiteSettings>(() => settings.value ?? SITE_SETTINGS_DEFAULTS)

  /** Réseaux renseignés dans l'admin (un champ vide masque le réseau). */
  const socialLinks = computed(() =>
    SOCIAL_NETWORKS.map((n) => ({ name: n.name, path: n.path, href: safeHttpsUrl(current.value[n.field]) })).filter((l) => l.href)
  )

  const contact = computed(() => ({
    email: (current.value.contact_email ?? '').trim(),
    phone: (current.value.contact_phone ?? '').trim(),
    address: (current.value.contact_address ?? '').trim(),
    hours: (current.value.contact_hours ?? '').trim(),
  }))

  /** Chaîne WhatsApp : réglage admin une fois chargé ; variable d'environnement en attendant / en secours. */
  const whatsappUrl = computed(() => {
    const raw = settings.value ? settings.value.whatsapp_channel_url : String(config.public.whatsappChannelUrl || '')
    const u = safeHttpsUrl(raw)
    return /^https:\/\/(www\.)?(whatsapp\.com|wa\.me|chat\.whatsapp\.com)\//i.test(u) ? u : ''
  })

  return { settings, current, socialLinks, contact, whatsappUrl, fetchSettings }
}

/** Édition depuis /admin/contact-reseaux (permission `site.manage`). */
export function useAdminSiteSettings() {
  const form = reactive<SiteSettings>({ ...SITE_SETTINGS_DEFAULTS })
  const loading = ref(true)
  const saving = ref(false)
  const error = ref<string | null>(null)
  const saved = ref<SiteSettings | null>(null)
  const FIELDS = Object.keys(SITE_SETTINGS_DEFAULTS) as Array<keyof SiteSettings>

  function apply(row: Partial<SiteSettings> | null) {
    for (const k of FIELDS) (form as any)[k] = (row?.[k] as string | null | undefined) ?? ''
    saved.value = { ...form }
  }

  async function load() {
    loading.value = true
    error.value = null
    try {
      const supabase = useSupabase()
      const { data, error: err } = await supabase.from('site_settings').select('*').eq('id', true).maybeSingle()
      if (err) throw err
      apply((data as unknown as SiteSettings) ?? SITE_SETTINGS_DEFAULTS)
    } catch (e: any) {
      error.value = e?.message || 'LOAD_FAILED'
      apply(SITE_SETTINGS_DEFAULTS)
    } finally {
      loading.value = false
    }
  }

  async function save() {
    saving.value = true
    try {
      const supabase = useSupabase()
      const row: Record<string, unknown> = { id: true, updated_at: new Date().toISOString() }
      for (const k of FIELDS) {
        const v = String((form as any)[k] ?? '').trim()
        row[k] = v || null
      }
      const { error: err } = await supabase.from('site_settings').upsert(row as any)
      if (err) throw err
      apply(row as unknown as SiteSettings)
      // Le site public reflète tout de suite les nouveaux réglages.
      const next = Object.fromEntries(FIELDS.map((k) => [k, (row[k] as string | null) ?? null])) as unknown as SiteSettings
      useState<SiteSettings | null>('tikeo-site-settings').value = next
      useState<boolean>('tikeo-site-settings-loaded').value = true
    } finally {
      saving.value = false
    }
  }

  const dirty = computed(() => !!saved.value && FIELDS.some((k) => String((form as any)[k] ?? '').trim() !== String((saved.value as any)[k] ?? '').trim()))

  return { form, loading, saving, error, dirty, load, save }
}
