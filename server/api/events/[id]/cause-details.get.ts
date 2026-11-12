import { requireUser } from '~/server/utils/userAuth'
import { requireAdmin } from '~/server/utils/adminAuth'
import { checkRateLimit } from '~/server/utils/rateLimit'

/**
 * GET /api/events/:id/cause-details?limit=50
 *
 * Détail COMPLET des contributions d'une cause solidaire, réservé à
 * l'organisateur propriétaire de l'événement et aux administrateurs :
 * objectif, total collecté, reste à collecter, progression, et la liste des
 * transactions payées (nom du contributeur, montant, date/heure, message).
 *
 * Contrairement à la liste publique (server/api/causes/[slug]/contributions.get.ts),
 * le nom complet est visible ici, car l'organisateur doit pouvoir rapprocher les
 * paiements (cotisations, tontines). Aucun téléphone ni email n'est renvoyé.
 * Ces données sont visibles quels que soient les réglages d'affichage public.
 *
 * Un événement qui n'est pas une cause répond { isCause: false }.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_LIMIT = 200
const DEFAULT_LIMIT = 50

export default defineEventHandler(async (event) => {
  try {
    await checkRateLimit(event, { key: 'cause-details', max: 60, windowMs: 60 * 1000 })
  } catch {
    throw createError({ statusCode: 429, statusMessage: 'RATE_LIMITED' })
  }

  const eventId = getRouterParam(event, 'id') ?? ''
  if (!UUID_RE.test(eventId)) throw createError({ statusCode: 404, statusMessage: 'Événement introuvable.' })

  const rawLimit = Number.parseInt(String(getQuery(event).limit ?? ''), 10)
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), MAX_LIMIT) : DEFAULT_LIMIT

  const { userId } = await requireUser(event)
  const supabaseAdmin = useSupabaseAdmin()

  const { data: me } = await supabaseAdmin.from('profiles').select('role').eq('user_id', userId).maybeSingle()
  const isAdmin = me?.role === 'admin'
  // Un admin doit aussi avoir passé la 2FA (même règle que les autres routes admin).
  if (isAdmin) await requireAdmin(event)

  const { data: ev, error: evError } = await supabaseAdmin
    .from('events')
    .select('id, organizer_id, goal_amount, show_goal_public, show_contributions_public, category:categories(kind)')
    .eq('id', eventId)
    .maybeSingle()
  if (evError) {
    console.error('[api/events/:id/cause-details] événement :', evError.message)
    throw createError({ statusCode: 500, statusMessage: 'Impossible de charger les contributions.' })
  }
  if (!ev) throw createError({ statusCode: 404, statusMessage: 'Événement introuvable.' })

  if (!isAdmin) {
    const { data: org } = await supabaseAdmin.from('organizers').select('id').eq('id', ev.organizer_id).eq('user_id', userId).maybeSingle()
    // 404 (et non 403) : on ne révèle pas l'existence d'un événement d'un autre organisateur.
    if (!org) throw createError({ statusCode: 404, statusMessage: 'Événement introuvable.' })
  }

  const cat = Array.isArray(ev.category) ? ev.category[0] : ev.category
  if (cat?.kind !== 'cause') return { isCause: false }

  const { data: orders, error: ordersError } = await supabaseAdmin
    .from('orders')
    .select('user_id, order_number, total, updated_at, contribution_note')
    .eq('event_id', ev.id)
    .eq('status', 'paid')
    .gt('total', 0)
    .order('updated_at', { ascending: false })
    .limit(5000)
  if (ordersError) {
    console.error('[api/events/:id/cause-details] commandes :', ordersError.message)
    throw createError({ statusCode: 500, statusMessage: 'Impossible de charger les contributions.' })
  }

  const all = orders ?? []
  const totalAmount = all.reduce((s, o) => s + Number(o.total || 0), 0)
  const goal = ev.goal_amount != null ? Number(ev.goal_amount) : null
  const page = all.slice(0, limit)

  const names = new Map<string, string | null>()
  const userIds = [...new Set(page.map((o) => o.user_id))]
  if (userIds.length) {
    const { data: profiles } = await supabaseAdmin.from('profiles').select('user_id, full_name').in('user_id', userIds)
    for (const p of profiles ?? []) names.set(p.user_id, p.full_name)
  }

  setHeader(event, 'Cache-Control', 'private, no-store')
  return {
    isCause: true,
    goalAmount: goal,
    showGoalPublic: ev.show_goal_public !== false,
    showContributionsPublic: ev.show_contributions_public !== false,
    totalAmount,
    count: all.length,
    averageAmount: all.length ? Math.round(totalAmount / all.length) : 0,
    remaining: goal != null ? Math.max(goal - totalAmount, 0) : null,
    percent: goal != null && goal > 0 ? Math.min(Math.round((totalAmount / goal) * 100), 100) : null,
    hasMore: all.length > page.length,
    items: page.map((o) => ({
      name: names.get(o.user_id) || null,
      orderNumber: o.order_number,
      amount: Number(o.total),
      paidAt: o.updated_at,
      note: o.contribution_note || null,
    })),
  }
})
