import type { EventCardData } from '~/types/database'

/**
 * Liste des événements publiés, 100% dynamique (Supabase).
 * Aucune donnée de démonstration : si aucun événement n'a été publié depuis
 * un compte organisateur (ou l'admin), la liste reste vide et la page
 * d'accueil affiche un état vide plutôt que du contenu inventé.
 *
 * Le client Supabase ne vit que côté navigateur (plugins/supabase.client.ts),
 * donc cette fonction ne tente le chargement qu'en client (onMounted) —
 * en SSR, `events` reste vide le temps de l'hydratation.
 */
export function useEventsList(limit = 40) {
  // Liste brute telle que renvoyée par Supabase ; `events` en est la vue
  // filtrée : un événement terminé disparaît tout seul, même si la page reste
  // ouverte (l'horloge `now` avance toutes les minutes).
  const allEvents = ref<EventCardData[]>([])
  const now = ref(Date.now())
  const events = computed(() => allEvents.value.filter((e) => !isEventPast(e.startDate, e.endDate, now.value)))
  const loading = ref(true)
  const error = ref<string | null>(null)

  async function fetchEvents() {
    loading.value = true
    error.value = null
    try {
      const supabase = useSupabase()
      const { data, error: sbError } = await supabase
        .from('events')
        .select(EVENT_CARD_SELECT)
        .eq('status', 'published')
        // Uniquement les événements à venir / en cours (voir utils/eventLifecycle.ts)
        .or(upcomingEventsOrFilter())
        .order('start_date', { ascending: true })
        .limit(limit)

      if (sbError) throw sbError

      now.value = Date.now()
      allEvents.value = await enrichCards((data ?? []).map(mapEventCard))
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur de chargement des événements'
      allEvents.value = []
    } finally {
      loading.value = false
    }
  }

  if (import.meta.client) {
    onMounted(() => {
      fetchEvents()
      const timer = setInterval(() => {
        now.value = Date.now()
      }, 60_000)
      onBeforeUnmount(() => clearInterval(timer))
    })
  }

  return { events, loading, error, refresh: fetchEvents }
}

/**
 * Événements favoris de l'utilisateur connecté : on récupère la liste des
 * `event_id` (useFavorites) puis les événements correspondants, avec le
 * même mapping vers EventCardData que useEventsList — pour réutiliser
 * directement <EventCard> sur la page mon-espace/mes-favoris.
 */
export function useFavoriteEvents() {
  const { favoriteIds, loaded } = useFavorites()
  const events = ref<EventCardData[]>([])
  // Tant que la liste des favoris n'a pas été lue depuis Supabase, on reste
  // en chargement : sinon la page affiche brièvement « aucun favori » avant
  // que les cartes n'apparaissent.
  const loading = ref(true)
  const error = ref<string | null>(null)
  // Les ids déjà représentés dans `events`, pour savoir si un changement de
  // favoris nécessite vraiment un aller-retour réseau.
  const loadedIds = ref<string[]>([])

  async function fetchFavoriteEvents() {
    if (!loaded.value) {
      loading.value = true
      return
    }
    if (favoriteIds.value.length === 0) {
      events.value = []
      loadedIds.value = []
      loading.value = false
      return
    }
    loading.value = true
    error.value = null
    try {
      const supabase = useSupabase()
      const { data, error: sbError } = await supabase
        .from('events')
        .select(EVENT_CARD_SELECT)
        .in('id', favoriteIds.value)

      if (sbError) throw sbError

      events.value = await enrichCards((data ?? []).map(mapEventCard))
      loadedIds.value = events.value.map((e) => e.id)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur de chargement des favoris'
      events.value = []
      loadedIds.value = []
    } finally {
      loading.value = false
    }
  }

  if (import.meta.client) {
    watch(
      [favoriteIds, loaded],
      () => {
        if (!loaded.value) return
        // Retirer un favori depuis cette page ne doit pas relancer une
        // requête ni faire clignoter les squelettes : il suffit d'enlever la
        // carte concernée. On ne refetch que si un favori INCONNU apparaît
        // (ajout depuis un autre onglet, retour sur la page, etc.).
        const hasNewId = favoriteIds.value.some((id) => !loadedIds.value.includes(id))
        if (!hasNewId) {
          events.value = events.value.filter((e) => favoriteIds.value.includes(e.id))
          loadedIds.value = loadedIds.value.filter((id) => favoriteIds.value.includes(id))
          loading.value = false
          return
        }
        fetchFavoriteEvents()
      },
      { immediate: true }
    )
  }

  return { events, loading, error, refresh: fetchFavoriteEvents }
}
