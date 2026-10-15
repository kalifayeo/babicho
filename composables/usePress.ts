import type { PressItem, PressKind, PressResource, PressResourceKind } from '~/types/database'

export const PRESS_KINDS: PressKind[] = ['article', 'video', 'audio', 'release']
export const PRESS_KIND_ICONS: Record<PressKind, string> = { article: 'newspaper', video: 'play', audio: 'mic', release: 'file-text' }

export const PRESS_RESOURCE_KINDS: PressResourceKind[] = ['logo', 'guidelines', 'photos', 'factsheet', 'other']
export const PRESS_RESOURCE_ICONS: Record<PressResourceKind, string> = { logo: 'sparkles', guidelines: 'clipboard', photos: 'image', factsheet: 'file-text', other: 'download' }

/** « 12 octobre 2026 » (la date SQL « 2026-10-12 » est lue en heure locale, sans décalage de fuseau). */
export function formatPressDate(date: string, locale: string) {
  const [y, m, d] = date.split('-').map(Number)
  if (!y || !m || !d) return date
  return new Date(y, m - 1, d).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Lecture publique : retombées et kit média actifs (page /presse + bandeau d'accueil). */
export function usePress() {
  const items = useState<PressItem[]>('tikeo-press-items', () => [])
  const resources = useState<PressResource[]>('tikeo-press-resources', () => [])
  const loaded = useState<boolean>('tikeo-press-loaded', () => false)
  const loading = ref(false)

  async function fetchPress() {
    if (loaded.value) return
    loading.value = true
    try {
      const supabase = useSupabase()
      const [itemsRes, resRes] = await Promise.all([
        supabase.from('press_items').select('*').eq('status', 'active').order('published_on', { ascending: false }),
        supabase.from('press_resources').select('*').eq('status', 'active').order('position', { ascending: true }),
      ])
      if (itemsRes.error) throw itemsRes.error
      if (resRes.error) throw resRes.error
      items.value = (itemsRes.data as unknown as PressItem[]) ?? []
      resources.value = (resRes.data as unknown as PressResource[]) ?? []
      loaded.value = true
    } catch {
      items.value = []
      resources.value = []
    } finally {
      loading.value = false
    }
  }

  if (import.meta.client) onMounted(fetchPress)
  return { items, resources, loading, loaded, fetchPress }
}

function invalidate() {
  useState<boolean>('tikeo-press-loaded').value = false
}
export function useAdminPressItems() {
  return useAdminCrud<PressItem>('press_items', { onChange: invalidate })
}
export function useAdminPressResources() {
  return useAdminCrud<PressResource>('press_resources', { onChange: invalidate })
}
