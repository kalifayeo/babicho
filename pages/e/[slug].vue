<script setup lang="ts">
import type { CartLine } from '~/composables/useEventDetail'

const { t, te, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const slug = route.params.slug as string

const { event, loading, notFound, error, refresh } = useEventDetail(slug)
const { isAuthenticated, user } = useAuth()
const { isFavorite, toggleFavorite } = useFavorites()
const { submitting, errorCode, errorLimit, createOrder } = useEventOrder()
const { filters: homeFilters } = useHomeFilters()

// --- Code promo (facultatif, appliqué à la création de la commande) ---------
const promoCodeInput = ref('')
// Raison / message facultatif d'une contribution (causes solidaires).
const contributionNote = ref('')
const showMobileNote = ref(false)
// Section « Contributions » repliée par défaut : la liste ne se charge qu'à la 1re ouverture.
const contribOpen = ref(false)
const contribEverOpened = ref(false)
function toggleContrib() {
  contribOpen.value = !contribOpen.value
  if (contribOpen.value) contribEverOpened.value = true
}
const { checking: promoChecking, preview: promoPreview, check: checkPromo, clear: clearPromo } = usePromoPreview()
let promoCheckTimer: ReturnType<typeof setTimeout> | null = null
watch(promoCodeInput, (val) => {
  if (promoCheckTimer) clearTimeout(promoCheckTimer)
  if (!val.trim() || !event.value) {
    clearPromo()
    return
  }
  promoCheckTimer = setTimeout(() => checkPromo(event.value!.id, val), 500)
})
const promoDiscountPreviewLabel = computed(() => {
  if (!promoPreview.value?.valid) return null
  return promoPreview.value.discount_type === 'percent'
    ? `-${promoPreview.value.discount_value}%`
    : `-${promoPreview.value.discount_value} FCFA`
})

// --- Liste d'attente (types de billets épuisés) -----------------------------
const { submitting: joiningWaitlist, errorCode: waitlistErrorCode, join: joinWaitlist } = useWaitlistJoin()
const waitlistCounts = ref<Record<string, number>>({})
const waitlistJoinedIds = ref<Set<string>>(new Set())

watch(
  event,
  async (e) => {
    if (!e) return
    for (const tt of e.ticketTypes.filter((t) => t.soldOut)) {
      waitlistCounts.value[tt.id] = await fetchWaitlistCount(tt.id)
    }
  },
  { immediate: true }
)

async function handleJoinWaitlist(ticketTypeId: string) {
  if (!isAuthenticated.value) {
    router.push(`/connexion?redirect=${encodeURIComponent(route.fullPath)}`)
    return
  }
  const entry = await joinWaitlist(ticketTypeId, 1)
  if (entry) {
    waitlistJoinedIds.value.add(ticketTypeId)
    waitlistCounts.value[ticketTypeId] = (waitlistCounts.value[ticketTypeId] ?? 0) + 1
  }
}

// --- Avis --------------------------------------------------------------------
const eventIdRef = computed(() => event.value?.id ?? null)
const { reviews, stats: reviewStats } = useEventReviews(eventIdRef)
const { myReview, canReview, submitting: reviewSubmitting, errorMessage: reviewError, submit: submitReview } = useMyEventReview(eventIdRef)
const reviewDraftRating = ref(5)
const reviewDraftComment = ref('')
watch(myReview, (r) => {
  if (r) {
    reviewDraftRating.value = r.rating
    reviewDraftComment.value = r.comment || ''
  }
})
async function handleSubmitReview() {
  const ok = await submitReview(reviewDraftRating.value, reviewDraftComment.value)
  if (ok) reviewDraftComment.value = reviewDraftComment.value.trim()
}
const hasReviews = computed(() => !!reviewStats.value && reviewStats.value.review_count > 0)

// --- Plan de salle (optionnel, renseigné par l'organisateur) ---
const seatingPlanOpen = ref(false)
const seatingPlanIsImage = computed(() => /\.(png|jpe?g|webp|gif|avif)$/i.test(event.value?.seatingPlanUrl ?? ''))

// --- Description repliée au-delà d'une certaine longueur ---
const descriptionExpanded = ref(false)
const descriptionIsLong = computed(() => (event.value?.description?.length ?? 0) > 520)
const descriptionPreview = computed(() => {
  const d = event.value?.description ?? ''
  if (!descriptionIsLong.value || descriptionExpanded.value) return d
  return d.slice(0, 520).trimEnd() + '…'
})

// --- Mode « cause » (demande d'aide, cotisation...) --------------------------
// Une cause n'émet pas de billet : le contributeur reçoit un message de
// remerciement. Les libellés viennent de `event.cause.*` quand la clé existe,
// sinon on retombe sur le libellé « billetterie » classique.
const isCause = computed(() => !!event.value?.isCause)
function tk(key: string, params?: Record<string, unknown>): string {
  if (isCause.value && te(`event.cause.${key}`)) return t(`event.cause.${key}`, params ?? {})
  return t(`event.${key}`, params ?? {})
}

// --- Détails de chaque type de billet / de contribution, repliés par défaut ---
// La flèche est toujours proposée : sans description saisie par l'organisateur,
// on affiche un texte par défaut (prix, mode de remise, stock restant).
const expandedTicketDetails = ref<Record<string, boolean>>({})
function toggleTicketDetails(ticketTypeId: string) {
  expandedTicketDetails.value[ticketTypeId] = !expandedTicketDetails.value[ticketTypeId]
}
function ticketDescription(tt: { description?: string | null; price: number; remaining: number | null; soldOut: boolean }): string {
  const custom = tt.description?.trim()
  if (custom) return custom
  const lines: string[] = [tk('defaultTicketDesc')]
  if (tt.soldOut) lines.push(tk('defaultTicketSoldOut'))
  else if (tt.remaining !== null) lines.push(tk('defaultTicketRemaining', { n: tt.remaining }))
  return lines.join('\n')
}

// --- Sélection de billets ---
const quantities = ref<Record<string, number>>({})
// Champ « code promo » de la barre mobile (replié tant qu'on n'en a pas besoin)
const showMobilePromo = ref(false)

watch(
  event,
  (e) => {
    if (!e) return
    const initial: Record<string, number> = {}
    for (const tt of e.ticketTypes) initial[tt.id] = 0
    quantities.value = initial
  },
  { immediate: true }
)

function increment(ticketTypeId: string) {
  const tt = event.value?.ticketTypes.find((t) => t.id === ticketTypeId)
  if (!tt) return
  const current = quantities.value[ticketTypeId] ?? 0
  let cap = tt.remaining === null ? current + 1 : Math.min(tt.remaining, 10)
  // Limite globale de billets par acheteur pour cet événement (tous types
  // confondus), fixée par l'organisateur à la publication — voir
  // event.maxTicketsPerBuyer. Revalidée de toute façon en base (create_order).
  const maxPerBuyer = event.value?.maxTicketsPerBuyer
  if (maxPerBuyer != null) {
    const remainingAllowance = maxPerBuyer - totalQuantity.value
    cap = Math.min(cap, current + Math.max(remainingAllowance, 0))
  }
  if (current < cap) quantities.value[ticketTypeId] = current + 1
}

function decrement(ticketTypeId: string) {
  const current = quantities.value[ticketTypeId] ?? 0
  if (current > 0) quantities.value[ticketTypeId] = current - 1
}

// Niveau de demande d'un type de billet, calculé sur l'inventaire réel
// (quantity / sold_quantity). Le billet « Standard » est au minimum « Forte demande ».
type DemandLevel = 'almostGone' | 'high' | 'limited' | null
function demandLevel(tt: { name: string; remaining: number | null; quantity: number | null; soldOut: boolean }): DemandLevel {
  if (tt.soldOut) return null
  let level: DemandLevel = null
  if (tt.remaining !== null && tt.quantity && tt.quantity > 0) {
    const ratio = (tt.quantity - tt.remaining) / tt.quantity
    if (ratio >= 0.9 || (tt.remaining <= 10 && ratio >= 0.5)) level = 'almostGone'
    else if (ratio >= 0.6) level = 'high'
    else if (ratio >= 0.3) level = 'limited'
  }
  if (tt.name.trim().toLowerCase() === 'standard' && (level === null || level === 'limited')) level = 'high'
  return level
}
const DEMAND_STYLE: Record<'almostGone' | 'high' | 'limited', { cls: string; icon: string; key: string }> = {
  almostGone: { cls: 'bg-[#FFF3C4] text-[#8A6100]', icon: 'alert', key: 'almostGone' },
  high: { cls: 'bg-[#FDE2E8] text-[#C81E4B]', icon: 'trending', key: 'highDemand' },
  limited: { cls: 'bg-[#FFE6CC] text-[#B45309]', icon: 'clock', key: 'limitedPlaces' },
}

const cartLines = computed<CartLine[]>(() => {
  if (!event.value) return []
  return event.value.ticketTypes
    .map((tt) => ({ ticketTypeId: tt.id, name: tt.name, unitPrice: tt.price, quantity: quantities.value[tt.id] ?? 0 }))
    .filter((l) => l.quantity > 0)
})

const totalQuantity = computed(() => cartLines.value.reduce((sum, l) => sum + l.quantity, 0))
const totalPrice = computed(() => cartLines.value.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0))
const hasAvailableTickets = computed(() => (event.value?.ticketTypes.length ?? 0) > 0)

