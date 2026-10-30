import { normalizeIvorianPhone } from './phone'

/**
 * Envoi de SMS transactionnels (confirmation d'achat, rappels d'événement).
 *
 * Fournisseur choisi par SMS_PROVIDER (voir .env.example) :
 *   - 'twilio' : implémenté ci-dessous (API REST, aucune dépendance).
 *   - vide     : SMS désactivés (aucun envoi, aucune erreur).
 *
 * Pour ajouter un autre fournisseur (ex. un opérateur local), il suffit
 * d'ajouter une fonction `sendVia<Nom>` et une ligne dans le `switch` de
 * sendSms() : le reste de l'application ne change pas.
 */

export type SmsResult =
  | { status: 'sent' }
  | { status: 'disabled' } // fournisseur non configuré : rien à retenter
  | { status: 'invalid_number' } // numéro inexploitable : rien à retenter

/** Retire emojis/retours à la ligne (un SMS avec emoji passe en Unicode : 70 car. au lieu de 160) et borne la longueur. */
export function toSmsText(input: string, max = 300): string {
  const clean = input
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
}

export function isSmsConfigured(): boolean {
  const config = useRuntimeConfig()
  if (config.smsProvider === 'twilio') {
    return !!(config.twilioAccountSid && config.twilioAuthToken && (config.twilioMessagingServiceSid || config.smsFrom))
  }
  return false
}

export async function sendSms(options: { to: string; message: string }): Promise<SmsResult> {
  const config = useRuntimeConfig()
  if (!isSmsConfigured()) return { status: 'disabled' }

  const to = normalizeIvorianPhone(options.to)
  if (!to) return { status: 'invalid_number' }

  const text = toSmsText(options.message)
  if (!text) return { status: 'invalid_number' }

  switch (config.smsProvider) {
    case 'twilio':
      await sendViaTwilio(to, text)
      return { status: 'sent' }
    default:
      return { status: 'disabled' }
  }
}

async function sendViaTwilio(to: string, body: string) {
  const config = useRuntimeConfig()
  const sid = config.twilioAccountSid as string
  const params = new URLSearchParams({ To: to, Body: body })
  // Un « Messaging Service » (recommandé) gère l'expéditeur ; sinon un numéro / un nom d'expéditeur.
  if (config.twilioMessagingServiceSid) params.set('MessagingServiceSid', config.twilioMessagingServiceSid as string)
  else params.set('From', config.smsFrom as string)

  const response = await $fetch.raw(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${config.twilioAuthToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
    ignoreResponseError: true,
  })

  if (response.status >= 400) {
    // On ne journalise ni le numéro ni le texte du SMS (données personnelles).
    const code = (response._data as { code?: number } | undefined)?.code
    throw new Error(`Twilio a refusé le SMS (HTTP ${response.status}${code ? `, code ${code}` : ''})`)
  }
}
