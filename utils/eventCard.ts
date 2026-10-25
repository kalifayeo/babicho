import type { EventCardData } from '~/types/database'

/** Colonnes lues pour afficher une carte (événement OU cotisation). */
export const EVENT_CARD_SELECT = `id, slug, title, city, country, start_date, end_date, cover_image,
  category:categories(name, kind),
  organizer:organizers(id, name, status, logo_url),
  ticket_types(price)`

/** Ligne Supabase → données d'une carte. Un seul mapping pour toutes les listes. */
export function mapEventCard(e: any): EventCardData {
  const prices = (e.ticket_types ?? []).map((t: any) => Number(t.price)).filter((p: number) => !Number.isNaN(p))
  return {
    id: e.id,
    slug: e.slug,
    title: e.title,
    city: e.city ?? '',
    country: e.country ?? '',
    startDate: e.start_date,
    endDate: e.end_date ?? null,
    coverImage: e.cover_image || '/sample-event.jpg',
    priceFrom: prices.length > 0 ? Math.min(...prices) : 0,
    category: e.category?.name,
    isCause: e.category?.kind === 'cause',
    verified: e.organizer?.status === 'approved',
    organizerId: e.organizer?.id,
    organizerName: e.organizer?.name,
    organizerAvatar: e.organizer?.logo_url ?? null,
  }
}

/**
 * Ajoute le nombre de cœurs, le montant récolté et l'objectif (fonction SQL
 * `event_card_stats`, migration 0059). Si la fonction n'existe pas encore ou
 * échoue, les cartes s'affichent quand même (compteurs à 0).
 */
export async function enrichCards<T extends EventCardData>(cards: T[]): Promise<T[]> {
  if (!import.meta.client || cards.length === 0) return cards
  try {
    const supabase = useSupabase()
    const { data, error } = await supabase.rpc('event_card_stats', { event_ids: cards.map((c) => c.id) })
    if (error || !Array.isArray(data)) return cards
    const byId = new Map<string, any>((data as any[]).map((r) => [r.event_id, r]))
    return cards.map((c) => {
      const s = byId.get(c.id)
      if (!s) return c
      return {
        ...c,
        favoritesCount: Number(s.favorites_count) || 0,
        raisedAmount: Number(s.raised) || 0,
        goalAmount: s.goal_amount != null ? Number(s.goal_amount) : null,
      }
    })
  } catch {
    return cards
  }
}

const FLAGS: Record<string, string> = {
  "cote d'ivoire": 'ci', 'cote divoire': 'ci', 'ivory coast': 'ci',
  senegal: 'sn', ghana: 'gh', nigeria: 'ng', cameroun: 'cm', cameroon: 'cm', mali: 'ml',
  benin: 'bj', togo: 'tg', 'burkina faso': 'bf', niger: 'ne', guinee: 'gn', gabon: 'ga',
  congo: 'cg', rdc: 'cd', 'rd congo': 'cd', france: 'fr', maroc: 'ma', morocco: 'ma',
  tunisie: 'tn', algerie: 'dz', belgique: 'be', canada: 'ca',
}

/** Drapeau (image) d'un pays à partir de son nom ou de son code ISO. Vide si inconnu. */
export function countryFlagUrl(country?: string | null): string {
  if (!country) return ''
  const raw = country.trim()
  const key = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’`]/g, "'")
    .toLowerCase()
  const code = FLAGS[key] ?? (/^[a-z]{2}$/.test(key) ? key : '')
  return code ? `https://flagcdn.com/w40/${code}.png` : ''
}

/** 1 234 → « 1,2 k » : compteur de cœurs compact, comme sur les cartes de référence. */
export function compactCount(n: number): string {
  if (n < 1000) return String(n)
  const v = n / 1000
  const s = v >= 10 ? String(Math.round(v)) : v.toFixed(1).replace('.', ',').replace(/,0$/, '')
  return `${s} k`
}
