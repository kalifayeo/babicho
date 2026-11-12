/**
 * Organisateurs suivis par l'utilisateur connecté (bouton « S'abonner » des cartes).
 * État partagé via useState : un clic met à jour toutes les cartes du même organisateur.
 * Si la table `organizer_follows` n'existe pas encore (migration 0059), l'action est annulée sans erreur visible.
 */
let fetchPromise: Promise<void> | null = null

export function useFollows() {
  const { user, isAuthenticated } = useAuth()
  const followedIds = useState<string[]>('babicho-followed-organizers', () => [])
  const loaded = useState('babicho-followed-loaded', () => false)

  async function fetchFollows(force = false) {
    if (!user.value) return
    if (fetchPromise) return fetchPromise
    if (!force && loaded.value) return
    fetchPromise = (async () => {
      const { data, error } = await useSupabase().from('organizer_follows').select('organizer_id').eq('user_id', user.value!.id)
      if (!error) followedIds.value = ((data ?? []) as any[]).map((r) => r.organizer_id as string)
      loaded.value = true
      fetchPromise = null
    })()
    return fetchPromise
  }

  function isFollowing(organizerId?: string) {
    return !!organizerId && followedIds.value.includes(organizerId)
  }

  /** false = non connecté (l'appelant redirige vers /connexion). */
  async function toggleFollow(organizerId: string): Promise<boolean> {
    if (!isAuthenticated.value || !user.value) return false
    const supabase = useSupabase()
    const was = isFollowing(organizerId)
    const previous = [...followedIds.value]
    followedIds.value = was ? previous.filter((id) => id !== organizerId) : [...previous, organizerId]

    const { error } = was
      ? await supabase.from('organizer_follows').delete().eq('user_id', user.value.id).eq('organizer_id', organizerId)
      : await supabase.from('organizer_follows').insert({ user_id: user.value.id, organizer_id: organizerId })
    if (error) followedIds.value = previous
    return true
  }

  if (import.meta.client) {
    watch(
      user,
      (u) => {
        if (u) {
          if (!loaded.value) fetchFollows()
        } else {
          followedIds.value = []
          loaded.value = false
          fetchPromise = null
        }
      },
      { immediate: true },
    )
  }

  return { followedIds, isFollowing, toggleFollow, fetchFollows }
}
