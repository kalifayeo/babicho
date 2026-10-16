import QRCode from 'qrcode'
import { buildIndividualTicketPdfs } from './ticketPdf'
import { escapeHtml } from './escapeHtml'
import { MAIL, FONT, siteBaseUrl, emailShell, emailButton, microLabel, heroImage } from './emailLayout'

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

interface EmailAttachment {
  /** Nom de fichier affiché au destinataire (ex. "billets-TIK-2026-0001.pdf"). */
  name: string
  /** Contenu du fichier encodé en base64 (format attendu par l'API Brevo). */
  content: string
}

interface SendEmailOptions {
  to: string
  toName?: string
  subject: string
  htmlContent: string
  attachments?: EmailAttachment[]
}

export async function sendTransactionalEmail(options: SendEmailOptions) {
  const config = useRuntimeConfig()

  if (!config.brevoApiKey) {
    // En dev sans clé Brevo configurée, on log le contenu au lieu d'échouer
    // silencieusement — pratique pour tester le flow OTP en local.
    // En PRODUCTION on ne journalise jamais le contenu : il peut contenir un code
    // de connexion, un lien de transfert ou le QR code d'un billet valide.
    if (import.meta.dev) {
      console.warn('[brevo] BREVO_API_KEY manquant — email non envoyé, contenu :', {
        ...options,
        attachments: options.attachments?.map((a) => ({ name: a.name, bytes: a.content.length })),
      })
    } else {
      console.error('[brevo] BREVO_API_KEY manquant — email non envoyé :', { subject: options.subject })
    }
    return
  }

  const response = await $fetch.raw(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'api-key': config.brevoApiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: {
      sender: { name: config.brevoSenderName, email: config.brevoSenderEmail },
      to: [{ email: options.to, name: options.toName || options.to }],
      subject: options.subject,
      htmlContent: options.htmlContent,
      ...(options.attachments?.length ? { attachment: options.attachments.map((a) => ({ name: a.name, content: a.content })) } : {}),
    },
    ignoreResponseError: true,
  })

  if (response.status >= 400) {
    console.error('[brevo] Échec envoi email', response.status, response._data)
    throw createError({ statusCode: 502, statusMessage: "Échec de l'envoi de l'email via Brevo." })
  }
}

interface TicketsEmailTicket {
  ticket_number: string
  type_name: string
  price: number
  /** Jeton unique du billet (colonne tickets.qr_token) — encodé dans le QR affiché sur le billet. */
  qr_token?: string | null
}

interface TicketsEmailOptions {
  orderNumber: string
  total: number
  currency: string
  eventTitle: string
  eventDate: string
  eventLocation: string
  /** Photo de couverture de l'événement (events.cover_image) — bandeau en haut du billet. */
  eventCoverImage?: string | null
  /** Nom du titulaire imprimé sur chaque billet PDF (l'acheteur). */
  holderName?: string | null
  tickets: TicketsEmailTicket[]
}

function formatAmount(n: number, currency: string) {
  return `${n.toLocaleString('fr-FR')} ${currency === 'XOF' ? 'F CFA' : currency}`
}

/** Génère un QR code (PNG en data URI) à partir du jeton du billet — fallback discret si la génération échoue. */
async function qrDataUrl(token: string | null | undefined): Promise<string | null> {
  if (!token) return null
  try {
    return await QRCode.toDataURL(token, { margin: 1, width: 220, color: { dark: '#111111', light: '#FFFFFFFF' } })
  } catch (e) {
    console.error('[brevo] échec génération QR code billet :', e)
    return null
  }
}

/**
 * Email envoyé à l'acheteur juste après confirmation d'un paiement — ou
 * juste après récupération d'un billet gratuit sans paiement (voir
 * supabase/migrations/0019 & 0025_confirm_order_payment_ticket_visuals.sql,
 * server/api/orders/[id]/confirm-payment.post.ts et
 * server/api/orders/[id]/claim-free.post.ts).
 *
 * Chaque billet est rendu comme une carte soignée : photo de l'événement,
 * infos essentielles, et QR code (encodant tickets.qr_token) — c'est la
 * preuve d'achat scannée à l'entrée.
 */
