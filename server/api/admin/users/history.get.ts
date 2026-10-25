/**
 * GET /api/admin/users/history?kind=all|deleted|created|suspensions|roles&limit=30&offset=0
 *
 * Historique des comptes : suppressions, créations, suspensions/réactivations
 * et changements de rôle, lus dans audit_logs (entity_type = 'profiles').
 * Passe par le serveur (clé service_role) pour ne pas dépendre de la
 * permission « audit.view » : la permission « users.view » suffit, et elle est
 * vérifiée ici explicitement (la RLS est contournée par service_role).
 */
const KINDS: Record<string, string[]> = {
  deleted: ['ADMIN_USER_DELETED'],
  created: ['ADMIN_USER_CREATED'],
  suspensions: ['USER_SUSPENDED', 'USER_REACTIVATED'],
  roles: ['USER_ROLE_CHANGED'],
}
const ALL_ACTIONS = Object.values(KINDS).flat()

const isAnonymized = (email?: string | null) => !!email && email.startsWith('compte-supprime+')

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'users.view')

  const q = getQuery(event)
  const kind = typeof q.kind === 'string' && KINDS[q.kind] ? q.kind : 'all'
  const limit = Math.min(Math.max(Number(q.limit) || 30, 1), 100)
  const offset = Math.max(Number(q.offset) || 0, 0)
  const actions = kind === 'all' ? ALL_ACTIONS : KINDS[kind]

  const supabaseAdmin = useSupabaseAdmin()

  const { data, error } = await supabaseAdmin
    .from('audit_logs')
    .select('id, user_id, action, entity_id, metadata, created_at')
    .eq('entity_type', 'profiles')
    .in('action', actions)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit) // +1 ligne pour savoir s'il y a une page suivante
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const page = (data ?? []).slice(0, limit)
  const hasMore = (data ?? []).length > limit

  // Compteurs par catégorie (pastilles de filtre).
  const counts: Record<string, number> = {}
  await Promise.all(
    Object.entries(KINDS).map(async ([key, acts]) => {
      const { count } = await supabaseAdmin
        .from('audit_logs')
        .select('id', { count: 'exact', head: true })
        .eq('entity_type', 'profiles')
        .in('action', acts)
      counts[key] = count ?? 0
    })
  )

  // Noms : comptes concernés (entity_id) et administrateurs auteurs (user_id).
  const ids = [...new Set(page.flatMap((r: any) => [r.entity_id, r.user_id]).filter(Boolean))] as string[]
  const people = new Map<string, { name: string | null; email: string | null; status: string }>()
  if (ids.length) {
    const { data: profs } = await supabaseAdmin.from('profiles').select('user_id, full_name, email, status').in('user_id', ids)
    for (const p of (profs as any[]) ?? []) people.set(p.user_id, { name: p.full_name, email: p.email, status: p.status })
  }

  const rows = page.map((r: any) => {
    const meta = (r.metadata ?? {}) as Record<string, unknown>
    const target = r.entity_id ? people.get(r.entity_id) : undefined
    const live = target && target.status !== 'deleted' ? target : undefined
    const metaEmail = (meta.email ?? meta.previousEmail) as string | undefined
    const email = metaEmail && !isAnonymized(metaEmail) ? metaEmail : live?.email ?? null
    const name = ((meta.name ?? meta.previousName) as string | undefined) || live?.name || null
    const actor = r.user_id ? people.get(r.user_id) : undefined
    return {
      id: r.id,
      action: r.action as string,
      createdAt: r.created_at as string,
      accountId: r.entity_id as string | null,
      accountName: name,
      accountEmail: email,
      // true = ancien compte supprimé avant l'historique : nom et email déjà effacés
      legacy: meta.legacy === true,
      fromRole: (meta.from ?? meta.previousRole ?? null) as string | null,
      toRole: (meta.to ?? meta.role ?? null) as string | null,
      byName: actor ? actor.name || actor.email : null,
    }
  })

  return { rows, hasMore, counts }
})
