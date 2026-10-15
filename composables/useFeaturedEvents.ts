import type { EventCardData, FeaturedEventRow } from '~/types/database'

export interface FeaturedEventItem {
  id: string
  badge: string | null
  event: EventCardData
}

const EVENT_COLUMNS = `id, slug, title, city, country, start_date, end_date, cover_image, status,
  category:categories(name),
  organizer:organizers(name, status),
  ticket_types(price)`

export function mapEventRow(e: any): EventCardData {
  const prices = (e.ticket_types ?? []).map((t: any) => Number(t.price)).filter((p: number) => !Number.isNaN(p))
  return {
    id: e.id,
    slug: e.slug,
    title: e.title,
    city: e.city ?? '',
    country: e.country ?? '',
    startDate: e.start_date,
    endDate: e.end_date ?? null,
    coverImage: e.cover_image || '/sample-event.jpg',
    priceFrom: prices.length > 0 ? Math.min(...prices) : 0,
    category: e.category?.name,
    verified: e.organizer?.status === 'approved',
    organizerName: e.organizer?.name,
  }
}

/** Nombre d'événements affichés dans le bandeau « À la une ». */
export const FEATURED_MAX = 3
/** Candidats récupérés : de la réserve pour que le suivant prenne la place de celui qui se termine. */
const FEATURED_CANDIDATES = 10

/**
 * Bandeau « À la une » de l'accueil, AUTOMATIQUE :
 *  - les FEATURED_MAX (3) prochains événements publiés, du plus proche au plus lointain ;
 *  - dès qu'un événement est terminé (règle de utils/eventLifecycle.ts), il sort du
 *    bandeau et le suivant prend sa place, sans rechargement de la page (vérifié chaque minute) ;
 *  - option : un événement épinglé dans /admin/a-la-une passe en premier. Rien à faire
 *    pour que le bandeau soit rempli, l'admin n'est là que pour forcer un événement.
 */
export function useFeaturedEvents() {
  const items = useState<FeaturedEventItem[]>('tikeo-featured-events', () => [])
  const loaded = useState<boolean>('tikeo-featured-events-loaded', () => false)
  const loading = ref(false)

  async function fetchFeatured() {
    if (loaded.value) return
    loading.value = true
    try {
      const supabase = useSupabase()
      const [pinnedRes, upcomingRes] = await Promise.all([
        supabase
          .from('featured_events')
          .select(`id, badge_label, position, event:events(${EVENT_COLUMNS})`)
          .eq('status', 'active')
          .order('position', { ascending: true }),
        supabase
          .from('events')
          .select(EVENT_COLUMNS)
          .eq('status', 'published')
          .or(upcomingEventsOrFilter())
          .order('start_date', { ascending: true })
          .limit(FEATURED_CANDIDATES),
      ])

      const pinned: FeaturedEventItem[] = pinnedRes.error
        ? []
        : (pinnedRes.data ?? [])
            .filter((r: any) => r.event && r.event.status === 'published')
            .map((r: any) => ({ id: r.id, badge: r.badge_label ?? null, event: mapEventRow(r.event) }))
      const auto: FeaturedEventItem[] = upcomingRes.error
        ? []
        : (upcomingRes.data ?? []).map((e: any) => ({ id: `auto-${e.id}`, badge: null, event: mapEventRow(e) }))

      // Épinglés d'abord, puis les prochains événements ; jamais deux fois le même.
      const seen = new Set<string>()
      items.value = [...pinned, ...auto].filter((i) => (seen.has(i.event.id) ? false : (seen.add(i.event.id), true)))
      loaded.value = !(pinnedRes.error && upcomingRes.error)
    } catch {
      items.value = []
    } finally {
      loading.value = false
    }
  }

  // `now` avance toutes les minutes : un événement qui se termine sort du bandeau et le suivant le remplace.
  const now = ref(Date.now())
  let timer: ReturnType<typeof setInterval> | null = null
  if (import.meta.client) {
    onMounted(() => {
      fetchFeatured()
      timer = setInterval(() => { now.value = Date.now() }, 60_000)
    })
    onBeforeUnmount(() => { if (timer) clearInterval(timer) })
  }

  const visible = computed(() =>
    items.value.filter((i) => !isEventPast(i.event.startDate, i.event.endDate, now.value)).slice(0, FEATURED_MAX),
  )
  return { items: visible, loading, loaded, fetchFeatured }
}

/** Admin : les lignes `featured_events` avec leur événement, plus la recherche d'événements à ajouter. */
export function useAdminFeaturedEvents() {
  type Row = FeaturedEventRow & { event: any | null }
  const api = useAdminCrud<Row>('featured_events', {
    select: `id, event_id, badge_label, position, status, created_at, updated_at, event:events(${EVENT_COLUMNS})`,
    onChange: () => {
      useState<boolean>('tikeo-featured-events-loaded').value = false
    },
  })

  /** Événements publiés à venir, pas déjà à la une, dont le titre contient `query`. */
  async function searchEvents(query: string): Promise<EventCardData[]> {
    const supabase = useSupabase()
    let req = supabase
      .from('events')
      .select(EVENT_COLUMNS)
      .eq('status', 'published')
      .or(upcomingEventsOrFilter())
      .order('start_date', { ascending: true })
      .limit(40)
    const q = query.trim().replace(/[%_,()]/g, ' ')
    if (q) req = req.ilike('title', `%${q}%`)
    const { data, error } = await req
    if (error) throw error
    const taken = new Set(api.items.value.map((r) => r.event_id))
    return (data ?? []).filter((e: any) => !taken.has(e.id)).map(mapEventRow)
  }

  return { ...api, searchEvents }
}