export async function ticketsEmailTemplate(options: TicketsEmailOptions) {
  const isFree = Number(options.total) === 0
  const base = siteBaseUrl()

  // Les billets « officiels », avec un vrai design (talon détachable, QR
  // code, logo Babicho), sont générés en PDF et joints à l'email — voir
  // server/utils/ticketPdf.ts. Le corps HTML ci-dessous est un aperçu
  // élégant ; le(s) PDF joint(s) sont la version à imprimer / présenter à
  // l'entrée.
  //
  // IMPORTANT : chaque billet est joint en tant que PDF SÉPARÉ. Si l'acheteur a
  // pris 2, 3 ou N billets, l'email contient N pièces jointes distinctes —
  // plus simples à transférer ou imprimer individuellement.
  let pdfAttachments: { name: string; content: string }[] = []
  try {
    pdfAttachments = await buildIndividualTicketPdfs({
      orderNumber: options.orderNumber,
      total: options.total,
      currency: options.currency,
      eventTitle: options.eventTitle,
      eventDate: options.eventDate,
      eventLocation: options.eventLocation,
      eventCoverImage: options.eventCoverImage,
      holderName: options.holderName,
      tickets: options.tickets,
    })
  } catch (e) {
    console.error('[brevo] échec génération des PDF des billets (email envoyé sans pièce jointe) :', e)
  }

  const tz = 'Africa/Abidjan'
  const dateObj = new Date(options.eventDate)
  const longDate = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: tz })
  const timeLabel = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: tz }).replace(':', 'h')
  const dateLabel = longDate.charAt(0).toUpperCase() + longDate.slice(1)
  const place = options.eventLocation || 'Lieu communiqué par l’organisateur'
  const mapsUrl = options.eventLocation
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(options.eventLocation)}`
    : ''

  const count = options.tickets.length
  const firstName = (options.holderName || '').trim().split(/\s+/)[0]
  const holder = (options.holderName || '').trim()
  const ticketsUrl = `${base}/mon-espace/mes-billets`
  const F = FONT

  // ---------- Cartes billet ----------
  const ticketCards = (
    await Promise.all(
      options.tickets.map(async (tk, i) => {
        const qr = await qrDataUrl(tk.qr_token)
        const price = isFree ? 'Gratuit' : formatAmount(tk.price, options.currency)
        return `
        <tr>
          <td class="px" style="padding:0 36px 18px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${MAIL.line};border-radius:14px;overflow:hidden;">
              <tr>
                <td bgcolor="${MAIL.ink}" style="background:${MAIL.ink};padding:11px 20px;font-family:${F};">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                    <td style="font-size:11px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:${MAIL.orange};">Billet ${i + 1} / ${count}</td>
                    <td align="right" style="font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${MAIL.mutedOnInk};">${escapeHtml(tk.type_name)}</td>
                  </tr></table>
                </td>
              </tr>
              <tr>
                <td style="padding:20px;background:#FFFFFF;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td class="stack" valign="top" style="padding-right:18px;font-family:${F};">
                        <p style="margin:0 0 14px;font-size:17px;font-weight:800;line-height:1.3;color:${MAIL.text};">${escapeHtml(options.eventTitle)}</p>
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td valign="top" width="50%" style="padding:0 8px 12px 0;">${microLabel('Titulaire')}<p style="margin:0;font-size:14px;font-weight:600;color:${MAIL.text};">${holder ? escapeHtml(holder) : '—'}</p></td>
                            <td valign="top" width="50%" style="padding:0 0 12px;">${microLabel('Tarif')}<p style="margin:0;font-size:14px;font-weight:600;color:${isFree ? MAIL.green : MAIL.text};">${escapeHtml(price)}</p></td>
                          </tr>
                          <tr>
                            <td colspan="2" valign="top" style="padding:0;">${microLabel('N° de billet')}<p style="margin:0;font-family:'Courier New',monospace;font-size:14px;font-weight:700;letter-spacing:0.6px;color:${MAIL.text};">${escapeHtml(tk.ticket_number)}</p></td>
                          </tr>
                        </table>
                      </td>
                      <td class="stack stub" width="150" valign="middle" align="center" style="width:150px;padding-left:18px;border-left:2px dashed ${MAIL.line};font-family:${F};">
                        ${
                          qr
                            ? `<img src="${qr}" width="124" height="124" alt="QR code du billet ${escapeHtml(tk.ticket_number)}" style="display:block;margin:0 auto;width:124px;height:124px;border:1px solid ${MAIL.line};border-radius:10px;padding:6px;background:#FFFFFF;" />`
                            : `<span style="display:inline-block;width:124px;height:124px;line-height:124px;text-align:center;font-size:11px;color:${MAIL.muted};border:1px dashed ${MAIL.line};border-radius:10px;">QR dans le PDF</span>`
                        }
                        <p style="margin:8px 0 0;font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${MAIL.muted};">Scannez à l’entrée</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
      })
    )
  ).join('')

  // ---------- Récapitulatif (regroupé par type de billet) ----------
  const groups = new Map<string, { n: number; price: number }>()
  for (const tk of options.tickets) {
    const g = groups.get(tk.type_name) ?? { n: 0, price: tk.price }
    g.n += 1
    groups.set(tk.type_name, g)
  }
  const receiptRows = [...groups.entries()]
    .map(
      ([name, g]) => `
      <tr>
        <td style="padding:10px 0;font-family:${F};font-size:14px;color:${MAIL.text};border-bottom:1px solid ${MAIL.line};">${g.n} × ${escapeHtml(name)}</td>
        <td align="right" style="padding:10px 0;font-family:${F};font-size:14px;color:${MAIL.text};border-bottom:1px solid ${MAIL.line};">${isFree ? 'Gratuit' : escapeHtml(formatAmount(g.n * g.price, options.currency))}</td>
      </tr>`
    )
    .join('')

  // ---------- Bloc pièces jointes ----------
  const pdfNotice = pdfAttachments.length
    ? `
        <tr>
          <td class="px" style="padding:0 36px 26px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#F1F6FD" style="background:#F1F6FD;border:1px solid #D6E4F7;border-radius:12px;">
              <tr>
                <td style="padding:14px 18px;font-family:${F};font-size:13px;line-height:1.6;color:${MAIL.inkSoft};">
                  <strong style="color:${MAIL.ink};">${pdfAttachments.length === 1 ? 'Votre billet PDF est en pièce jointe.' : `Vos ${pdfAttachments.length} billets PDF sont en pièces jointes.`}</strong>
                  ${pdfAttachments.length === 1 ? 'Imprimez-le ou gardez-le sur votre téléphone, il est prêt à être scanné.' : 'Un fichier par billet : imprimez-les ou transmettez-les séparément à vos invités.'}
                </td>
              </tr>
            </table>
          </td>
        </tr>`
    : ''

  // ---------- Étapes « avant de partir » ----------
  const step = (n: number, title: string, body: string) => `
      <tr>
        <td valign="top" width="40" style="padding:0 0 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" valign="middle" width="28" height="28" bgcolor="${MAIL.orangeSoft}" style="width:28px;height:28px;background:${MAIL.orangeSoft};border-radius:14px;font-family:${F};font-size:13px;font-weight:800;color:${MAIL.orange};">${n}</td></tr></table>
        </td>
        <td valign="top" style="padding:0 0 16px;font-family:${F};">
          <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:${MAIL.text};">${title}</p>
          <p style="margin:0;font-size:13px;line-height:1.6;color:${MAIL.gray};">${body}</p>
        </td>
      </tr>`

  const intro = isFree
    ? `Votre place gratuite est réservée, sans aucun paiement. ${count > 1 ? 'Vos billets sont prêts' : 'Votre billet est prêt'} ci-dessous.`
    : `Votre paiement a bien été reçu. ${count > 1 ? 'Vos billets sont prêts' : 'Votre billet est prêt'} ci-dessous et en pièce jointe.`

  const rows = `
        <!-- Visuel de l'événement -->
        <tr><td style="font-size:0;line-height:0;">${heroImage(options.eventTitle, options.eventCoverImage)}</td></tr>

        <!-- Confirmation -->
        <tr>
          <td class="px" bgcolor="${MAIL.ink}" style="padding:34px 36px 36px;background:${MAIL.ink};font-family:${F};">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td bgcolor="${MAIL.green}" style="background:${MAIL.green};border-radius:999px;padding:6px 14px;font-family:${F};font-size:11px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:#FFFFFF;">&#10003;&nbsp; ${isFree ? 'Place confirmée' : 'Paiement confirmé'}</td>
            </tr></table>
            <h1 class="h1" style="margin:18px 0 10px;font-size:32px;line-height:1.12;font-weight:800;letter-spacing:-0.4px;color:#FFFFFF;">${firstName ? `${escapeHtml(firstName)}, ` : ''}${count > 1 ? 'vos billets sont prêts' : 'votre billet est prêt'}.</h1>
            <p style="margin:0 0 26px;font-size:15px;line-height:1.65;color:${MAIL.mutedOnInk};">${intro}</p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(255,255,255,0.14);border-radius:12px;" bgcolor="${MAIL.inkSoft}">
              <tr>
                <td style="padding:18px 20px;font-family:${F};">
                  <p style="margin:0 0 14px;font-size:19px;font-weight:800;line-height:1.3;color:#FFFFFF;">${escapeHtml(options.eventTitle)}</p>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td class="stack" valign="top" width="50%" style="padding:0 12px 10px 0;">${microLabel('Date', MAIL.orange)}<p style="margin:0;font-size:14px;font-weight:600;line-height:1.4;color:#FFFFFF;">${escapeHtml(dateLabel)}</p><p style="margin:2px 0 0;font-size:13px;color:${MAIL.mutedOnInk};">à ${escapeHtml(timeLabel)}</p></td>
                      <td class="stack" valign="top" width="50%" style="padding:0 0 10px;">${microLabel('Lieu', MAIL.orange)}<p style="margin:0;font-size:14px;font-weight:600;line-height:1.4;color:#FFFFFF;">${escapeHtml(place)}</p>${mapsUrl ? `<p style="margin:2px 0 0;font-size:13px;"><a href="${mapsUrl}" target="_blank" style="color:#FFB366;text-decoration:underline;">Voir l’itinéraire</a></p>` : ''}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:26px;"><tr><td>${emailButton('Voir mes billets', ticketsUrl)}</td></tr></table>
          </td>
        </tr>

        <!-- Billets -->
        <tr><td class="px" style="padding:34px 36px 16px;font-family:${F};">
          <p style="margin:0 0 4px;font-size:11px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;color:${MAIL.orange};">${count > 1 ? 'Vos billets' : 'Votre billet'}</p>
          <h2 style="margin:0;font-size:22px;font-weight:800;letter-spacing:-0.2px;color:${MAIL.text};">Présentez le QR code à l’entrée</h2>
        </td></tr>
        ${ticketCards}
        ${pdfNotice}

        <!-- Avant de partir -->
        <tr><td class="px" style="padding:10px 36px 8px;font-family:${F};">
          <h3 style="margin:0 0 16px;font-size:16px;font-weight:800;color:${MAIL.text};">Avant de partir</h3>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${step(1, 'Préparez votre QR code', 'Affichez-le sur votre téléphone avec la luminosité au maximum, ou imprimez le PDF.')}
            ${step(2, 'Un billet, une seule entrée', 'Chaque QR code ne peut être validé qu’une fois. Ne le publiez jamais en ligne.')}
            ${step(3, 'Arrivez en avance', 'Une pièce d’identité peut être demandée, le nom du titulaire figure sur le billet.')}
          </table>
        </td></tr>

        <!-- Récapitulatif -->
        <tr><td class="px" style="padding:12px 36px 36px;font-family:${F};">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#F7F8FB" style="background:#F7F8FB;border:1px solid ${MAIL.line};border-radius:14px;">
            <tr><td style="padding:20px 22px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td style="font-family:${F};font-size:15px;font-weight:800;color:${MAIL.text};">Récapitulatif de commande</td>
                <td align="right" style="font-family:${F};"><span style="display:inline-block;background:${MAIL.greenSoft};color:${MAIL.green};font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;padding:4px 10px;border-radius:999px;">${isFree ? 'Confirmée' : 'Payée'}</span></td>
              </tr></table>
            </td></tr>
            <tr><td style="padding:0 22px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:10px 0;font-family:${F};font-size:13px;color:${MAIL.gray};border-bottom:1px solid ${MAIL.line};">Référence</td>
                  <td align="right" style="padding:10px 0;font-family:'Courier New',monospace;font-size:13px;font-weight:700;color:${MAIL.text};border-bottom:1px solid ${MAIL.line};">${escapeHtml(options.orderNumber)}</td>
                </tr>
                ${receiptRows}
                <tr>
                  <td style="padding:14px 0 18px;font-family:${F};font-size:15px;font-weight:800;color:${MAIL.text};">Total</td>
                  <td align="right" style="padding:14px 0 18px;font-family:${F};font-size:20px;font-weight:800;color:${MAIL.text};">${isFree ? 'Gratuit' : escapeHtml(formatAmount(options.total, options.currency))}</td>
                </tr>
              </table>
            </td></tr>
          </table>
        </td></tr>`

  return {
    subject: isFree ? `Votre billet gratuit — ${options.eventTitle}` : `Vos billets sont prêts — ${options.eventTitle}`,
    html: emailShell({
      preheader: `${isFree ? 'Place confirmée' : 'Paiement confirmé'} · ${options.eventTitle} · ${dateLabel} à ${timeLabel}`,
      headerNote: `Commande ${options.orderNumber}`,
      rows,
    }),
    attachments: pdfAttachments,
  }
}