// Stock restant, tous types confondus (null si un type est illimité) — alimente le badge d'urgence.
const totalRemaining = computed<number | null>(() => {
  const types = event.value?.ticketTypes ?? []
  if (!types.length || types.some((tt) => tt.remaining === null)) return null
  return types.reduce((sum, tt) => sum + (tt.remaining ?? 0), 0)
})
const allSoldOut = computed(() => {
  const types = event.value?.ticketTypes ?? []
  return types.length > 0 && types.every((tt) => tt.soldOut)
})
const calendarLocation = computed(() =>
  [event.value?.locationName, event.value?.address, event.value?.city, event.value?.country].filter(Boolean).join(', ')
)

// Prix « à partir de » : le moins cher parmi les billets encore disponibles.
const minPrice = computed<number | null>(() => {
  const types = event.value?.ticketTypes ?? []
  if (!types.length) return null
  const pool = types.filter((tt) => !tt.soldOut)
  return Math.min(...(pool.length ? pool : types).map((tt) => tt.price))
})

function formatPrice(n: number) {
  return n === 0 ? t('event.free') : `${n.toLocaleString('fr-FR')} FCFA`
}

// --- Dates (dans la langue de l'interface) ---
const startDateObj = computed(() => (event.value ? new Date(event.value.startDate) : null))
const formattedDate = computed(() =>
  startDateObj.value ? startDateObj.value.toLocaleDateString(locale.value, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : ''
)
const formattedTime = computed(() =>
  startDateObj.value ? startDateObj.value.toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit' }) : ''
)
const dateParts = computed(() => {
  const d = startDateObj.value
  if (!d) return { weekday: '', day: '', month: '' }
  return {
    weekday: d.toLocaleDateString(locale.value, { weekday: 'short' }).replace('.', ''),
    day: String(d.getDate()).padStart(2, '0'),
    month: d.toLocaleDateString(locale.value, { month: 'short' }).replace('.', ''),
  }
})

// --- Lieu ---
const placeLine = computed(() =>
  [event.value?.address, event.value?.city, event.value?.country].filter(Boolean).join(', ')
)
const directionsUrl = computed(() => {
  const e = event.value
  if (!e) return ''
  const query = e.latitude != null && e.longitude != null ? `${e.latitude},${e.longitude}` : calendarLocation.value
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
})

// --- Favoris ---
async function handleFavoriteClick() {
  if (!event.value) return
  const ok = await toggleFavorite(event.value.id)
  if (!ok) router.push({ path: '/connexion', query: { redirect: route.fullPath } })
}

// --- Partage (cahier des charges §35 : le partage doit utiliser le lien
// personnalisé de l'événement — himra.babicho.com, ou l'URL de secours
// babicho.com/e/himra tant qu'aucun domaine perso n'est branché, §16). ---
const { buildEventUrl } = useEventPublicUrl()
// Lien partagé : le raccourci himra.babicho.com (ou /e/himra en secours, cf. §16).
const canonicalEventUrl = computed(() => (event.value ? buildEventUrl({ slug: event.value.slug }).url : ''))
// Lien indexé par Google : UNE seule URL par événement (évite le contenu
// dupliqué entre himra.babicho.com et babicho.com/e/himra).
const siteOrigin = useSiteOrigin()
const indexedEventUrl = computed(() => (event.value ? `${siteOrigin}/e/${encodeURIComponent(event.value.slug)}` : ''))

const shareCopied = ref(false)
async function handleShare() {
  const url = canonicalEventUrl.value
  const shareData = { title: event.value?.title, text: event.value?.title, url }
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share(shareData)
      return
    } catch {
      // annulé par l'utilisateur : pas d'erreur à afficher
      return
    }
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(url)
    shareCopied.value = true
    setTimeout(() => (shareCopied.value = false), 2000)
  }
}

