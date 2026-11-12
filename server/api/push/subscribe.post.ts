import { requireCsrf } from '~/server/utils/csrf'
import { checkRateLimit } from '~/server/utils/rateLimit'

/**
 * POST /api/push/subscribe — enregistre l'abonnement Web Push créé par le
 * navigateur (PushManager.subscribe). Corps : { endpoint, keys: { p256dh, auth } }.
 * `endpoint` doit être une URL https d'un service de push connu du navigateur ;
 * on ne peut pas en vérifier davantage côté serveur, mais un abonnement bidon
 * échouerait de toute façon silencieusement à l'envoi (voir server/utils/webPush.ts).
 */
export default defineEventHandler(async (event) => {
  requireCsrf(event)
  await checkRateLimit(event, { key: 'push-subscribe', max: 20, windowMs: 60 * 60 * 1000 })

  const { userId } = await requireUser(event)

  const body = await readBody<{ endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } }>(event)
  const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : ''
  const p256dh = typeof body?.keys?.p256dh === 'string' ? body.keys.p256dh : ''
  const authKey = typeof body?.keys?.auth === 'string' ? body.keys.auth : ''

  if (!endpoint.startsWith('https://') || endpoint.length > 2048 || !p256dh || !authKey || p256dh.length > 200 || authKey.length > 100) {
    throw createError({ statusCode: 400, statusMessage: 'INVALID_SUBSCRIPTION', data: { code: 'INVALID_SUBSCRIPTION' } })
  }

  // Anti-SSRF : le serveur enverra plus tard une requête POST à cette URL (cron/tick).
  // Seuls les services de push officiels des navigateurs sont acceptés, jamais un hôte
  // arbitraire choisi par l'utilisateur (ni IP, ni port, ni identifiants dans l'URL).
  if (!isAllowedPushEndpoint(endpoint)) {
    throw createError({ statusCode: 400, statusMessage: 'INVALID_SUBSCRIPTION', data: { code: 'INVALID_SUBSCRIPTION' } })
  }

  const supabaseAdmin = useSupabaseAdmin()

  // Anti-détournement : un endpoint déjà rattaché à un autre compte ne peut pas être « repris »
  // par l'upsert ci-dessous (sinon on recevrait les notifications d'un autre utilisateur).
  const { data: existing } = await supabaseAdmin.from('push_subscriptions').select('user_id').eq('endpoint', endpoint).maybeSingle()
  if (existing && existing.user_id !== userId) {
    throw createError({ statusCode: 409, statusMessage: 'SUBSCRIPTION_CONFLICT', data: { code: 'SUBSCRIPTION_CONFLICT' } })
  }
  const { error } = await supabaseAdmin.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint,
      p256dh,
      auth: authKey,
      user_agent: (getHeader(event, 'user-agent') || '').slice(0, 300),
      last_used_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' }
  )

  if (error) {
    console.error('[api/push/subscribe] échec enregistrement :', error)
    throw createError({ statusCode: 500, statusMessage: 'SUBSCRIBE_FAILED', data: { code: 'SUBSCRIBE_FAILED' } })
  }

  return { ok: true }
})

/** Services de push des navigateurs (FCM/Chrome/Edge/Opera, Mozilla, Apple, Windows). */
const PUSH_HOST_SUFFIXES = [
  'fcm.googleapis.com',
  'android.googleapis.com',
  'push.services.mozilla.com',
  'push.apple.com',
  'notify.windows.com',
]

function isAllowedPushEndpoint(endpoint: string): boolean {
  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return false
  const host = url.hostname.toLowerCase()
  return PUSH_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`))
}
