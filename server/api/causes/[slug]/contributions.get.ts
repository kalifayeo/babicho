import { checkRateLimit } from '~/server/utils/rateLimit'

/**
 * GET /api/causes/:slug/contributions?limit=20
 *
 * Liste PUBLIQUE des contributions payées d'une cause solidaire (collecte de
 * don, cotisation...) : transparence pour les donateurs, sans jamais exposer
 * d'information personnelle.
 *
 * Pour chaque contribution, on ne renvoie QUE :
 *   - maskedName : initiale du prénom + étoiles (« K***** ») ; le nombre
 *     d'étoiles est FIXE, pour ne pas révéler la longueur réelle du nom ;
 *   - amount     : montant payé (FCFA) ;
 *   - paidAt     : date et heure du paiement (ISO 8601) ;
 *   - note       : raison / message facultatif laissé par le contributeur (140 car. max).
 * Jamais : nom complet, téléphone, email, identifiant d'utilisateur ou de commande.
 *
 * Lecture avec la clé service_role (les commandes et profils sont protégés par
 * la RLS), mais uniquement pour un événement PUBLIÉ dont la catégorie est de
 * type « cause » : un événement classique répond 404.
 */
const MAX_LIMIT = 100
const DEFAULT_LIMIT = 20
const MASK = '*****'

/** « Kouadio Jean » → « K***** ». Nom vide → null (l'interface affiche « Anonyme »). */
function maskName(fullName: string | null | undefined): string | null {
  const first = Array.from((fullName ?? '').trim())[0]
  if (!first || !/[\p{L}\p{N}]/u.test(first)) return null
  return `${first.toLocaleUpperCase('fr-FR')}${MASK}`
}

export default defineEventHandler(async (event) => {
  try {
    await checkRateLimit(event, { key: 'cause-contributions', max: 60, windowMs: 60 * 1000 })
  } catch {
    throw createError({ statusCode: 429, statusMessage: 'RATE_LIMITED' })
  }

  const slug = getRouterParam(event, 'slug') ?? ''
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(slug)) {
    throw createError({ statusCode: 404, statusMessage: 'Cause introuvable.' })
  }

  const rawLimit = Number.parseInt(String(getQuery(event).limit ?? ''), 10)
  // limit=0 : on ne veut que les totaux (barre de progression), sans la liste.
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 0), MAX_LIMIT) : DEFAULT_LIMIT

  const supabaseAdmin = useSupabaseAdmin()

  const { data: cause, error: causeError } = await supabaseAdmin
    .from('events')
    .select('id, goal_amount, show_goal_public, show_contributions_public, category:categories(kind)')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (causeError) {
    console.error('[api/causes/:slug/contributions] événement :', causeError.message)
    throw createError({ statusCode: 500, statusMessage: 'Impossible de charger les contributions.' })
  }
  const categoryKind = (Array.isArray(cause?.category) ? cause?.category[0] : cause?.category)?.kind
  if (!cause || categoryKind !== 'cause') {
    throw createError({ statusCode: 404, statusMessage: 'Cause introuvable.' })
  }

  // Contributions payées (les commandes en attente, échouées ou remboursées sont exclues).
  // `updated_at` = instant de la confirmation du paiement (confirm_order_payment).
  const { data: orders, error: ordersError } = await supabaseAdmin
    .from('orders')
    .select('user_id, total, updated_at, contribution_note')
    .eq('event_id', cause.id)
    .eq('status', 'paid')
    .gt('total', 0)
    .order('updated_at', { ascending: false })
    .limit(5000)

  if (ordersError) {
    console.error('[api/causes/:slug/contributions] commandes :', ordersError.message)
    throw createError({ statusCode: 500, statusMessage: 'Impossible de charger les contributions.' })
  }

  // Réglages de l'organisateur : objectif et liste publique sont chacun facultatifs.
  const showGoal = cause.show_goal_public !== false && cause.goal_amount != null
  const showList = cause.show_contributions_public !== false

  const all = orders ?? []
  const totalAmount = all.reduce((sum, o) => sum + Number(o.total || 0), 0)
  // Liste masquée par l'organisateur : aucune ligne n'est lue ni renvoyée.
  const page = showList ? all.slice(0, limit) : []

  // Noms : lus uniquement pour la page demandée, masqués avant de quitter le serveur.
  const userIds = [...new Set(page.map((o) => o.user_id))]
  const names = new Map<string, string | null>()
  if (userIds.length) {
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', userIds)
    if (profilesError) {
      console.error('[api/causes/:slug/contributions] profils :', profilesError.message)
      throw createError({ statusCode: 500, statusMessage: 'Impossible de charger les contributions.' })
    }
    for (const p of profiles ?? []) names.set(p.user_id, p.full_name)
  }

  // Cache court : la liste évolue à chaque contribution, mais 15 s absorbent un pic de partages.
  setHeader(event, 'Cache-Control', 'public, s-maxage=15, stale-while-revalidate=30')

  return {
    // Total et nombre : visibles seulement si l'organisateur affiche l'objectif OU la liste.
    count: showGoal || showList ? all.length : null,
    totalAmount: showGoal || showList ? totalAmount : null,
    goalAmount: showGoal ? Number(cause.goal_amount) : null,
    showList,
    hasMore: showList && all.length > page.length,
    items: page.map((o) => ({
      maskedName: maskName(names.get(o.user_id)),
      amount: Number(o.total),
      paidAt: o.updated_at,
      note: o.contribution_note || null,
    })),
  }
})