/**
 * Email envoyé au contributeur après la confirmation d'une contribution à une
 * cause solidaire (demande d'aide, cotisation...). Contrairement à
 * ticketsEmailTemplate(), il ne contient ni billet, ni QR code, ni pièce
 * jointe : uniquement un message de remerciement et la référence du reçu.
 */
export function thankYouEmailTemplate(options: {
  orderNumber: string
  total: number
  currency: string
  causeTitle: string
  contributorName?: string | null
  causeCoverImage?: string | null
}) {
  const isFree = Number(options.total) === 0
  const firstName = (options.contributorName || '').trim().split(/\s+/)[0]
  const amountLine = isFree ? 'Contribution libre' : formatAmount(options.total, options.currency)
  const F = FONT
  const base = siteBaseUrl()

  const rows = `
        <tr><td style="font-size:0;line-height:0;">${heroImage(options.causeTitle, options.causeCoverImage)}</td></tr>
        <tr>
          <td class="px" bgcolor="${MAIL.ink}" style="padding:34px 36px 38px;background:${MAIL.ink};font-family:${F};">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td bgcolor="${MAIL.green}" style="background:${MAIL.green};border-radius:999px;padding:6px 14px;font-size:11px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:#FFFFFF;">&#10003;&nbsp; Contribution reçue</td>
            </tr></table>
            <h1 class="h1" style="margin:18px 0 12px;font-size:32px;line-height:1.12;font-weight:800;letter-spacing:-0.4px;color:#FFFFFF;">${firstName ? `Merci ${escapeHtml(firstName)}` : 'Merci'}, du fond du cœur.</h1>
            <p style="margin:0;font-size:15px;line-height:1.7;color:${MAIL.mutedOnInk};">Votre contribution à <strong style="color:#FFFFFF;">${escapeHtml(options.causeTitle)}</strong> a bien été reçue. Grâce à des personnes comme vous, cette cause avance.</p>
          </td>
        </tr>
        <tr>
          <td class="px" style="padding:32px 36px 12px;font-family:${F};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#F7F8FB" style="background:#F7F8FB;border:1px solid ${MAIL.line};border-radius:14px;">
              <tr><td style="padding:20px 22px 8px;font-size:15px;font-weight:800;color:${MAIL.text};">Votre reçu</td></tr>
              <tr><td style="padding:0 22px 8px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:10px 0;font-size:13px;color:${MAIL.gray};border-bottom:1px solid ${MAIL.line};">Référence</td>
                    <td align="right" style="padding:10px 0;font-family:'Courier New',monospace;font-size:13px;font-weight:700;color:${MAIL.text};border-bottom:1px solid ${MAIL.line};">${escapeHtml(options.orderNumber)}</td>
                  </tr>
                  <tr>
                    <td style="padding:14px 0 18px;font-size:15px;font-weight:800;color:${MAIL.text};">Votre contribution</td>
                    <td align="right" style="padding:14px 0 18px;font-size:20px;font-weight:800;color:${MAIL.green};">${escapeHtml(amountLine)}</td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <p style="margin:18px 0 26px;font-size:13px;line-height:1.7;color:${MAIL.gray};">Conservez cet email comme reçu. Vous pouvez aussi retrouver votre contribution à tout moment dans votre espace Babicho, rubrique « Mes commandes ».</p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:34px;"><tr><td>${emailButton('Voir mes commandes', `${base}/mon-espace/mes-commandes`)}</td></tr></table>
          </td>
        </tr>`

  return {
    subject: `Merci pour votre contribution — ${options.causeTitle}`,
    html: emailShell({
      preheader: `Votre contribution à ${options.causeTitle} a bien été reçue. Merci !`,
      headerNote: `Reçu ${options.orderNumber}`,
      rows,
    }),
    attachments: [] as EmailAttachment[],
  }
}

export function otpEmailTemplate(code: string, purpose: 'signup' | 'login' | 'reset_password') {
  const intro: Record<typeof purpose, string> = {
    signup: 'Voici votre code pour confirmer la création de votre compte Babicho :',
    login: 'Voici votre code de connexion à Babicho :',
    reset_password: 'Voici votre code pour réinitialiser votre mot de passe Babicho :',
  } as const

  return {
    subject: 'Votre code de vérification Babicho',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color:#FF7A00;">Babicho</h2>
        <p>${intro[purpose]}</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; margin: 24px 0;">${escapeHtml(code)}</p>
        <p>Ce code expire dans quelques minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
      </div>
    `,
  }
}