const whatsappShareUrl = computed(
  () => `https://wa.me/?text=${encodeURIComponent(`${event.value?.title ?? ''} — ${canonicalEventUrl.value}`)}`
)
const facebookShareUrl = computed(
  () => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonicalEventUrl.value)}`
)

// --- Navigation dans la page ---
const sections = computed(() => {
  const list: { id: string; label: string; icon: string }[] = [{ id: 'billets', label: tk('ticketsLabel'), icon: 'ticket' }]
  if (event.value?.description || event.value?.organizerName) list.push({ id: 'apropos', label: t('event.navAbout'), icon: 'info' })
  list.push({ id: 'lieu', label: t('event.navVenue'), icon: 'pin' })
  if (isCause.value && event.value?.showContributions !== false) list.push({ id: 'contributions', label: t('event.navContributions'), icon: 'heart' })
  list.push({ id: 'avis', label: t('event.navReviews'), icon: 'heart' })
  return list
})

function scrollToSection(id: string) {
  if (id === 'contributions' && !contribOpen.value) toggleContrib()
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function goBack() {
  if (typeof window !== 'undefined' && window.history.length > 1) router.back()
  else router.push('/')
}

function goCategory(name: string) {
  homeFilters.value = { ...homeFilters.value, category: name }
  router.push('/evenements')
}

// --- Barre de réservation mobile : se retire quand on arrive au pied de page ---
// Disparaît / réapparaît en même temps que la barre de navigation du bas.
const scrolling = useScrolling()
const endSentinel = ref<HTMLElement | null>(null)
const nearEnd = ref(false)
let endObserver: IntersectionObserver | null = null
watch(
  endSentinel,
  (el) => {
    endObserver?.disconnect()
    endObserver = null
    if (!el || typeof IntersectionObserver === 'undefined') return
    endObserver = new IntersectionObserver(([entry]) => (nearEnd.value = entry.isIntersecting))
    endObserver.observe(el)
  },
  { flush: 'post' }
)
onBeforeUnmount(() => {
  endObserver?.disconnect()
  if (promoCheckTimer) clearTimeout(promoCheckTimer)
})
const showMobileBar = computed(() => hasAvailableTickets.value && !allSoldOut.value && !nearEnd.value)

// --- Réservation ---
// Le paiement réel (§24-26) se passe désormais sur /commande/[id] : cette
// page ne fait plus que réserver le stock puis y rediriger l'acheteur.
const orderError = ref<string | null>(null)

async function handleReserve() {
  orderError.value = null
  if (!isAuthenticated.value || !user.value) {
    router.push({ path: '/connexion', query: { redirect: route.fullPath } })
    return
  }
  if (!event.value || cartLines.value.length === 0) return

  // Seuls l'événement et les quantités partent au serveur : les prix, le stock
  // et le statut sont revalidés en base (voir server/api/orders.post.ts).
  const order = await createOrder(event.value.id, cartLines.value, promoPreview.value?.valid ? promoCodeInput.value : null, isCause.value ? contributionNote.value : null)
  if (order) {
    router.push(`/commande/${order.id}`)
    return
  }

  const code = errorCode.value ?? 'ORDER_FAILED'
  orderError.value = te(`event.orderErrors.${code}`) ? t(`event.orderErrors.${code}`, { n: errorLimit.value ?? '' }) : t('event.orderError')
  // Stock, fenêtre de vente ou statut changés depuis l'ouverture de la page : on rafraîchit.
  if (['SOLD_OUT', 'TICKET_NOT_AVAILABLE', 'SALE_NOT_OPEN', 'SALE_CLOSED', 'EVENT_NOT_AVAILABLE'].includes(code)) {
    refresh()
  }
}

// --- SEO & aperçus de partage (cahier des charges §36) ---------------------
// Ces balises sont présentes dans le HTML servi (rendu serveur) : c'est ce que
// lisent WhatsApp, Facebook, X et Google quand himra.babicho.com est partagé.
const seoDescription = computed(() => {
  const d = event.value?.description?.replace(/\s+/g, ' ').trim()
  return d ? d.slice(0, 160) : "Découvrez et achetez vos billets sur Babicho."
})
const seoImage = computed(() => toAbsoluteUrl(event.value?.coverImage, siteOrigin))

useSeoMeta({
  title: () => (event.value ? `${event.value.title} — Babicho` : 'Événement — Babicho'),
  description: () => seoDescription.value,
  ogTitle: () => event.value?.title,
  ogDescription: () => seoDescription.value,
  ogImage: () => seoImage.value,
  ogImageAlt: () => event.value?.title,
  ogUrl: () => indexedEventUrl.value || undefined,
  ogType: 'website',
  twitterTitle: () => event.value?.title,
  twitterDescription: () => seoDescription.value,
  twitterImage: () => seoImage.value,
  robots: () => (notFound.value ? 'noindex, nofollow' : 'index, follow'),
})

// Données structurées schema.org/Event (résultats enrichis Google).
const structuredData = computed(() => {
  const e = event.value
  if (!e) return null
  const prices = e.ticketTypes.map((tt) => tt.price)
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: e.title,
    description: seoDescription.value,
    startDate: e.startDate,
    ...(e.endDate ? { endDate: e.endDate } : {}),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    image: seoImage.value ? [seoImage.value] : undefined,
    url: indexedEventUrl.value,
    location: {
      '@type': 'Place',
      name: e.locationName || e.city,
      address: {
        '@type': 'PostalAddress',
        streetAddress: e.address || undefined,
        addressLocality: e.city || undefined,
        addressCountry: e.country || undefined,
      },
    },
    ...(e.organizerName ? { organizer: { '@type': 'Organization', name: e.organizerName } } : {}),
    ...(prices.length
      ? {
          offers: e.ticketTypes.map((tt) => ({
            '@type': 'Offer',
            name: tt.name,
            price: tt.price,
            priceCurrency: 'XOF',
            availability: tt.soldOut ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
            url: indexedEventUrl.value,
          })),
        }
      : {}),
  }
})

useHead({
  link: [{ rel: 'canonical', href: () => indexedEventUrl.value || undefined }],
  script: [
    {
      type: 'application/ld+json',
      // Le caractère « < » est échappé : une description ne peut pas refermer la balise script.
      innerHTML: () => (structuredData.value ? JSON.stringify(structuredData.value).replace(/</g, '\\u003c') : undefined),
    },
  ],
})


// ===================== Refonte « billet » : ajouts =====================
const endDateObj = computed(() => (event.value?.endDate ? new Date(event.value.endDate) : null))
const formattedEndTime = computed(() => {
  const s = startDateObj.value
  const e = endDateObj.value
  if (!s || !e || e <= s) return ''
  return e.toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit' })
})
const durationLabel = computed(() => {
  const s = startDateObj.value
  const e = endDateObj.value
  if (!s || !e) return ''
  const min = Math.round((e.getTime() - s.getTime()) / 60000)
  if (min <= 0 || min > 60 * 24 * 3) return ''
  const d = Math.floor(min / 1440)
  const h = Math.floor((min % 1440) / 60)
  const m = min % 60
  if (d > 0) return `${d} ${locale.value === 'fr' ? 'j' : 'd'}${h ? ` ${h} h` : ''}`
  if (h > 0) return `${h} h${m ? ` ${String(m).padStart(2, '0')}` : ''}`
  return `${m} min`
})

// Part de billets déjà vendus (barre de progression d'un type de billet).
function soldPercent(tt: { quantity: number | null; remaining: number | null }): number | null {
  if (!tt.quantity || tt.remaining == null) return null
  return Math.min(100, Math.max(0, Math.round(((tt.quantity - tt.remaining) / tt.quantity) * 100)))
}

// Répartition des notes (calculée sur les avis chargés).
const ratingBars = computed(() => {
  const list = reviews.value ?? []
  const total = list.length || 1
  return [5, 4, 3, 2, 1].map((n) => {
    const c = list.filter((r: any) => r.rating === n).length
    return { n, c, pct: Math.round((c / total) * 100) }
  })
})

// Itinéraire : Waze en plus de Google Maps, et copie de l'adresse.
const wazeUrl = computed(() => {
  const e = event.value
  if (!e) return ''
  return e.latitude != null && e.longitude != null
    ? `https://waze.com/ul?ll=${e.latitude},${e.longitude}&navigate=yes`
    : `https://waze.com/ul?q=${encodeURIComponent(calendarLocation.value)}&navigate=yes`
})
const addressCopied = ref(false)
async function copyAddress() {
  try {
    await navigator.clipboard.writeText([event.value?.locationName, placeLine.value].filter(Boolean).join(', '))
    addressCopied.value = true
    setTimeout(() => (addressCopied.value = false), 2000)
  } catch {
    /* presse-papiers indisponible : rien à afficher */
  }
}

// --- Barre d'onglets collante : section active + CTA compact quand le hero est sorti ---
const sectionsWithFaq = computed(() => {
  const list = [...sections.value]
  return list
})
const activeSection = ref('billets')
let spyObserver: IntersectionObserver | null = null
function setupSpy() {
  spyObserver?.disconnect()
  spyObserver = null
  if (typeof IntersectionObserver === 'undefined') return
  spyObserver = new IntersectionObserver(
    (entries) => {
      for (const en of entries) if (en.isIntersecting) activeSection.value = en.target.id
    },
    { rootMargin: '-30% 0px -60% 0px' }
  )
  for (const s of sectionsWithFaq.value) {
    const el = document.getElementById(s.id)
    if (el) spyObserver.observe(el)
  }
}
watch(event, () => nextTick(setupSpy), { flush: 'post' })

const heroSentinel = ref<HTMLElement | null>(null)
const heroOut = ref(false)
let heroObserver: IntersectionObserver | null = null
watch(
  heroSentinel,
  (el) => {
    heroObserver?.disconnect()
    heroObserver = null
    if (!el || typeof IntersectionObserver === 'undefined') return
    heroObserver = new IntersectionObserver(([en]) => (heroOut.value = !en.isIntersecting && en.boundingClientRect.top < 0))
    heroObserver.observe(el)
  },
  { flush: 'post' }
)

// Le header du site se cache pendant le scroll : la barre d'onglets se cale dessous
// (ou tout en haut quand il est masqué).
const tabsTop = ref(0)
let tabsTimer: ReturnType<typeof setTimeout> | null = null
function syncTabsTop() {
  const h = document.querySelector('header')?.getBoundingClientRect()
  tabsTop.value = h && h.bottom > 1 ? Math.round(h.bottom) : 0
}
function onScrollTabs() {
  syncTabsTop()
  if (tabsTimer) clearTimeout(tabsTimer)
  tabsTimer = setTimeout(syncTabsTop, 850)
}
onMounted(() => {
  syncTabsTop()
  window.addEventListener('scroll', onScrollTabs, { passive: true })
  nextTick(setupSpy)
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScrollTabs)
  if (tabsTimer) clearTimeout(tabsTimer)
  spyObserver?.disconnect()
  heroObserver?.disconnect()
})

