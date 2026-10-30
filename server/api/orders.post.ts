import { requireCsrf } from '~/server/utils/csrf'
import { checkRateLimit } from '~/server/utils/rateLimit'

/**
 * POST /api/orders — création d'une commande (statut « pending »).
 *
 * Corps attendu : { eventId: uuid, items: [{ ticketTypeId: uuid, quantity: 1..10 }] }
 *
 * Le navigateur n'envoie JAMAIS de prix, de total, de statut ni d'identifiant
 * utilisateur (cahier des charges §64) :
 *   - l'utilisateur vient du jeton de session (requireUser),
 *   - les prix, le stock et la fenêtre de vente sont relus en base par la
 *     fonction SQL create_order() (supabase/migrations/0017_server_side_orders.sql),
 *     qui réserve le stock de façon atomique.
 *
 * Protections : CSRF (double-submit), limite de débit par IP, session valide,
 * compte non suspendu, validation stricte du corps.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_QTY_PER_LINE = 10
const MAX_LINES = 10

// Code d'erreur SQL (message de l'exception create_order) → statut HTTP.
const ERROR_STATUS: Record<string, number> = {
  EMPTY_ORDER: 400,
  INVALID_QUANTITY: 400,
  EVENT_NOT_AVAILABLE: 404,
  TICKET_NOT_AVAILABLE: 409,
  SALE_NOT_OPEN: 409,
  SALE_CLOSED: 409,
  SOLD_OUT: 409,
  TOO_MANY_PENDING: 429,
  MAX_TICKETS_PER_BUYER_EXCEEDED: 409,
  PROMO_INVALID: 400,
  PROMO_EXPIRED: 400,
  PROMO_EXHAUSTED: 409,
  PROMO_LIMIT_REACHED: 409,
}

function orderError(statusCode: number, code: string, extra: Record<string, unknown> = {}) {
  // statusMessage = code (ASCII) : le message lisible est traduit côté interface.
  return createError({ statusCode, statusMessage: code, data: { code, ...extra } })
}

export default defineEventHandler(async (event) => {
  requireCsrf(event)

  try {
    await checkRateLimit(event, { key: 'orders', max: 20, windowMs: 10 * 60 * 1000 })
  } catch {
    throw orderError(429, 'RATE_LIMITED')
  }

  const { userId } = await requireUser(event)

  // --- Validation du corps -------------------------------------------------
  const body = await readBody<{ eventId?: unknown; items?: unknown; promoCode?: unknown; note?: unknown }>(event)

  if (typeof body?.eventId !== 'string' || !UUID_RE.test(body.eventId)) {
    throw orderError(400, 'EVENT_NOT_AVAILABLE')
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw orderError(400, 'EMPTY_ORDER')
  }
  if (body.items.length > MAX_LINES) {
    throw orderError(400, 'INVALID_QUANTITY')
  }
  // Code promo facultatif : normalisé ici, revalidé intégralement en base par
  // create_order() (format, période de validité, quota, verrou anti-double usage).
  const promoCode =
    typeof body.promoCode === 'string' && body.promoCode.trim() && body.promoCode.trim().length <= 30
      ? body.promoCode.trim().toUpperCase()
      : null

  // Raison / message facultatif d'une contribution (causes solidaires uniquement) :
  // texte brut, 140 caractères max, sans caractères de contrôle. Affiché publiquement
  // (échappé par Vue) dans la liste des contributions de la cause.
  const contributionNote =
    typeof body.note === 'string'
      ? body.note.replace(/[\u0000-\u001F\u007F]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140) || null
      : null

  const items: Array<{ ticket_type_id: string; quantity: number }> = []
  for (const raw of body.items as Array<{ ticketTypeId?: unknown; quantity?: unknown }>) {
    const id = raw?.ticketTypeId
    const qty = raw?.quantity
    if (typeof id !== 'string' || !UUID_RE.test(id)) throw orderError(400, 'TICKET_NOT_AVAILABLE')
    if (typeof qty !== 'number' || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_LINE) {
      throw orderError(400, 'INVALID_QUANTITY')
    }
    items.push({ ticket_type_id: id, quantity: qty })
  }

  // --- Compte actif ? ------------------------------------------------------
  const supabaseAdmin = useSupabaseAdmin()
  const { data: profile } = await supabaseAdmin.from('profiles').select('status').eq('user_id', userId).maybeSingle()
  if (profile?.status === 'suspended') {
    throw orderError(403, 'ACCOUNT_SUSPENDED')
  }

  // --- Création atomique (prix + stock revalidés en base) -------------------
  const { data, error } = await supabaseAdmin.rpc('create_order', {
    p_user_id: userId,
    p_event_id: body.eventId,
    p_items: items,
    p_promo_code: promoCode,
  })

  if (error) {
    const code = String(error.message ?? '').trim()
    if (code in ERROR_STATUS) {
      // Le message SQL porte un « hint » optionnel : le nom du billet en rupture
      // de stock (SOLD_OUT), ou la limite atteinte (MAX_TICKETS_PER_BUYER_EXCEEDED).
      const extra = error.hint ? (code === 'MAX_TICKETS_PER_BUYER_EXCEEDED' ? { limit: error.hint } : { ticket: error.hint }) : {}
      throw orderError(ERROR_STATUS[code], code, extra)
    }
    // Détail technique : dans les logs serveur uniquement, jamais renvoyé au client.
    console.error('[api/orders] échec create_order :', error)
    throw createError({ statusCode: 500, statusMessage: 'ORDER_FAILED', data: { code: 'ORDER_FAILED' } })
  }

  // Le message n'est enregistré que pour une cause solidaire (jamais pour un billet).
  if (contributionNote && data?.id) {
    const { data: ev } = await supabaseAdmin.from('events').select('category:categories(kind)').eq('id', body.eventId).maybeSingle()
    const cat = Array.isArray(ev?.category) ? ev?.category[0] : ev?.category
    if (cat?.kind === 'cause') {
      const { error: noteError } = await supabaseAdmin.from('orders').update({ contribution_note: contributionNote }).eq('id', data.id)
      if (noteError) console.error('[api/orders] message de contribution non enregistré :', noteError.message) // non bloquant
    }
  }

  return { order: data }
})
