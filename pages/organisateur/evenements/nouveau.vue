<script setup lang="ts">
definePageMeta({ layout: 'organisateur', middleware: 'organizer' })
import type { Category } from '~/types/database'

const { t, locale } = useI18n()
const supabase = useSupabase()
const { isAuthenticated } = useAuth()
const { ensureOrganizer } = useOrganizer()
const router = useRouter()

const loading = ref(false)
const submitting = ref(false)
const errorMessage = ref('')
const categories = ref<Category[]>([])
const eventCategories = computed(() => categories.value.filter((c) => c.kind !== 'cause'))
const causeCategories = computed(() => categories.value.filter((c) => c.kind === 'cause'))

// Étape en cours (cahier des charges §13/§59 : informations -> billets -> publication -> lien)
const step = ref<1 | 2 | 3 | 4>(1)

const form = reactive({
  title: '',
  description: '',
  coverImage: '',
  seatingPlanUrl: '',
  categoryId: '',
  startDate: '',
  startTime: '',
  endDate: '',
  locationName: '',
  address: '',
  city: 'Abidjan',
  country: "Côte d'Ivoire",
  latitude: null as number | null,
  longitude: null as number | null,
  allowTicketTransfers: true,
  feesPayer: 'organizer' as 'organizer' | 'buyer',
})

// --- Lien personnalisé de l'événement (cahier des charges §14-16) ---
// L'organisateur peut personnaliser le "slug" (himra.babicho.com) au lieu de
// se voir imposer un identifiant technique. On le pré-remplit à partir du
// titre, mais il reste éditable et sa disponibilité est vérifiée en direct.
const slug = ref('')
let slugTouchedByUser = false
const slugChecking = ref(false)
const slugAvailable = ref<boolean | null>(null)
let slugCheckToken = 0

function onSlugInput(value: string) {
  slugTouchedByUser = true
  slug.value = slugify(value)
}

watch(
  () => form.title,
  (title) => {
    if (slugTouchedByUser) return
    slug.value = slugify(title)
  }
)

watch(slug, (value) => {
  slugAvailable.value = null
  if (!value) return
  slugChecking.value = true
  const token = ++slugCheckToken
  const timer = setTimeout(async () => {
    const available = await isSlugAvailable(value)
    if (token === slugCheckToken) {
      slugAvailable.value = available
      slugChecking.value = false
    }
  }, 400)
  onScopeDispose(() => clearTimeout(timer))
})

async function isSlugAvailable(value: string) {
  if (!value) return false
  const { data } = await supabase.from('events').select('id').eq('slug', value).limit(1).maybeSingle()
  return !data
}

