import { escapeHtml, safeHttpUrl } from './escapeHtml'
import { useSupabaseAdmin } from './supabaseAdmin'

/**
 * Briques HTML communes aux emails transactionnels « premium » de Babicho
 * (confirmation de commande, remerciement…).
 *
 * Contraintes email respectées : mise en page 100 % en tableaux, styles en ligne,
 * largeur 600 px fluide sur mobile, couleurs de secours (bgcolor) pour les clients
 * qui ignorent les dégradés (Outlook), aucune dépendance à une police web.
 */

export const MAIL = {
  ink: '#0A1A34',
  inkSoft: '#16305A',
  orange: '#FF7A00',
  orangeSoft: '#FFF3E6',
  blue: '#0057B8',
  green: '#16A34A',
  greenSoft: '#E8F7EE',
  text: '#111827',
  gray: '#545C6B',
  muted: '#8A94A6',
  line: '#E2E6EE',
  page: '#EEF1F6',
  mutedOnInk: '#B0BED4',
} as const

export const FONT = "'Segoe UI',Helvetica,Arial,sans-serif"

/** Origine publique du site (liens et logo dans les emails). */
export function siteBaseUrl(override?: string | null): string {
  // Origine réelle de la requête (passée par l'appelant) : garantit que le logo et les
  // icônes pointent vers le site qui répond vraiment, quel que soit le domaine configuré.
  const given = String(override ?? '').trim().replace(/\/+$/, '')
  if (/^https?:\/\/[^\s/]+$/i.test(given)) return given
  try {
    const root = String(useRuntimeConfig().public.rootDomain || 'babicho.com').trim()
    return `https://${root}`
  } catch {
    return 'https://babicho.com'
  }
}

export interface EmailSocialLink {
  /** Nom du réseau (Facebook, Instagram…), sert aussi à choisir l'icône. */
  name: string
  href: string
}

// Mêmes réseaux et mêmes valeurs de secours que le site (composables/useSiteSettings.ts).
const SOCIAL_FIELDS: Array<{ name: string; field: string; fallback: string | null }> = [
  { name: 'Facebook', field: 'facebook_url', fallback: 'https://facebook.com/babicho' },
  { name: 'Instagram', field: 'instagram_url', fallback: 'https://instagram.com/babicho' },
  { name: 'TikTok', field: 'tiktok_url', fallback: 'https://tiktok.com/@babicho' },
  { name: 'LinkedIn', field: 'linkedin_url', fallback: 'https://linkedin.com/company/babicho' },
  { name: 'X', field: 'x_url', fallback: null },
  { name: 'YouTube', field: 'youtube_url', fallback: null },
  { name: 'WhatsApp', field: 'whatsapp_channel_url', fallback: null },
]

/**
 * Réseaux sociaux à afficher dans les emails : ce sont exactement ceux du site,
 * gérés dans /admin/contact-reseaux (table site_settings). Un champ vide masque le réseau.
 */
export async function getEmailSocialLinks(): Promise<EmailSocialLink[]> {
  let row: Record<string, string | null> | null = null
  try {
    const { data } = await useSupabaseAdmin().from('site_settings').select('*').eq('id', true).maybeSingle()
    row = (data as any) ?? null
  } catch (e) {
    console.error('[email] réglages du site indisponibles, liens sociaux par défaut :', e)
  }
  const links: EmailSocialLink[] = []
  for (const n of SOCIAL_FIELDS) {
    const raw = row ? row[n.field] : n.fallback
    const url = String(raw ?? '').trim()
    if (/^https:\/\/[^\s]+$/i.test(url)) links.push({ name: n.name, href: url })
  }
  return links
}

/** Rangée d'icônes rondes cliquables (PNG hébergés sur le site : les SVG ne passent pas dans les emails). */
function socialRow(links: EmailSocialLink[], base: string) {
  const cells = links
    .map((l) => {
      const file = l.name.toLowerCase()
      const href = safeHttpUrl(l.href)
      if (!href) return ''
      return `<td style="padding:0 6px 0 0;"><a href="${href}" target="_blank" title="${escapeHtml(l.name)}"><img src="${base}/email/social/${file}.png" width="36" height="36" alt="${escapeHtml(l.name)}" style="display:block;width:36px;height:36px;border:0;border-radius:18px;" /></a></td>`
    })
    .join('')
  if (!cells) return ''
  return `
              <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:${MAIL.ink};">Suivez-nous</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 22px;"><tr>${cells}</tr></table>`
}