// Questions fréquentes (billetterie uniquement)
const faqItems = computed(() => [
  { q: t('event.faq1q'), a: t('event.faq1a') },
  { q: t('event.faq2q'), a: event.value?.allowTicketTransfers === false ? t('event.faq2aNo') : t('event.faq2aYes') },
  { q: t('event.faq3q'), a: t('event.faq3a') },
  { q: t('event.faq4q'), a: t('event.faq4a'), link: '/remboursement', linkLabel: t('event.faqRefundLink') },
])
const paymentChips = ['Wave', 'Orange Money', 'MTN MoMo', 'Moov Money', 'Visa / Mastercard']

// Styles partagés
const h2Class = 'flex items-center gap-3 font-display text-xl font-extrabold tracking-tight text-tikeo-black md:text-2xl'
const pill =
  'flex h-11 shrink-0 items-center gap-2 border border-tikeo-border bg-tikeo-surface px-4 text-sm font-semibold text-tikeo-black transition-colors duration-200 hover:border-tikeo-ink active:scale-[0.97] dark:hover:border-tikeo-orange'
const stepBtn =
  'flex h-10 w-10 items-center justify-center border transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-30'
</script>

<template>
  <div class="bg-tikeo-surface-alt">
    <!-- ============================ Chargement ============================ -->
    <div v-if="loading">
      <div class="bg-tikeo-ink">
        <div class="mx-auto grid max-w-tikeo-container gap-8 px-4 py-8 md:px-6 lg:grid-cols-[460px_1fr] lg:gap-12">
          <div class="aspect-square animate-pulse bg-white/10" />
          <div class="space-y-4">
            <div class="h-6 w-40 animate-pulse bg-white/10" />
            <div class="h-14 w-3/4 animate-pulse bg-white/10" />
            <div class="grid gap-3 sm:grid-cols-2">
              <div class="h-24 animate-pulse bg-white/10" />
              <div class="h-24 animate-pulse bg-white/10" />
            </div>
            <div class="h-20 w-2/3 animate-pulse bg-white/10" />
          </div>
        </div>
      </div>
      <div class="mx-auto max-w-tikeo-container space-y-4 px-4 py-8 md:px-6">
        <div class="h-32 animate-pulse bg-tikeo-border" />
        <div class="h-32 animate-pulse bg-tikeo-border" />
      </div>
    </div>

    <!-- ============================ Introuvable ============================ -->
    <div v-else-if="notFound || error" class="mx-auto flex max-w-2xl flex-col items-center gap-3 px-6 py-24 text-center">
      <img src="/logo-babicho.png" alt="Babicho" class="h-10 w-auto" />
      <h1 class="mt-3 font-display text-2xl font-extrabold text-tikeo-black md:text-3xl">{{ t('event.notFoundTitle') }}</h1>
      <p class="text-sm text-tikeo-gray-text">{{ t('event.notFoundDesc') }}</p>
      <NuxtLink to="/" class="btn-ink mt-3 !h-12 !px-7">{{ t('event.backHome') }}</NuxtLink>
    </div>

    <!-- ============================ Contenu ============================ -->
    <template v-else-if="event">
      <!-- ================= HERO « billet » ================= -->
      <section class="relative isolate overflow-hidden bg-tikeo-ink text-white">
        <!-- Perforation à gauche -->
        <div
          class="pointer-events-none absolute inset-y-0 left-0 hidden w-3 lg:block"
          style="background-image: radial-gradient(circle, rgb(var(--tikeo-surface-alt)) 3px, transparent 3.5px); background-size: 12px 18px; background-position: -6px 0"
          aria-hidden="true"
        />

        <div class="mx-auto max-w-tikeo-container px-4 pb-10 pt-5 md:px-6 md:pb-12 md:pt-7">
          <!-- Retour (mobile) / fil d'Ariane (ordinateur) -->
          <div>
            <button type="button" class="flex h-10 items-center gap-1.5 border border-white/25 pl-2.5 pr-4 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-tikeo-ink md:hidden" @click="goBack">
              <AppIcon name="chevron-left" class="h-4 w-4" :stroke="2.4" />
              {{ t('common.back') }}
            </button>
            <nav class="hidden items-center gap-2 text-sm text-white/60 md:flex" aria-label="Fil d'Ariane">
              <NuxtLink to="/" class="transition-colors hover:text-white">{{ t('nav.home') }}</NuxtLink>
              <AppIcon name="chevron-right" class="h-3.5 w-3.5 shrink-0" :stroke="2.4" />
              <template v-if="event.category">
                <button type="button" class="transition-colors hover:text-white" @click="goCategory(event.category!)">{{ event.category }}</button>
                <AppIcon name="chevron-right" class="h-3.5 w-3.5 shrink-0" :stroke="2.4" />
              </template>
              <span class="max-w-md truncate font-semibold text-white">{{ event.title }}</span>
            </nav>
          </div>

          <div class="mt-5 grid items-stretch gap-6 lg:grid-cols-2 lg:gap-10">
            <!-- Image : prend toute la hauteur des infos -->
            <div class="relative min-h-[16rem] overflow-hidden bg-tikeo-ink-soft sm:min-h-[20rem]">
              <img :src="event.coverImage" :alt="event.title" fetchpriority="high" decoding="async" class="absolute inset-0 h-full w-full object-cover" />

              <div class="absolute left-4 top-4 flex min-w-[3.4rem] flex-col items-center bg-white px-3 py-2 leading-none text-tikeo-ink shadow-md">
                <span class="text-[11px] font-semibold capitalize text-tikeo-ink/70">{{ dateParts.weekday }}</span>
                <span class="mt-1 font-display text-3xl font-extrabold">{{ dateParts.day }}</span>
                <span class="mt-0.5 text-xs font-semibold capitalize text-tikeo-ink/70">{{ dateParts.month }}</span>
              </div>

              <button
                type="button"
                class="absolute right-4 top-4 flex h-11 w-11 items-center justify-center bg-white text-tikeo-ink shadow-md transition-transform active:scale-90"
                :aria-pressed="isFavorite(event.id)"
                :aria-label="isFavorite(event.id) ? t('home.removeFavorite') : t('event.favorite')"
                @click="handleFavoriteClick"
              >
                <svg class="h-5 w-5" :class="isFavorite(event.id) ? 'fill-[#FF7A00] text-[#FF7A00]' : 'fill-none'" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 21s-7.5-4.6-10-9.1C.5 8.6 2.3 5 6 5c2 0 3.4 1.1 4 2.2C10.6 6.1 12 5 14 5c3.7 0 5.5 3.6 4 6.9-2.5 4.5-10 9.1-10 9.1z" />
                </svg>
              </button>
            </div>

            <!-- Infos essentielles -->
            <div class="flex min-w-0 flex-col gap-5">
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <span v-if="event.verified" class="inline-flex items-center gap-1.5 border border-[#FF7A00]/50 bg-[#FF7A00]/15 px-3 py-1 text-xs font-bold text-[#FFB066]">
                    <AppIcon name="check" class="h-3.5 w-3.5" :stroke="3" />{{ t('home.verified') }}
                  </span>
                  <button v-if="event.category" type="button" class="border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-white hover:text-tikeo-ink" @click="goCategory(event.category!)">{{ event.category }}</button>
                </div>
                <h1 class="mt-3 font-display text-3xl font-extrabold leading-[1.08] tracking-tight text-white md:text-4xl">{{ event.title }}</h1>
                <p v-if="event.organizerName" class="mt-2 flex items-center gap-1.5 text-sm text-white/65">
                  {{ t('event.publishedBy') }} <span class="font-bold text-white">{{ event.organizerName }}</span>
                  <AppIcon v-if="event.verified" name="shield-check" class="h-4 w-4 text-[#FFB066]" :aria-label="t('home.verified')" />
                </p>
              </div>

              <ul class="space-y-3">
                <li class="flex items-start gap-3.5">
                  <span class="flex h-11 w-11 shrink-0 items-center justify-center bg-[#FF7A00]/15 text-[#FF9A3D]"><AppIcon name="calendar" class="h-5 w-5" /></span>
                  <div class="min-w-0">
                    <p class="font-display text-base font-bold capitalize leading-snug text-white">{{ formattedDate }}</p>
                    <p class="text-sm text-white/65">{{ formattedTime }}<template v-if="formattedEndTime"> – {{ formattedEndTime }}</template></p>
                  </div>
                </li>
                <li class="flex items-start gap-3.5">
                  <span class="flex h-11 w-11 shrink-0 items-center justify-center bg-[#FF7A00]/15 text-[#FF9A3D]"><AppIcon name="pin" class="h-5 w-5" /></span>
                  <div class="min-w-0">
                    <p class="font-display text-base font-bold leading-snug text-white">{{ event.locationName || event.city }}</p>
                    <p class="break-words text-sm text-white/65">{{ placeLine }}</p>
                  </div>
                </li>
              </ul>

              <!-- Prix + bouton, toujours en bas : aligné avec le bas de l'image -->
              <div class="mt-auto flex flex-wrap items-end justify-between gap-4 border-t border-dashed border-white/25 pt-5">
                <div v-if="minPrice !== null" class="leading-none">
                  <span class="block text-[11px] font-bold uppercase tracking-wider text-white/55">{{ t('home.from') }}</span>
                  <span class="mt-1 block font-display text-3xl font-extrabold text-white">
                    <template v-if="minPrice === 0">{{ t('event.free') }}</template>
                    <template v-else>{{ minPrice.toLocaleString('fr-FR') }} <span class="text-sm font-semibold text-white/60">FCFA</span></template>
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <button type="button" class="flex h-12 w-12 items-center justify-center border border-white/25 text-white transition-colors hover:bg-white hover:text-tikeo-ink" :aria-label="t('event.share')" @click="handleShare">
                    <AppIcon :name="shareCopied ? 'check' : 'share'" class="h-5 w-5" :stroke="2" />
                  </button>
                  <button v-if="hasAvailableTickets" type="button" class="btn-brand group/cta !h-12 !px-7" @click="scrollToSection('billets')">
                    {{ allSoldOut ? tk('joinWaitlist') : tk('selectTickets') }}
                    <AppIcon name="arrow-right" class="h-5 w-5 transition-transform duration-200 group-hover/cta:translate-x-1" :stroke="2.4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div ref="heroSentinel" class="h-px" aria-hidden="true" />

      <!-- ================= Corps de page ================= -->
      <div class="mx-auto max-w-tikeo-container px-4 pb-10 pt-8 md:px-6 md:pt-10">
        <div class="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-10">
          <div class="min-w-0 space-y-10 md:space-y-12">
            <!-- ============ Billets ============ -->
            <section id="billets" class="scroll-mt-32">
              <CauseGoalProgress v-if="isCause && event.goalAmount" :slug="event.slug" />
              <div class="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div class="max-w-xl">
                  <h2 :class="h2Class"><span class="h-7 w-1.5 shrink-0 bg-[#FF7A00]" aria-hidden="true" />{{ tk('chooseTickets') }}</h2>
                  <p class="mt-1.5 text-sm text-tikeo-gray-text">{{ tk('chooseTicketsSub') }}</p>
                </div>
                <button
                  v-if="event.seatingPlanUrl && !isCause"
                  type="button"
                  class="inline-flex h-10 items-center gap-2 border border-tikeo-border bg-tikeo-surface px-4 text-sm font-semibold text-tikeo-black transition-colors hover:border-tikeo-ink dark:hover:border-[#FF7A00]"
                  @click="seatingPlanOpen = true"
                >
                  <AppIcon name="map" class="h-[18px] w-[18px]" />
                  {{ t('event.seatingPlan') }}
                </button>
              </div>

              <p v-if="event.maxTicketsPerBuyer && !isCause" class="mb-4 flex items-center gap-2 border-l-4 border-[#FF7A00] bg-[#FF7A00]/10 px-4 py-2.5 text-sm text-tikeo-black">
                <AppIcon name="info" class="h-4 w-4 shrink-0 text-[rgb(var(--tikeo-orange-strong))]" />
                {{ t('event.maxTicketsPerBuyerNotice', { n: event.maxTicketsPerBuyer }) }}
              </p>

              <p v-if="!hasAvailableTickets" class="border border-dashed border-tikeo-border bg-tikeo-surface p-10 text-center text-sm text-tikeo-gray-text">{{ tk('noTickets') }}</p>

              <div v-else class="space-y-4">
                <article
                  v-for="tt in event.ticketTypes"
                  :key="tt.id"
                  class="relative overflow-hidden border bg-tikeo-surface transition-all duration-200"
                  :class="
                    (quantities[tt.id] ?? 0) > 0
                      ? 'border-[#FF7A00] shadow-[0_0_0_1px_#FF7A00]'
                      : 'border-tikeo-border shadow-card hover:border-tikeo-ink/40 dark:hover:border-white/30'
                  "
                >
                  <span class="absolute inset-y-0 left-0 w-1.5" :class="tt.soldOut ? 'bg-tikeo-border' : (quantities[tt.id] ?? 0) > 0 ? 'bg-[#FF7A00]' : 'bg-tikeo-ink dark:bg-white/30'" aria-hidden="true" />

                  <div class="grid sm:grid-cols-[minmax(0,1fr)_12rem]">
                    <!-- Partie gauche : informations -->
                    <div class="min-w-0 p-5 pl-6 md:p-6 md:pl-8">
                      <div v-if="tt.soldOut || demandLevel(tt)" class="mb-2 flex flex-wrap items-center gap-2">
                        <span v-if="tt.soldOut" class="bg-tikeo-error/10 px-2.5 py-0.5 text-[11px] font-bold uppercase text-tikeo-error">{{ tk('soldOut') }}</span>
                        <span v-else class="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold" :class="DEMAND_STYLE[demandLevel(tt)!].cls">
                          <AppIcon :name="DEMAND_STYLE[demandLevel(tt)!].icon" class="h-3.5 w-3.5" :stroke="2.4" />{{ tk(DEMAND_STYLE[demandLevel(tt)!].key) }}
                        </span>
                      </div>
                      <h3 class="font-display text-xl font-extrabold leading-tight tracking-tight text-tikeo-black" :class="tt.soldOut ? 'opacity-50' : ''">{{ tt.name }}</h3>
                      <p class="mt-1.5 font-display text-2xl font-extrabold leading-none text-tikeo-black" :class="tt.soldOut ? 'opacity-50' : ''">
                        <template v-if="tt.price === 0">{{ t('event.free') }}</template>
                        <template v-else>{{ tt.price.toLocaleString('fr-FR') }} <span class="text-sm font-semibold text-tikeo-gray-text">FCFA</span></template>
                      </p>

                      <p v-if="!tt.soldOut && tt.remaining !== null && tt.remaining <= 10" class="mt-2 text-xs font-bold text-[rgb(var(--tikeo-orange-strong))]">{{ tk('remaining', { n: tt.remaining }) }}</p>

                      <!-- Détails (dépliables) -->
                      <button
                        type="button"
                        class="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-tikeo-blue hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF7A00] dark:text-[#8FBBF2]"
                        :aria-expanded="!!expandedTicketDetails[tt.id]"
                        :aria-controls="`ticket-desc-${tt.id}`"
                        @click="toggleTicketDetails(tt.id)"
                      >
                        {{ expandedTicketDetails[tt.id] ? tk('hideTicketDetails') : tk('ticketDetails') }}
                        <AppIcon name="chevron-down" class="h-4 w-4 transition-transform duration-300" :class="expandedTicketDetails[tt.id] ? 'rotate-180' : ''" :stroke="2.4" />
                      </button>
                      <div
                        :id="`ticket-desc-${tt.id}`"
                        class="grid transition-[grid-template-rows,opacity] duration-300 ease-out"
                        :class="expandedTicketDetails[tt.id] ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'"
                      >
                        <div class="overflow-hidden">
                          <p class="mt-2 whitespace-pre-line border-l-2 border-tikeo-border bg-tikeo-surface-alt px-3.5 py-3 text-sm leading-relaxed text-tikeo-gray-text">{{ ticketDescription(tt) }}</p>
                        </div>
                      </div>

                      <!-- Liste d'attente (billet épuisé) -->
                      <div v-if="tt.soldOut" class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                        <button
                          v-if="!waitlistJoinedIds.has(tt.id)"
                          type="button"
                          class="btn-secondary !h-10 !py-0 text-sm"
                          :disabled="joiningWaitlist"
                          @click="handleJoinWaitlist(tt.id)"
                        >
                          {{ tk('joinWaitlist') }}
                        </button>
                        <span v-else class="inline-flex items-center gap-1.5 text-sm font-bold text-tikeo-success"><AppIcon name="check" class="h-4 w-4" :stroke="2.6" />{{ t('event.waitlistJoined') }}</span>
                        <span v-if="waitlistCounts[tt.id]" class="text-xs text-tikeo-gray-text">{{ t('event.waitlistCount', { n: waitlistCounts[tt.id] }) }}</span>
                        <span v-if="waitlistErrorCode" class="text-xs text-tikeo-error">{{ te(`event.waitlistErrors.${waitlistErrorCode}`) ? t(`event.waitlistErrors.${waitlistErrorCode}`) : '' }}</span>
                      </div>
                    </div>

                    <!-- Quantité -->
                    <div class="flex items-center justify-between gap-4 border-t border-tikeo-border px-6 py-4 sm:justify-center sm:border-l sm:border-t-0">
                      <div v-if="!tt.soldOut" class="flex items-center gap-2.5">
                        <button
                          type="button"
                          :class="[stepBtn, 'border-tikeo-border bg-tikeo-surface text-tikeo-black enabled:hover:border-tikeo-ink']"
                          :disabled="(quantities[tt.id] ?? 0) === 0"
                          :aria-label="'− ' + tt.name"
                          @click="decrement(tt.id)"
                        >
                          <AppIcon name="minus" class="h-4 w-4" :stroke="2.6" />
                        </button>
                        <span class="w-8 text-center font-display text-2xl font-extrabold tabular-nums text-tikeo-black" aria-live="polite">{{ quantities[tt.id] ?? 0 }}</span>
                        <button
                          type="button"
                          :class="[stepBtn, 'border-tikeo-ink bg-tikeo-ink text-white enabled:hover:border-[#FF7A00] enabled:hover:bg-[#FF7A00] enabled:hover:text-tikeo-ink dark:border-[#FF7A00] dark:bg-[#FF7A00] dark:text-tikeo-ink']"
                          :aria-label="'+ ' + tt.name"
                          @click="increment(tt.id)"
                        >
                          <AppIcon name="plus" class="h-4 w-4" :stroke="2.6" />
                        </button>
                      </div>
                      <span v-else class="text-sm font-bold uppercase text-tikeo-error">{{ tk('soldOut') }}</span>
                    </div>
                  </div>
                </article>
              </div>
            </section>

            <!-- ============ À propos ============ -->
            <section v-if="event.description" id="apropos" class="scroll-mt-32">
              <h2 :class="h2Class"><span class="h-7 w-1.5 shrink-0 bg-[#FF7A00]" aria-hidden="true" />{{ t('event.descriptionLabel') }}</h2>

              <div v-if="event.description" class="mt-5 border border-tikeo-border bg-tikeo-surface p-5 shadow-card md:p-7">
                <p class="whitespace-pre-line text-[15px] leading-[1.8] text-tikeo-black/80 md:text-base dark:text-tikeo-gray-text">{{ descriptionPreview }}</p>
                <button
                  v-if="descriptionIsLong"
                  type="button"
                  class="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-tikeo-blue hover:underline dark:text-[#8FBBF2]"
                  @click="descriptionExpanded = !descriptionExpanded"
                >
                  {{ descriptionExpanded ? t('event.readLess') : t('event.readMore') }}
                  <AppIcon name="chevron-down" class="h-4 w-4 transition-transform" :class="descriptionExpanded ? 'rotate-180' : ''" :stroke="2.4" />
                </button>
              </div>

            </section>

            <!-- ============ Lieu ============ -->
            <section id="lieu" class="scroll-mt-32">
              <h2 :class="h2Class"><span class="h-7 w-1.5 shrink-0 bg-[#FF7A00]" aria-hidden="true" />{{ t('event.venueTitle') }}</h2>

              <div class="mt-5 overflow-hidden border border-tikeo-border bg-tikeo-surface shadow-card">
                <div class="flex flex-wrap items-center gap-4 p-5">
                  <span class="flex h-11 w-11 shrink-0 items-center justify-center bg-tikeo-ink text-white dark:bg-[#FF7A00] dark:text-tikeo-ink"><AppIcon name="pin" class="h-5 w-5" /></span>
                  <div class="min-w-0 flex-1">
                    <p class="font-display text-base font-bold leading-tight text-tikeo-black">{{ event.locationName || event.city }}</p>
                    <p class="mt-0.5 break-words text-sm text-tikeo-gray-text">{{ placeLine }}</p>
                  </div>
                  <a :href="directionsUrl" target="_blank" rel="noopener" class="btn-ink !h-10 max-sm:w-full">
                    {{ t('event.directions') }}
                    <AppIcon name="arrow-up-right" class="h-4 w-4" :stroke="2.4" />
                  </a>
                </div>
                <VenueMap
                  v-if="event.latitude != null && event.longitude != null"
                  class="!border-x-0 !border-b-0"
                  :latitude="event.latitude"
                  :longitude="event.longitude"
                  :label="event.locationName || event.title"
                />
              </div>
            </section>

            <!-- ============ Contributions (causes solidaires) ============ -->
            <section v-if="isCause && event.showContributions !== false" id="contributions" class="scroll-mt-32">
              <h2 class="m-0">
                <button
                  type="button"
                  :class="[h2Class, 'w-full text-left']"
                  :aria-expanded="contribOpen"
                  aria-controls="contributions-panel"
                  @click="toggleContrib"
                >
                  <span class="h-7 w-1.5 shrink-0 bg-[#FF7A00]" aria-hidden="true" />
                  <span class="min-w-0 flex-1">{{ t('event.contributionsTitle') }}</span>
                  <AppIcon name="arrow-down" class="h-5 w-5 shrink-0 transition-transform duration-200 motion-reduce:transition-none" :class="contribOpen ? 'rotate-180' : ''" :stroke="2.4" />
                </button>
              </h2>
              <div v-if="contribEverOpened" v-show="contribOpen" id="contributions-panel" class="mt-4">
                <ContributionsList :slug="event.slug" />
              </div>
            </section>

            <!-- ============ Avis ============ -->
            <section v-if="hasReviews || (isAuthenticated && canReview)" id="avis" class="scroll-mt-32">
              <h2 :class="h2Class"><span class="h-7 w-1.5 shrink-0 bg-[#FF7A00]" aria-hidden="true" />{{ t('event.reviewsTitle') }}</h2>

              <div class="mt-5 space-y-3">
                <p v-if="hasReviews" class="flex items-center gap-2">
                  <span class="font-display text-2xl font-extrabold text-tikeo-black">{{ reviewStats!.average_rating }}</span>
                  <AppIcon name="star" class="h-5 w-5 fill-current text-[#FF7A00]" />
                  <span class="text-sm text-tikeo-gray-text">{{ t('event.reviewsCount', { n: reviewStats!.review_count }) }}</span>
                </p>

                <form v-if="isAuthenticated && canReview" class="border border-tikeo-border bg-tikeo-surface p-5 shadow-card md:p-6" @submit.prevent="handleSubmitReview">
                  <p class="mb-2 font-display text-base font-bold text-tikeo-black">{{ myReview ? t('event.editYourReview') : t('event.leaveReview') }}</p>
                  <div class="mb-3 flex gap-1">
                    <button
                      v-for="n in 5"
                      :key="n"
                      type="button"
                      class="p-0.5 transition-transform active:scale-90"
                      :class="n <= reviewDraftRating ? 'text-[#FF7A00]' : 'text-tikeo-border'"
                      :aria-label="`${n} / 5`"
                      @click="reviewDraftRating = n"
                    ><AppIcon name="star" class="h-8 w-8" :class="n <= reviewDraftRating ? 'fill-current' : ''" /></button>
                  </div>
                  <textarea v-model="reviewDraftComment" rows="3" maxlength="2000" :placeholder="t('event.reviewCommentPlaceholder')" class="input-field" />
                  <p v-if="reviewError" class="mt-1 text-xs text-tikeo-error">{{ reviewError }}</p>
                  <button type="submit" class="btn-ink mt-3" :disabled="reviewSubmitting">
                    {{ reviewSubmitting ? t('event.reviewSubmitting') : t('event.reviewSubmit') }}
                  </button>
                </form>

                <p v-if="!reviews.length" class="border border-dashed border-tikeo-border bg-tikeo-surface p-8 text-center text-sm text-tikeo-gray-text">{{ t('event.noReviews') }}</p>
                <article v-for="r in reviews" :key="r.id" class="border border-tikeo-border bg-tikeo-surface p-5 shadow-card">
                  <div class="flex items-center gap-3">
                    <span class="flex h-10 w-10 shrink-0 items-center justify-center bg-tikeo-ink text-sm font-bold text-white dark:bg-[#FF7A00] dark:text-tikeo-ink">
                      {{ (r.author?.full_name || t('event.anonymousReviewer')).slice(0, 1).toUpperCase() }}
                    </span>
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-bold text-tikeo-black">{{ r.author?.full_name || t('event.anonymousReviewer') }}</p>
                      <p class="flex gap-0.5 text-[#FF7A00]" :aria-label="`${r.rating} / 5`"><AppIcon v-for="n in 5" :key="n" name="star" class="h-4 w-4" :class="n <= r.rating ? 'fill-current' : 'opacity-30'" /></p>
                    </div>
                  </div>
                  <p v-if="r.comment" class="mt-3 text-sm leading-relaxed text-tikeo-gray-text">{{ r.comment }}</p>
                  <div v-if="r.organizer_reply" class="mt-3 border-l-4 border-[#FF7A00] bg-tikeo-surface-alt p-3 text-sm">
                    <p class="font-bold text-tikeo-black">{{ t('event.organizerReplyLabel') }}</p>
                    <p class="mt-0.5 text-tikeo-gray-text">{{ r.organizer_reply }}</p>
                  </div>
                </article>
              </div>
            </section>

          </div>

          <!-- ============ Récapitulatif « reçu » (ordinateur, collant) ============ -->
          <aside class="mt-10 hidden transition-[top] duration-300 ease-out lg:sticky lg:mt-0 lg:block" :style="{ top: tabsTop + 16 + 'px' }">
            <div class="relative overflow-hidden border border-tikeo-border bg-tikeo-surface shadow-[0_24px_50px_-24px_rgba(14,34,64,0.4)]">
              <!-- En-tête encre -->
              <div class="relative bg-tikeo-ink px-5 py-4 text-white">
                <div class="absolute inset-x-0 top-0 h-1 bg-tikeo-brand" aria-hidden="true" />
                <div class="flex items-center gap-3 pt-1">
                  <div class="min-w-0">
                    <h2 class="font-display text-lg font-extrabold leading-tight">{{ tk('yourSelection') }}</h2>
                    <p class="truncate text-xs text-white/65">{{ event.title }}</p>
                  </div>
                </div>
              </div>

              <div class="p-5">
                <template v-if="totalQuantity === 0">
                  <div v-if="minPrice !== null" class="mb-3 leading-tight">
                    <span class="block text-xs text-tikeo-gray-text">{{ t('home.from') }}</span>
                    <span class="font-display text-3xl font-extrabold text-tikeo-black">{{ formatPrice(minPrice) }}</span>
                  </div>
                  <p class="text-sm text-tikeo-gray-text">{{ tk('selectToSeeSummary') }}</p>
                  <button v-if="hasAvailableTickets" type="button" class="btn-brand mt-4 w-full" @click="scrollToSection('billets')">
                    {{ allSoldOut ? tk('joinWaitlist') : tk('selectTickets') }}
                    <AppIcon name="arrow-down" class="h-4 w-4" :stroke="2.4" />
                  </button>
                </template>

                <template v-else>
                  <div class="space-y-3">
                    <div v-for="line in cartLines" :key="line.ticketTypeId" class="flex items-start justify-between gap-3 text-sm">
                      <span class="min-w-0 text-tikeo-black"><span class="font-bold">{{ line.quantity }} ×</span> {{ line.name }}<span class="block text-xs text-tikeo-gray-text">{{ formatPrice(line.unitPrice) }}</span></span>
                      <span class="shrink-0 font-semibold text-tikeo-black">{{ formatPrice(line.unitPrice * line.quantity) }}</span>
                    </div>
                  </div>

                  <div v-if="isAuthenticated" class="mt-4">
                    <input
                      v-model="promoCodeInput"
                      type="text"
                      maxlength="30"
                      :placeholder="t('event.promoCodePlaceholder')"
                      class="input-field text-sm uppercase"
                    />
                    <p v-if="promoChecking" class="mt-1 text-xs text-tikeo-gray-text">{{ t('event.promoChecking') }}</p>
                    <p v-else-if="promoPreview?.valid" class="mt-1 text-xs font-bold text-tikeo-success">
                      {{ t('event.promoApplied', { discount: promoDiscountPreviewLabel }) }}
                    </p>
                    <p v-else-if="promoPreview && !promoPreview.valid" class="mt-1 text-xs text-tikeo-error">
                      {{ te(`event.promoErrors.${promoPreview.error}`) ? t(`event.promoErrors.${promoPreview.error}`) : t('event.promoErrors.PROMO_INVALID') }}
                    </p>
                  </div>

                  <div v-if="isAuthenticated && isCause" class="mt-4">
                    <label for="contribution-note" class="mb-1 block text-xs font-semibold text-tikeo-gray-text">{{ t('event.contributionNoteLabel') }}</label>
                    <textarea
                      id="contribution-note"
                      v-model="contributionNote"
                      rows="2"
                      maxlength="140"
                      :placeholder="t('event.contributionNotePlaceholder')"
                      class="input-field resize-none text-sm"
                    />
                    <p class="mt-1 text-[11px] text-tikeo-gray-text">{{ t('event.contributionNoteHint', { n: contributionNote.length }) }}</p>
                  </div>

                  <div class="mt-5 flex items-end justify-between border-t border-dashed border-tikeo-border pt-4">
                    <span class="text-sm font-semibold text-tikeo-gray-text">{{ t('event.total') }}</span>
                    <span class="font-display text-3xl font-extrabold leading-none text-tikeo-black">{{ formatPrice(totalPrice) }}</span>
                  </div>

                  <p v-if="orderError" class="mt-3 bg-tikeo-error/10 px-3 py-2 text-xs font-medium text-tikeo-error">{{ orderError }}</p>

                  <button type="button" class="btn-brand mt-4 w-full" :disabled="totalQuantity === 0 || submitting" @click="handleReserve">
                    <span v-if="submitting">{{ tk('reserving') }}</span>
                    <span v-else-if="!isAuthenticated">{{ tk('loginToBook') }}</span>
                    <span v-else>{{ tk('reserveButton') }}</span>
                  </button>
                </template>
              </div>

              <!-- Perforation + réassurance -->
              <div class="relative border-t border-dashed border-tikeo-border bg-tikeo-surface-alt">
                <span class="absolute -left-2.5 -top-2.5 h-5 w-5 rounded-full bg-tikeo-surface-alt" aria-hidden="true" />
                <span class="absolute -right-2.5 -top-2.5 h-5 w-5 rounded-full bg-tikeo-surface-alt" aria-hidden="true" />
                <ul class="space-y-3 px-5 py-4 text-sm">
                  <li class="flex items-center gap-3 text-tikeo-black"><AppIcon name="card" class="h-5 w-5 shrink-0 text-[rgb(var(--tikeo-orange-strong))]" />{{ t('trustStats.badgePaymentTitle') }}</li>
                  <li class="flex items-center gap-3 text-tikeo-black"><AppIcon name="qr" class="h-5 w-5 shrink-0 text-[rgb(var(--tikeo-orange-strong))]" />{{ t('trustStats.badgeQrTitle') }}</li>
                  <li class="flex items-center gap-3 text-tikeo-black"><AppIcon name="headset" class="h-5 w-5 shrink-0 text-[rgb(var(--tikeo-orange-strong))]" />{{ t('trustStats.badgeSupportTitle') }}</li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <SimilarEvents :key="event.id" :event-id="event.id" :city="event.city" :category="event.category" />

      <!-- Repère de fin de contenu : la barre mobile se retire dès qu'il apparaît -->
      <div ref="endSentinel" class="h-px" aria-hidden="true" />

      <!-- Barre de réservation mobile : posée AU-DESSUS de la barre de navigation du bas (MobileBottomNav, ~96 px). -->
      <Transition
        enter-active-class="transition duration-250 ease-out"
        leave-active-class="transition duration-200 ease-in"
        enter-from-class="translate-y-full opacity-0"
        leave-to-class="translate-y-full opacity-0"
      >
        <div
          v-if="showMobileBar"
          class="fixed inset-x-0 z-[45] border-t-2 border-[#FF7A00] bg-tikeo-surface shadow-[0_-8px_24px_rgba(14,34,64,0.15)] transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none md:hidden"
          :class="scrolling ? 'pointer-events-none translate-y-[150%] opacity-0' : ''"
          style="bottom: var(--bottom-nav-h, calc(env(safe-area-inset-bottom, 0px) + 72px))"
          role="region"
          :aria-label="tk('summaryTitle')"
        >
          <div v-if="totalQuantity > 0 && isAuthenticated" class="px-4 pt-2.5">
            <button
              v-if="!showMobilePromo && !promoCodeInput"
              type="button"
              class="text-xs font-bold text-[rgb(var(--tikeo-orange-strong))]"
              @click="showMobilePromo = true"
            >
              + {{ t('event.promoCodePlaceholder') }}
            </button>
            <div v-else>
              <input
                v-model="promoCodeInput"
                type="text"
                maxlength="30"
                :placeholder="t('event.promoCodePlaceholder')"
                class="input-field !py-1.5 text-sm uppercase"
              />
              <p v-if="promoChecking" class="mt-1 text-xs text-tikeo-gray-text">{{ t('event.promoChecking') }}</p>
              <p v-else-if="promoPreview?.valid" class="mt-1 text-xs font-bold text-tikeo-success">
                {{ t('event.promoApplied', { discount: promoDiscountPreviewLabel }) }}
              </p>
              <p v-else-if="promoPreview && !promoPreview.valid" class="mt-1 text-xs text-tikeo-error">
                {{ te(`event.promoErrors.${promoPreview.error}`) ? t(`event.promoErrors.${promoPreview.error}`) : t('event.promoErrors.PROMO_INVALID') }}
              </p>
            </div>
          </div>

          <div v-if="totalQuantity > 0 && isAuthenticated && isCause" class="px-4 pt-2">
            <button
              v-if="!showMobileNote && !contributionNote"
              type="button"
              class="text-xs font-bold text-[rgb(var(--tikeo-orange-strong))]"
              @click="showMobileNote = true"
            >
              + {{ t('event.contributionNoteLabel') }}
            </button>
            <div v-else>
              <textarea
                v-model="contributionNote"
                rows="2"
                maxlength="140"
                :aria-label="t('event.contributionNoteLabel')"
                :placeholder="t('event.contributionNotePlaceholder')"
                class="input-field resize-none !py-1.5 text-sm"
              />
              <p class="mt-0.5 text-[11px] text-tikeo-gray-text">{{ t('event.contributionNoteHint', { n: contributionNote.length }) }}</p>
            </div>
          </div>

          <p v-if="orderError" class="px-4 pt-2 text-xs font-medium text-tikeo-error">{{ orderError }}</p>

          <div class="flex items-center justify-between gap-3 px-4 py-3">
            <div class="min-w-0 leading-tight">
              <template v-if="totalQuantity > 0">
                <p class="text-xs text-tikeo-gray-text">{{ tk('selectedCount', { n: totalQuantity }) }} · {{ t('event.total') }}</p>
                <p class="truncate font-display text-xl font-extrabold text-tikeo-black">{{ formatPrice(totalPrice) }}</p>
              </template>
              <template v-else-if="minPrice !== null">
                <p class="text-xs text-tikeo-gray-text">{{ t('home.from') }}</p>
                <p class="truncate font-display text-xl font-extrabold text-tikeo-black">{{ formatPrice(minPrice) }}</p>
              </template>
            </div>
            <button v-if="totalQuantity > 0" type="button" class="btn-brand !h-11 shrink-0 !px-6" :disabled="submitting" @click="handleReserve">
              <span v-if="submitting">{{ tk('reserving') }}</span>
              <span v-else-if="!isAuthenticated">{{ tk('loginToBook') }}</span>
              <span v-else>{{ tk('reserveButton') }}</span>
            </button>
            <button v-else type="button" class="btn-brand !h-11 shrink-0 !px-6" @click="scrollToSection('billets')">
              {{ tk('selectTickets') }}
            </button>
          </div>
        </div>
      </Transition>

      <!-- Plan de salle -->
      <Transition
        enter-active-class="transition-opacity duration-150"
        leave-active-class="transition-opacity duration-150"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div v-if="seatingPlanOpen" class="fixed inset-0 z-[70] flex items-center justify-center bg-tikeo-ink/70 p-4 backdrop-blur-sm" @click.self="seatingPlanOpen = false">
          <div class="max-h-[90vh] w-full max-w-2xl overflow-auto bg-tikeo-surface shadow-2xl">
            <div class="flex items-center justify-between border-b border-tikeo-border p-3 pl-5">
              <p class="font-display text-base font-bold text-tikeo-black">{{ t('event.seatingPlan') }}</p>
              <button type="button" class="flex h-9 w-9 items-center justify-center bg-tikeo-surface-alt text-tikeo-black hover:bg-tikeo-border" :aria-label="t('event.close')" @click="seatingPlanOpen = false">
                <AppIcon name="close" class="h-5 w-5" :stroke="2" />
              </button>
            </div>
            <div class="p-4">
              <img v-if="seatingPlanIsImage" :src="event.seatingPlanUrl!" :alt="t('event.seatingPlan')" loading="lazy" decoding="async" class="w-full object-contain" />
              <div v-else class="flex flex-col items-center gap-3 py-8 text-center">
                <p class="text-sm text-tikeo-gray-text">{{ t('event.seatingPlanExternal') }}</p>
                <a :href="event.seatingPlanUrl!" target="_blank" rel="noopener" class="btn-ink">{{ t('event.seatingPlanOpen') }}</a>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </template>
  </div>
</template>