// Lien final (utilisé sur l'étape 4 de succès)
const { buildEventUrl } = useEventPublicUrl()
const publishedEventUrl = ref('')
const publishedEventTitle = ref('')
const linkCopied = ref(false)
async function copyPublishedLink() {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return
  await navigator.clipboard.writeText(publishedEventUrl.value)
  linkCopied.value = true
  setTimeout(() => (linkCopied.value = false), 2000)
}
const whatsappShareUrl = computed(
  () => `https://wa.me/?text=${encodeURIComponent(`${publishedEventTitle.value} — ${publishedEventUrl.value}`)}`
)
const facebookShareUrl = computed(
  () => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publishedEventUrl.value)}`
)

interface TicketDraft {
  name: string
  /** Petite description du type de billet, affichée sous la flèche « Détails » sur la page publique. */
  description: string
  price: number
  quantity: number
  /** Affichage seul : champ « description » déplié. */
  showDesc?: boolean
}
const ticketTypes = ref<TicketDraft[]>([{ name: 'Standard', description: '', price: 0, quantity: 100 }])

// Limite de billets par acheteur (§ demande organisateur) : illimité par
// défaut, ou une valeur fixe parmi les propositions ci-dessous. Revalidée
// en base par create_order() (supabase/migrations/0026), le frontend ne
// fait qu'informer/désactiver les boutons.
const PURCHASE_LIMIT_OPTIONS = [1, 2, 3, 5] as const
const purchaseLimit = ref<number | null>(null)

function addTicketType() {
  ticketTypes.value.push({ name: '', description: '', price: 0, quantity: 0, showDesc: false })
}
function removeTicketType(i: number) {
  ticketTypes.value.splice(i, 1)
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// --- Affichage simplifié : 3 étapes visibles (l'étape 4 = écran de succès) ---
const steps = computed(() => [
  { label: t('eventWizard.stepEssentials'), icon: 'calendar-plus' },
  { label: t('eventWizard.stepTicketsShort'), icon: 'ticket' },
  { label: t('eventWizard.stepPublishShort'), icon: 'send' },
])
const editSlug = ref(false)
watch(slugAvailable, (v) => { if (v === false) editSlug.value = true })

const totalCapacity = computed(() => ticketTypes.value.reduce((n, x) => n + (Number(x.quantity) || 0), 0))
const maxRevenue = computed(() => ticketTypes.value.reduce((n, x) => n + (Number(x.price) || 0) * (Number(x.quantity) || 0), 0))
const minPrice = computed(() => {
  const prices = ticketTypes.value.filter((x) => x.name).map((x) => Number(x.price) || 0)
  return prices.length ? Math.min(...prices) : 0
})
function fcfa(n: number) {
  return `${Math.round(n).toLocaleString('fr-FR')} FCFA`
}
const previewDate = computed(() => {
  if (!form.startDate) return '—'
  const d = new Date(`${form.startDate}T00:00:00`)
  const day = d.toLocaleDateString(locale.value, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
  return form.startTime ? `${day} · ${form.startTime}` : day
})
const previewPlace = computed(() => [form.locationName, form.city].filter(Boolean).join(', ') || '—')

onMounted(async () => {
  loading.value = true
  try {
    const { data } = await supabase.from('categories').select('*').eq('status', 'active').order('name')
    categories.value = (data as unknown as Category[]) ?? []
  } finally {
    loading.value = false
  }
})

async function submitStep1() {
  if (!form.title || !form.startDate) {
    errorMessage.value = t('eventWizard.requiredError')
    return
  }
  if (!slug.value) {
    errorMessage.value = t('eventWizard.slugRequiredError')
    return
  }
  // Vérification finale de disponibilité (au cas où le débounce n'aurait
  // pas eu le temps de se terminer avant que l'utilisateur clique).
  slugChecking.value = true
  const available = await isSlugAvailable(slug.value)
  slugChecking.value = false
  slugAvailable.value = available
  if (!available) {
    errorMessage.value = t('eventWizard.slugTakenError')
    return
  }
  errorMessage.value = ''
  step.value = 2
}

function submitStep2() {
  if (ticketTypes.value.length === 0 || ticketTypes.value.some((t) => !t.name)) {
    errorMessage.value = t('eventWizard.atLeastOneTicketError')
    return
  }
  errorMessage.value = ''
  step.value = 3
}

async function publishEvent(publish: boolean) {
  submitting.value = true
  errorMessage.value = ''
  try {
    if (!isAuthenticated.value) throw new Error(t('eventWizard.loginRequiredError'))

    const organizer = await ensureOrganizer()
    if (!organizer) throw new Error(t('eventWizard.organizerFetchError'))

    if (publish && organizer.status !== 'approved') {
      throw new Error(t('eventWizard.notApprovedError'))
    }

    const startDateTime = form.startTime ? `${form.startDate}T${form.startTime}:00` : `${form.startDate}T00:00:00`

    // Sécurité : re-vérifier la disponibilité du slug juste avant l'écriture
    // (fenêtre de course possible entre la vérification de l'étape 1 et la
    // publication). En cas de conflit malgré tout, la contrainte `unique`
    // en base (supabase/migrations/0001_init.sql) empêchera le doublon et
    // on retente avec un court suffixe plutôt que d'échouer silencieusement.
    let finalSlug = slug.value || slugify(form.title)
    if (!(await isSlugAvailable(finalSlug))) {
      finalSlug = `${finalSlug}-${Math.random().toString(36).slice(2, 6)}`
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        organizer_id: organizer.id,
        title: form.title,
        slug: finalSlug,
        description: form.description || null,
        cover_image: form.coverImage || null,
        seating_plan_url: form.seatingPlanUrl || null,
        category_id: form.categoryId || null,
        start_date: startDateTime,
        end_date: form.endDate ? `${form.endDate}T23:59:59` : null,
        location_name: form.locationName || null,
        address: form.address || null,
        city: form.city || null,
        country: form.country || null,
        latitude: form.latitude,
        longitude: form.longitude,
        allow_ticket_transfers: form.allowTicketTransfers,
        fees_payer: form.feesPayer,
        status: publish ? 'published' : 'draft',
        max_tickets_per_buyer: purchaseLimit.value,
      })
      .select('id')
      .single()

    if (eventError) throw eventError

    const rows = ticketTypes.value.map((t) => ({
      event_id: event.id,
      name: t.name,
      description: t.description.trim() || null,
      price: t.price,
      quantity: t.quantity,
    }))
    const { error: ticketsError } = await supabase.from('ticket_types').insert(rows)
    if (ticketsError) throw ticketsError

    if (publish) {
      // §59 : l'organisateur doit obtenir son lien immédiatement après publication.
      publishedEventTitle.value = form.title
      publishedEventUrl.value = buildEventUrl({ slug: finalSlug }).url
      step.value = 4
    } else {
      router.push('/organisateur/evenements')
    }
  } catch (e: any) {
    errorMessage.value = e?.message || e?.data?.statusMessage || t('eventWizard.createError')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div>
    <OrgPageHeader :eyebrow="t('organizerNav.fallbackTitle')" :title="t('eventWizard.title')" :subtitle="t('eventWizard.subtitle')" icon="calendar-plus" :back="{ to: '/organisateur/evenements', label: t('ticketStats.backToEvents') }" />

    <div class="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-8">
      <!-- ============ Progression (3 étapes) ============ -->
      <ol class="mb-6 flex items-center" :aria-label="t('eventWizard.title')">
        <template v-for="(st, i) in steps" :key="i">
          <li class="flex min-w-0 items-center gap-2.5" :aria-current="step === i + 1 ? 'step' : undefined">
            <span
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold transition-all duration-500"
              :class="
                step > i + 1
                  ? 'bg-tikeo-success text-white'
                  : step === i + 1
                    ? 'bg-gradient-to-br from-[#FF7A00] to-[#FF9A3D] text-[#0E2240] shadow-[0_8px_20px_-8px_rgba(255,122,0,0.9)] ring-4 ring-[#FF7A00]/20'
                    : 'border border-tikeo-border bg-tikeo-surface text-tikeo-gray-text'
              "
            >
              <AppIcon v-if="step > i + 1" name="check" class="h-[18px] w-[18px]" :stroke="3" />
              <template v-else>{{ i + 1 }}</template>
            </span>
            <span class="truncate text-sm font-bold max-sm:hidden" :class="step >= i + 1 ? 'text-tikeo-black' : 'text-tikeo-gray-text'">{{ st.label }}</span>
          </li>
          <li v-if="i < steps.length - 1" class="mx-3 h-1 flex-1 overflow-hidden rounded-full bg-tikeo-border" aria-hidden="true">
            <div class="h-full rounded-full bg-gradient-to-r from-[#FF7A00] to-[#FF9A3D] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]" :style="`width: ${step > i + 1 ? 100 : 0}%`" />
          </li>
        </template>
      </ol>

      <p v-if="errorMessage" class="acc-alert-error mb-4 flex items-start gap-2" role="alert">
        <AppIcon name="alert" class="mt-0.5 h-4 w-4 shrink-0" />{{ errorMessage }}
      </p>

      <!-- ============ Étape 1 : l'essentiel ============ -->
      <form v-if="step === 1" class="flex flex-col gap-4" @submit.prevent="submitStep1">
        <section class="flex flex-col gap-6 rounded-3xl border border-tikeo-border bg-tikeo-surface p-5 shadow-card md:p-7">
          <header class="flex items-center gap-3">
            <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FF7A00]/12 text-[#E56A00]"><AppIcon name="sparkles" class="h-5 w-5" /></span>
            <div>
              <h2 class="font-display text-lg font-extrabold leading-tight text-tikeo-black">{{ t('eventWizard.s1Title') }}</h2>
              <p class="text-xs text-tikeo-gray-text md:text-sm">{{ t('eventWizard.s1Desc') }}</p>
            </div>
          </header>

          <div>
            <WizardField v-slot="{ id }" :label="t('eventForm.labelTitle')" required>
              <input :id="id" v-model="form.title" type="text" required :placeholder="t('eventForm.exTitle')" class="input-field !py-3.5 !text-base font-semibold" />
            </WizardField>

            <!-- Lien : pré-rempli automatiquement, modifiable -->
            <div class="mt-2.5 rounded-xl bg-tikeo-surface-alt px-3 py-2">
              <div class="flex items-center gap-2 text-xs">
                <AppIcon name="link" class="h-4 w-4 shrink-0 text-tikeo-gray-text" />
                <span class="min-w-0 flex-1 truncate text-tikeo-gray-text">babicho.com/e/<span class="font-bold text-tikeo-black">{{ slug || '…' }}</span></span>
                <span v-if="slugChecking" class="text-tikeo-gray-text">{{ t('eventForm.slugChecking') }}</span>
                <span v-else-if="slugAvailable === true" class="flex items-center gap-1 font-semibold text-tikeo-success"><AppIcon name="check-circle" class="h-4 w-4" />{{ t('eventForm.slugAvailable') }}</span>
                <span v-else-if="slugAvailable === false" class="flex items-center gap-1 font-semibold text-tikeo-error"><AppIcon name="x-circle" class="h-4 w-4" />{{ t('eventForm.slugTaken') }}</span>
                <button type="button" class="shrink-0 rounded-lg px-2 py-1 font-bold text-tikeo-orange hover:bg-tikeo-orange/10" @click="editSlug = !editSlug">
                  {{ editSlug ? t('eventWizard.linkDone') : t('eventWizard.linkEdit') }}
                </button>
              </div>
              <div v-if="editSlug" class="mt-2">
                <div class="flex items-center rounded-xl border border-tikeo-border bg-tikeo-surface focus-within:border-tikeo-orange">
                  <span class="shrink-0 truncate pl-3 text-sm text-tikeo-gray-text">babicho.com/e/</span>
                  <input
                    :value="slug"
                    type="text"
                    :aria-label="t('eventForm.slugLabel')"
                    :placeholder="t('eventForm.slugPlaceholder')"
                    class="w-full border-0 bg-transparent px-1 py-2.5 text-sm text-tikeo-black outline-none"
                    @input="onSlugInput(($event.target as HTMLInputElement).value)"
                  />
                </div>
                <p class="mt-1.5 text-[11px] text-tikeo-gray-text">{{ t('eventForm.slugHelp') }}</p>
              </div>
            </div>
          </div>

          <MediaInput
            v-model="form.coverImage"
            folder="event-covers"
            :label="t('eventForm.coverImageLabel')"
            :placeholder="t('eventForm.coverImagePlaceholder')"
          />

          <div class="grid gap-4 sm:grid-cols-2">
            <WizardField v-slot="{ id }" :label="t('eventForm.labelStartDate')" required>
              <input :id="id" v-model="form.startDate" type="date" required class="input-field" />
            </WizardField>
            <WizardField v-slot="{ id }" :label="t('eventForm.labelStartTime')" optional>
              <input :id="id" v-model="form.startTime" type="time" class="input-field" />
            </WizardField>
            <WizardField v-slot="{ id }" :label="t('eventForm.labelLocationName')" optional>
              <input :id="id" v-model="form.locationName" type="text" :placeholder="t('eventForm.exLocationName')" class="input-field" />
            </WizardField>
            <WizardField v-slot="{ id }" :label="t('eventForm.labelCity')" optional>
              <input :id="id" v-model="form.city" type="text" :placeholder="t('eventForm.exCity')" class="input-field" />
            </WizardField>
          </div>
        </section>

        <!-- Détails facultatifs, repliés par défaut -->
        <details class="group overflow-hidden rounded-3xl border border-tikeo-border bg-tikeo-surface shadow-card">
          <summary class="flex cursor-pointer list-none items-center gap-3 p-4 md:p-5 [&::-webkit-details-marker]:hidden">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tikeo-surface-alt text-tikeo-black"><AppIcon name="settings" class="h-[18px] w-[18px]" /></span>
            <span class="min-w-0 flex-1">
              <span class="block text-[15px] font-extrabold text-tikeo-black">{{ t('eventWizard.moreDetails') }}</span>
              <span class="block truncate text-xs text-tikeo-gray-text">{{ t('eventWizard.moreDetailsHint') }}</span>
            </span>
            <AppIcon name="chevron-down" class="h-5 w-5 shrink-0 text-tikeo-gray-text transition-transform duration-300 group-open:rotate-180" />
          </summary>
          <div class="flex flex-col gap-5 border-t border-tikeo-border p-5 md:p-7">
            <WizardField v-slot="{ id }" :label="t('eventForm.labelDescription')" optional>
              <textarea :id="id" v-model="form.description" rows="4" :placeholder="t('eventForm.exDescription')" class="input-field" />
            </WizardField>
            <div class="grid gap-4 sm:grid-cols-2">
              <WizardField v-slot="{ id }" :label="t('eventForm.labelCategory')" optional>
                <select :id="id" v-model="form.categoryId" class="input-field">
                  <option value="">{{ t('eventForm.categoryChoose') }}</option>
                  <optgroup label="Événements (billetterie)">
                    <option v-for="c in eventCategories" :key="c.id" :value="c.id">{{ c.name }}</option>
                  </optgroup>
                  <optgroup v-if="causeCategories.length" label="Causes solidaires (message de remerciement, sans billet)">
                    <option v-for="c in causeCategories" :key="c.id" :value="c.id">{{ c.name }}</option>
                  </optgroup>
                </select>
              </WizardField>
              <WizardField v-slot="{ id }" :label="t('eventForm.labelEndDate')" optional>
                <input :id="id" v-model="form.endDate" type="date" class="input-field" />
              </WizardField>
              <WizardField v-slot="{ id }" :label="t('eventForm.labelAddress')" optional>
                <input :id="id" v-model="form.address" type="text" :placeholder="t('eventForm.exAddress')" class="input-field" />
              </WizardField>
              <WizardField v-slot="{ id }" :label="t('eventForm.labelCountry')" optional>
                <input :id="id" v-model="form.country" type="text" :placeholder="t('eventForm.exCountry')" class="input-field" />
              </WizardField>
            </div>
            <div>
              <p class="mb-2 text-[13px] font-bold text-tikeo-black">{{ t('eventForm.venueMapLabel') }}</p>
              <VenueMapPicker v-model:latitude="form.latitude" v-model:longitude="form.longitude" />
            </div>
            <MediaInput
              v-model="form.seatingPlanUrl"
              folder="seating-plans"
              allow-pdf
              :label="t('eventForm.seatingPlanLabel')"
              :placeholder="t('eventForm.seatingPlanPlaceholder')"
              :help="t('eventForm.seatingPlanHelp')"
            />
          </div>
        </details>

        <button type="submit" class="btn-primary group !h-14 w-full !text-base">
          {{ t('eventForm.continueButton') }}
          <AppIcon name="arrow-right" class="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" :stroke="2.4" />
        </button>
      </form>

      <!-- ============ Étape 2 : billets ============ -->
      <form v-else-if="step === 2" class="flex flex-col gap-4" @submit.prevent="submitStep2">
        <section class="flex flex-col gap-5 rounded-3xl border border-tikeo-border bg-tikeo-surface p-5 shadow-card md:p-7">
          <header class="flex items-center gap-3">
            <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FF7A00]/12 text-[#E56A00]"><AppIcon name="ticket" class="h-5 w-5" /></span>
            <div>
              <h2 class="font-display text-lg font-extrabold leading-tight text-tikeo-black">{{ t('eventWizard.s2Title') }}</h2>
              <p class="text-xs text-tikeo-gray-text md:text-sm">{{ t('eventWizard.s2Desc') }}</p>
            </div>
          </header>

          <TransitionGroup name="org-list" tag="div" class="relative flex flex-col gap-3">
            <article v-for="(tk, i) in ticketTypes" :key="i" class="relative overflow-hidden rounded-2xl border border-tikeo-border bg-tikeo-surface-alt/60 p-4">
              <span class="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[#FF7A00] to-[#0057B8]" aria-hidden="true" />
              <div class="mb-3 flex items-center justify-between gap-3 pl-2">
                <p class="flex items-center gap-2 text-sm font-extrabold text-tikeo-black">
                  {{ t('eventForm.ticketN', { n: i + 1 }) }}
                  <span v-if="Number(tk.price) === 0" class="rounded-full bg-tikeo-success/10 px-2 py-0.5 text-[11px] font-bold text-tikeo-success">{{ t('eventWizard.free') }}</span>
                </p>
                <button v-if="ticketTypes.length > 1" type="button" class="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-tikeo-error transition-colors hover:bg-tikeo-error/10" :aria-label="t('eventForm.removeAria')" @click="removeTicketType(i)">
                  <AppIcon name="trash" class="h-4 w-4" />{{ t('eventForm.removeTicket') }}
                </button>
              </div>
              <div class="grid gap-3 pl-2 sm:grid-cols-[minmax(0,1fr)_160px_130px]">
                <WizardField v-slot="{ id }" :label="t('eventForm.labelTicketName')" required>
                  <input :id="id" v-model="tk.name" type="text" :placeholder="t('eventForm.exTicketName')" class="input-field" />
                </WizardField>
                <WizardField v-slot="{ id }" :label="t('eventForm.labelTicketPrice')" required>
                  <div class="relative">
                    <input :id="id" v-model.number="tk.price" type="number" min="0" inputmode="numeric" :placeholder="t('eventForm.exTicketPrice')" class="input-field !pr-14" />
                    <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] font-bold text-tikeo-gray-text">{{ t('eventWizard.priceUnit') }}</span>
                  </div>
                </WizardField>
                <WizardField v-slot="{ id }" :label="t('eventForm.labelTicketQty')" required>
                  <input :id="id" v-model.number="tk.quantity" type="number" min="0" inputmode="numeric" :placeholder="t('eventForm.exTicketQty')" class="input-field" />
                </WizardField>
              </div>
              <div class="mt-3 pl-2">
                <button v-if="!tk.showDesc && !tk.description" type="button" class="flex items-center gap-1.5 text-xs font-bold text-tikeo-orange" @click="tk.showDesc = true">
                  <AppIcon name="plus" class="h-3.5 w-3.5" :stroke="2.6" />{{ t('eventWizard.addDesc') }}
                </button>
                <WizardField v-else v-slot="{ id }" :label="t('eventForm.labelTicketDesc')" optional>
                  <textarea :id="id" v-model="tk.description" rows="2" maxlength="300" :placeholder="t('eventForm.exTicketDesc')" class="input-field resize-y" />
                  <p class="mt-1 text-right text-[11px] text-tikeo-gray-text">{{ tk.description.length }}/300</p>
                </WizardField>
              </div>
            </article>
          </TransitionGroup>

          <button type="button" class="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-tikeo-border text-sm font-bold text-tikeo-gray-text transition-colors hover:border-[#FF7A00] hover:bg-[#FF7A00]/5 hover:text-tikeo-orange" @click="addTicketType">
            <AppIcon name="plus" class="h-[18px] w-[18px]" :stroke="2.4" />{{ t('eventForm.addTicketType') }}
          </button>

          <div class="grid grid-cols-2 gap-3">
            <div class="rounded-2xl bg-tikeo-surface-alt p-4">
              <p class="text-[11px] font-bold uppercase tracking-wider text-tikeo-gray-text">{{ t('eventWizard.capacity') }}</p>
              <p class="mt-1 font-display text-xl font-extrabold text-tikeo-black md:text-2xl">{{ totalCapacity.toLocaleString('fr-FR') }}</p>
            </div>
            <div class="rounded-2xl bg-[#FF7A00]/10 p-4">
              <p class="text-[11px] font-bold uppercase tracking-wider text-[#B45309] dark:text-[#FFB066]">{{ t('eventWizard.maxRevenue') }}</p>
              <p class="mt-1 font-display text-xl font-extrabold text-tikeo-black md:text-2xl">{{ fcfa(maxRevenue) }}</p>
            </div>
          </div>
        </section>

        <div class="flex gap-3">
          <button type="button" class="btn-secondary !h-14 flex-1" @click="step = 1">
            <AppIcon name="arrow-left" class="h-[18px] w-[18px]" />{{ t('eventForm.backButton') }}
          </button>
          <button type="submit" class="btn-primary group !h-14 flex-[2] !text-base">
            {{ t('eventForm.continueButton') }}
            <AppIcon name="arrow-right" class="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" :stroke="2.4" />
          </button>
        </div>
      </form>

      <!-- ============ Étape 3 : aperçu + options + publication ============ -->
      <div v-else-if="step === 3" class="flex flex-col gap-4">
        <!-- Aperçu façon carte d'événement -->
        <section class="overflow-hidden rounded-3xl border border-tikeo-border bg-tikeo-surface shadow-card">
          <div class="relative h-44 w-full md:h-56" :class="form.coverImage ? '' : 'admin-hero'">
            <img v-if="form.coverImage" :src="form.coverImage" alt="" class="h-full w-full object-cover" />
            <div v-else class="flex h-full items-center justify-center text-white/30"><AppIcon name="image" class="h-14 w-14" :stroke="1.4" /></div>
            <div class="absolute inset-0 bg-gradient-to-t from-[#0E2240]/80 via-transparent to-transparent" aria-hidden="true" />
            <span class="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#0E2240] backdrop-blur">{{ t('eventWizard.previewTitle') }}</span>
            <p class="absolute inset-x-4 bottom-4 break-words font-display text-xl font-extrabold leading-tight text-white md:text-3xl">{{ form.title }}</p>
          </div>
          <div class="grid gap-3 p-5 sm:grid-cols-2 md:p-6">
            <div class="flex items-start gap-3">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0057B8]/10 text-[#0057B8]"><AppIcon name="calendar" class="h-5 w-5" /></span>
              <div class="min-w-0"><p class="text-[11px] font-bold uppercase tracking-wider text-tikeo-gray-text">{{ t('eventForm.recapDate') }}</p><p class="text-sm font-bold capitalize text-tikeo-black">{{ previewDate }}</p></div>
            </div>
            <div class="flex items-start gap-3">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7C3AED]/10 text-[#7C3AED]"><AppIcon name="pin" class="h-5 w-5" /></span>
              <div class="min-w-0"><p class="text-[11px] font-bold uppercase tracking-wider text-tikeo-gray-text">{{ t('eventForm.recapPlace') }}</p><p class="truncate text-sm font-bold text-tikeo-black">{{ previewPlace }}</p></div>
            </div>
            <div class="flex items-start gap-3 sm:col-span-2">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF7A00]/12 text-[#E56A00]"><AppIcon name="link" class="h-5 w-5" /></span>
              <div class="min-w-0"><p class="text-[11px] font-bold uppercase tracking-wider text-tikeo-gray-text">{{ t('eventForm.recapLink') }}</p><p class="break-all text-sm text-tikeo-black">babicho.com/e/<span class="font-bold">{{ slug }}</span></p></div>
            </div>
          </div>
          <ul class="divide-y divide-tikeo-border border-t border-tikeo-border">
            <li v-for="(tk, i) in ticketTypes" :key="i" class="flex items-center justify-between gap-3 px-5 py-3 text-sm md:px-6">
              <span class="flex min-w-0 items-center gap-2.5"><AppIcon name="ticket" class="h-4 w-4 shrink-0 text-tikeo-orange" /><span class="truncate font-bold text-tikeo-black">{{ tk.name }}</span><span class="shrink-0 text-xs text-tikeo-gray-text">× {{ tk.quantity }}</span></span>
              <span class="shrink-0 font-extrabold text-tikeo-black">{{ Number(tk.price) === 0 ? t('eventWizard.free') : fcfa(Number(tk.price)) }}</span>
            </li>
          </ul>
        </section>

        <!-- Options de vente -->
        <section class="flex flex-col gap-5 rounded-3xl border border-tikeo-border bg-tikeo-surface p-5 shadow-card md:p-7">
          <h2 class="flex items-center gap-3 text-[15px] font-extrabold text-tikeo-black">
            <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF7A00]/12 text-[#E56A00]"><AppIcon name="settings" class="h-[18px] w-[18px]" /></span>
            {{ t('eventWizard.salesOptions') }}
          </h2>

          <fieldset>
            <legend class="text-[13px] font-bold text-tikeo-black">{{ t('eventForm.feesPayerLabel') }}</legend>
            <p class="mb-2 text-xs text-tikeo-gray-text">{{ t('eventForm.feesPayerHelp') }}</p>
            <div class="grid gap-2 sm:grid-cols-2">
              <label
                v-for="opt in [{ v: 'organizer', l: t('eventForm.feesPayerOrganizer') }, { v: 'buyer', l: t('eventForm.feesPayerBuyer') }]"
                :key="opt.v"
                class="flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-3.5 text-sm transition-colors"
                :class="form.feesPayer === opt.v ? 'border-[#FF7A00] bg-[#FF7A00]/8' : 'border-tikeo-border hover:border-tikeo-ink/30'"
              >
                <input v-model="form.feesPayer" type="radio" :value="opt.v" class="sr-only" />
                <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2" :class="form.feesPayer === opt.v ? 'border-[#FF7A00] bg-[#FF7A00]' : 'border-tikeo-border'">
                  <AppIcon v-if="form.feesPayer === opt.v" name="check" class="h-3 w-3 text-[#0E2240]" :stroke="3.4" />
                </span>
                <span class="font-semibold text-tikeo-black">{{ opt.l }}</span>
              </label>
            </div>
          </fieldset>

          <div role="radiogroup" aria-labelledby="purchase-limit-label">
            <p id="purchase-limit-label" class="text-[13px] font-bold text-tikeo-black">{{ t('eventForm.purchaseLimitLabel') }}</p>
            <div class="mt-2 flex flex-wrap gap-2">
              <label
                v-for="opt in [null, ...PURCHASE_LIMIT_OPTIONS]"
                :key="String(opt)"
                class="cursor-pointer rounded-full border px-4 py-2 text-xs font-bold transition-colors"
                :class="purchaseLimit === opt ? 'border-[#FF7A00] bg-[#FF7A00] text-[#0E2240]' : 'border-tikeo-border text-tikeo-gray-text hover:border-tikeo-ink/40'"
              >
                <input type="radio" class="sr-only" :checked="purchaseLimit === opt" @change="purchaseLimit = opt" />
                {{ opt === null ? t('eventForm.purchaseLimitUnlimited') : t('eventForm.purchaseLimitOption', { n: opt }) }}
              </label>
            </div>
            <p class="mt-2 text-xs text-tikeo-gray-text">{{ t('eventForm.purchaseLimitHelp') }}</p>
          </div>

          <label class="flex cursor-pointer items-center gap-4 rounded-2xl border border-tikeo-border p-3.5">
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-bold text-tikeo-black">{{ t('eventForm.allowTransfersLabel') }}</span>
              <span class="mt-0.5 block text-xs text-tikeo-gray-text">{{ t('eventForm.allowTransfersHelp') }}</span>
            </span>
            <input v-model="form.allowTicketTransfers" type="checkbox" role="switch" class="sr-only" />
            <span class="relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300" :class="form.allowTicketTransfers ? 'bg-[#FF7A00]' : 'bg-tikeo-border'" aria-hidden="true">
              <span class="absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-300" :class="form.allowTicketTransfers ? 'translate-x-5' : ''" />
            </span>
          </label>
        </section>

        <div class="flex flex-col gap-3">
          <button type="button" class="btn-primary group !h-14 w-full !text-base" :disabled="submitting" @click="publishEvent(true)">
            <AppIcon name="send" class="h-5 w-5" :stroke="2.2" />
            {{ submitting ? t('eventForm.publishing') : t('eventForm.publishButton') }}
          </button>
          <div class="flex gap-3">
            <button type="button" class="btn-secondary !h-12 flex-1" @click="step = 2"><AppIcon name="arrow-left" class="h-[18px] w-[18px]" />{{ t('eventForm.backButton') }}</button>
            <button type="button" class="btn-secondary !h-12 flex-1" :disabled="submitting" @click="publishEvent(false)">{{ t('eventForm.saveDraftButton') }}</button>
          </div>
          <p class="text-center text-xs text-tikeo-gray-text">{{ t('eventForm.publishHint') }}</p>
        </div>
      </div>

      <!-- ============ Succès : lien de l'événement (cahier des charges §59) ============ -->
      <div v-else class="flex flex-col items-center gap-5 rounded-3xl border border-tikeo-border bg-tikeo-surface p-6 text-center shadow-card md:p-10">
        <div class="relative">
          <span class="absolute inset-0 animate-ping rounded-full bg-tikeo-success/25" aria-hidden="true" />
          <span class="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#16A34A] to-[#4ADE80] text-white shadow-[0_16px_32px_-12px_rgba(22,163,74,0.8)]">
            <AppIcon name="check" class="h-10 w-10" :stroke="3" />
          </span>
        </div>
        <div>
          <h2 class="font-display text-2xl font-extrabold text-tikeo-black md:text-3xl">{{ t('eventWizard.successTitle') }}</h2>
          <p class="mt-1.5 text-sm text-tikeo-gray-text">{{ t('eventForm.publishedDesc') }}</p>
        </div>

        <div class="w-full text-left">
          <p class="mb-1.5 text-[13px] font-bold text-tikeo-black">{{ t('eventForm.labelEventLink') }}</p>
          <div class="flex w-full items-center gap-2 rounded-2xl border border-tikeo-border bg-tikeo-surface-alt p-2 pl-4">
            <span class="flex-1 truncate text-sm font-semibold text-tikeo-black">{{ publishedEventUrl }}</span>
            <button type="button" class="btn-secondary shrink-0 !px-4 !py-2 text-xs" @click="copyPublishedLink">
              <AppIcon :name="linkCopied ? 'check' : 'copy'" class="h-4 w-4" />{{ linkCopied ? t('eventForm.linkCopied') : t('eventForm.copyLink') }}
            </button>
          </div>
        </div>

        <div class="w-full text-left">
          <p class="mb-1.5 text-[13px] font-bold text-tikeo-black">{{ t('eventForm.shareOn') }}</p>
          <div class="grid w-full grid-cols-2 gap-3">
            <a :href="whatsappShareUrl" target="_blank" rel="noopener" class="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] text-sm font-bold text-[#06371B] transition hover:brightness-105 active:scale-[0.98]"><AppIcon name="share" class="h-[18px] w-[18px]" />WhatsApp</a>
            <a :href="facebookShareUrl" target="_blank" rel="noopener" class="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#1877F2] text-sm font-bold text-white transition hover:brightness-110 active:scale-[0.98]"><AppIcon name="share" class="h-[18px] w-[18px]" />Facebook</a>
          </div>
        </div>

        <NuxtLink to="/organisateur/evenements" class="btn-primary !h-14 w-full !text-base">{{ t('eventForm.backToMyEvents') }}</NuxtLink>
      </div>
    </div>
  </div>
</template>
