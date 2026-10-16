import { ticketsEmailTemplate, thankYouEmailTemplate } from './brevo'
import { useSupabaseAdmin } from './supabaseAdmin'
import { getEmailSocialLinks } from './emailLayout'

interface OrderSummary {
  order: { order_number: string; total: number; currency: string }
  buyer?: { email: string | null; full_name: string | null } | null
  event: { title: string; start_date: string; location_name: string | null; city: string | null; cover_image: string | null }
  tickets?: Array<{ ticket_number: string; type_name: string; price: number; qr_token: string | null }> | null
}

/** Vrai si l'événement de la commande est rattaché à une catégorie de type « cause » (demande d'aide). */
async function isCauseOrder(orderId: string): Promise<boolean> {
  try {
    const { data } = await useSupabaseAdmin()
      .from('orders')
      .select('event:events ( category:categories ( kind ) )')
      .eq('id', orderId)
      .maybeSingle()
    return (data as any)?.event?.category?.kind === 'cause'
  } catch (e) {
    // En cas de doute (ex. migration 0051 pas encore appliquée), on garde le comportement billetterie.
    console.error('[orderEmail] impossible de déterminer le type de la commande :', e)
    return false
  }
}

/**
 * Email envoyé après une commande confirmée : billets (PDF + QR) pour un
 * événement classique, simple message de remerciement pour une cause solidaire.
 */
export async function orderConfirmationEmail(orderId: string, summary: OrderSummary) {
  const social = await getEmailSocialLinks()
  if (await isCauseOrder(orderId)) {
    return thankYouEmailTemplate({
      orderNumber: summary.order.order_number,
      total: summary.order.total,
      currency: summary.order.currency,
      causeTitle: summary.event.title,
      contributorName: summary.buyer?.full_name,
      causeCoverImage: summary.event.cover_image,
      social,
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
    social,
  })
}