/** Bouton « bulletproof » (rendu correct y compris sous Outlook). */
export function emailButton(label: string, href: string, opts: { variant?: 'primary' | 'ghost' } = {}) {
  const ghost = opts.variant === 'ghost'
  const bg = ghost ? '#FFFFFF' : MAIL.orange
  const color = MAIL.ink
  const border = ghost ? `2px solid ${MAIL.ink}` : `2px solid ${MAIL.orange}`
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-table;">
      <tr>
        <td align="center" bgcolor="${bg}" style="background:${bg};border:${border};">
          <a href="${href}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:15px;font-weight:700;line-height:1;color:${color};text-decoration:none;letter-spacing:0.2px;">${escapeHtml(label)}</a>
        </td>
      </tr>
    </table>`
}

/** Petite étiquette en capitales (« DATE », « LIEU »…). */
export function microLabel(text: string, color: string = MAIL.muted) {
  return `<p style="margin:0 0 3px;font-family:${FONT};font-size:10px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:${color};">${escapeHtml(text)}</p>`
}

/** Bandeau visuel : photo de l'événement, ou dégradé de marque si elle manque. */
export function heroImage(title: string, coverImage?: string | null) {
  const cover = safeHttpUrl(coverImage)
  if (cover) {
    return `<img src="${cover}" width="600" alt="${escapeHtml(title)}" style="display:block;width:100%;max-width:600px;height:240px;object-fit:cover;background:${MAIL.ink};border:0;" />`
  }
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td height="150" align="center" valign="middle" bgcolor="${MAIL.orange}" style="height:150px;background:${MAIL.orange};background-image:linear-gradient(135deg,${MAIL.orange},#FFA24D 55%,${MAIL.blue});">
          <span style="font-family:${FONT};font-size:26px;font-weight:800;letter-spacing:1px;color:#FFFFFF;">BABICHO</span>
        </td>
      </tr>
    </table>`
}

interface ShellOptions {
  /** Texte d'aperçu affiché dans la liste de la boîte de réception. */
  preheader: string
  /** Mention en haut à droite (ex. « Confirmation n° … »). */
  headerNote?: string
  /** Contenu (suite de <tr>…</tr> pleine largeur, 600 px). */
  rows: string
  /** Réseaux sociaux du site (voir getEmailSocialLinks). */
  social?: EmailSocialLink[]
  /** Origine du site (logo, icônes, liens). */
  siteUrl?: string | null
}

/** Enveloppe commune : en-tête logo, corps, pied de page support. */
export function emailShell({ preheader, headerNote, rows, social = [], siteUrl }: ShellOptions) {
  const base = siteBaseUrl(siteUrl)
  const year = new Date().getFullYear()
  const link = (label: string, path: string) =>
    `<a href="${base}${path}" target="_blank" style="color:${MAIL.ink};font-weight:600;text-decoration:underline;">${label}</a>`

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light only" />
<title>Babicho</title>
<style>
  @media only screen and (max-width:620px) {
    .px { padding-left:20px !important; padding-right:20px !important; }
    .stack { display:block !important; width:100% !important; }
    .stub { border-left:0 !important; border-top:2px dashed ${MAIL.line} !important; padding:18px 0 4px !important; }
    .h1 { font-size:26px !important; line-height:1.15 !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${MAIL.page};-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${escapeHtml(preheader)}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${MAIL.page}" style="background:${MAIL.page};">
    <tr>
      <td align="center" style="padding:28px 12px 36px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#FFFFFF;border-radius:18px;overflow:hidden;box-shadow:0 18px 40px -18px rgba(10,26,52,0.35);">
          <!-- En-tête -->
          <tr>
            <td class="px" style="padding:22px 36px;background:#FFFFFF;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left" valign="middle">
                    <a href="${base}" target="_blank"><img src="${base}/email/logo.png" width="132" height="47" alt="Babicho" style="display:block;width:132px;height:47px;border:0;font-family:${FONT};font-size:18px;font-weight:800;color:${MAIL.orange};" /></a>
                  </td>
                  <td align="right" valign="middle" style="font-family:${FONT};font-size:12px;color:${MAIL.muted};">${headerNote ? escapeHtml(headerNote) : ''}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td height="4" bgcolor="${MAIL.orange}" style="height:4px;line-height:4px;font-size:0;background:${MAIL.orange};background-image:linear-gradient(90deg,${MAIL.orange},#FFA24D 45%,${MAIL.blue});">&nbsp;</td></tr>

          ${rows}

          <!-- Pied de page -->
          <tr>
            <td class="px" style="padding:28px 36px 30px;background:#F7F8FB;border-top:1px solid ${MAIL.line};font-family:${FONT};">
              ${socialRow(social, base)}
              <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:${MAIL.ink};">Une question ? Nous sommes là.</p>
              <p style="margin:0 0 16px;font-size:13px;line-height:1.65;color:${MAIL.gray};">
                ${link('Mes billets', '/mon-espace/mes-billets')} &nbsp;·&nbsp; ${link('Contacter le support', '/contact')} &nbsp;·&nbsp; ${link('Conditions générales', '/conditions')} &nbsp;·&nbsp; ${link('Remboursement', '/remboursement')}
              </p>
              <p style="margin:0;font-size:11.5px;line-height:1.65;color:${MAIL.muted};">
                Vous recevez cet email car une commande a été passée avec votre adresse sur Babicho. Si vous n’en êtes pas à l’origine, contactez notre support sans attendre.<br />
                © ${year} Babicho — la billetterie qui vous ouvre les portes.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
