import { ticketsEmailTemplate, thankYouEmailTemplate } from './brevo'
import { useSupabaseAdmin } from './supabaseAdmin'
import { getEmailSocialLinks } from './emailLayout'
import { isGoogleWalletConfigured } from './googleWallet'
import { isAppleWalletConfigured } from './appleWallet'

interface OrderSummary {
  order: { order_number: string; total: number; currency: string }
  buyer?: { email: string | null; full_name: string | null } | null
  event: { title: string; start_date: string; location_name: string | null; city: string | null; cover_image: string | null }
  tickets?: Array<{ ticket_number: string; type_name: string; price: number; qr_token: string | null }> | null
}

interface OrderExtras {
  isCause: boolean
  slug: string | null
  endDate: string | null
  address: string | null
}

/**
 * Infos de l'événement absentes du résumé de commande (slug, fin, adresse) + type « cause ».
 * En cas de doute (ex. migration 0051 pas encore appliquée), on garde le comportement billetterie.
 */
async function loadOrderExtras(orderId: string): Promise<OrderExtras> {
  try {
    const { data } = await useSupabaseAdmin()
      .from('orders')
      .select('event:events ( slug, end_date, address, category:categories ( kind ) )')
      .eq('id', orderId)
      .maybeSingle()
    const ev = (data as any)?.event
    return { isCause: ev?.category?.kind === 'cause', slug: ev?.slug ?? null, endDate: ev?.end_date ?? null, address: ev?.address ?? null }
  } catch (e) {
    console.error('[orderEmail] impossible de lire les détails de la commande :', e)
    return { isCause: false, slug: null, endDate: null, address: null }
  }
}

/**
 * Email envoyé après une commande confirmée : billets (PDF + QR) pour un
 * événement classique, simple message de remerciement pour une cause solidaire.
 */
export async function orderConfirmationEmail(orderId: string, summary: OrderSummary, siteUrl?: string | null) {
  const social = await getEmailSocialLinks()
  const extras = await loadOrderExtras(orderId)
  if (extras.isCause) {
    return thankYouEmailTemplate({
      orderNumber: summary.order.order_number,
      total: summary.order.total,
      currency: summary.order.currency,
      causeTitle: summary.event.title,
      contributorName: summary.buyer?.full_name,
      causeCoverImage: summary.event.cover_image,
      social,
      siteUrl,
    })
  }
  return ticketsEmailTemplate({
    orderNumber: summary.order.order_number,
    total: summary.order.total,
    currency: summary.order.currency,
    eventTitle: summary.event.title,
    eventDate: summary.event.start_date,
    eventLocation: summary.event.location_name || summary.event.city || '',
    eventCoverImage: summary.event.cover_image,
    holderName: summary.buyer?.full_name,
    tickets: summary.tickets ?? [],
    eventSlug: extras.slug,
    eventEndDate: extras.endDate,
    eventAddress: extras.address,
    walletAvailable: isGoogleWalletConfigured() || isAppleWalletConfigured(),
    social,
    siteUrl,
  })
}
