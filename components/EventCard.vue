<script setup lang="ts">
import type { EventCardData } from '~/types/database'

const props = defineProps<{
  event: EventCardData
  /**
   * "grid"    = carte verticale standard (grille desktop)
   * "full"    = carte verticale étroite (carrousels, mobile)
   * "tile"    = carte qui remplit la hauteur de sa cellule (mosaïque « Prochainement »)
   * "feature" = grande affiche (événement mis en avant)
   */
  variant?: 'grid' | 'full' | 'tile' | 'feature'
}>()

const { t, locale } = useI18n()
const router = useRouter()
const route = useRoute()
const { isFavorite, toggleFavorite } = useFavorites()
const { isFollowing, toggleFollow } = useFollows()

// Nombre de cœurs : valeur lue en base + ajustement immédiat quand on clique.
const likes = ref(props.event.favoritesCount ?? 0)
watch(
  () => props.event.favoritesCount,
  (v) => {
    likes.value = v ?? 0
  }
)
const likesLabel = computed(() => compactCount(likes.value))

async function handleFavoriteClick() {
  const wasFavorite = isFavorite(props.event.id)
  const ok = await toggleFavorite(props.event.id)
  if (!ok) {
    router.push({ path: '/connexion', query: { redirect: route.fullPath } })
    return
  }
  const nowFavorite = isFavorite(props.event.id)
  if (nowFavorite !== wasFavorite) likes.value = Math.max(0, likes.value + (nowFavorite ? 1 : -1))
}

async function handleFollowClick() {
  if (!props.event.organizerId) return
  const ok = await toggleFollow(props.event.organizerId)
  if (!ok) router.push({ path: '/connexion', query: { redirect: route.fullPath } })
}

const isFeature = computed(() => props.variant === 'feature')
const isTile = computed(() => props.variant === 'tile')

const dateParts = computed(() => {
  const d = new Date(props.event.startDate)
  return {
    weekday: d.toLocaleDateString(locale.value, { weekday: 'short' }).replace('.', ''),
    day: String(d.getDate()).padStart(2, '0'),
    month: d.toLocaleDateString(locale.value, { month: 'short' }).replace('.', ''),
    full: d.toLocaleDateString(locale.value, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  }
})

const isFree = computed(() => props.event.priceFrom === 0)
const formattedPrice = computed(() => props.event.priceFrom.toLocaleString('fr-FR'))

const initials = computed(() => {
  const name = props.event.organizerName
  if (!name) return '•'
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
})

const eventUrl = computed(() => `/e/${props.event.slug}`)

const isCause = computed(() => !!props.event.isCause)
const flagUrl = computed(() => countryFlagUrl(props.event.country))

// « sam. 28 nov. 2026 | 16h00 » — ou « Plusieurs dates » si l'événement dure plusieurs jours.
const dateLabel = computed(() => {
  const start = new Date(props.event.startDate)
  if (props.event.endDate) {
    const end = new Date(props.event.endDate)
    if (end.toDateString() !== start.toDateString()) return t('home.multipleDates')
  }
  const day = start.toLocaleDateString(locale.value, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  if (start.getHours() === 0 && start.getMinutes() === 0) return day
  const time = start.toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${day} | ${locale.value.startsWith('fr') ? time.replace(':', 'h') : time}`
})

// Cotisation : montant récolté + progression (barre seulement si un objectif existe).
const raisedLabel = computed(() => (props.event.raisedAmount ?? 0).toLocaleString('fr-FR'))
const progress = computed(() => {
  const goal = props.event.goalAmount
  if (!goal || goal <= 0) return null
  return Math.min(100, Math.round(((props.event.raisedAmount ?? 0) / goal) * 100))
})
</script>

<template>
  <!-- ===================== AFFICHE (événement mis en avant) ===================== -->
  <article
    v-tilt
    v-if="isFeature"
    class="group relative flex min-h-[26rem] shrink-0 flex-col justify-end overflow-hidden rounded-2xl bg-tikeo-ink text-white shadow-card transition-[transform,box-shadow] duration-300 hover:shadow-card-hover"
  >
    <img
      :src="event.coverImage"
      alt=""
      loading="lazy"
      decoding="async"
      class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
    />
    <div class="absolute inset-0 bg-gradient-to-t from-tikeo-ink via-tikeo-ink/55 to-transparent" aria-hidden="true" />

    <div class="absolute left-4 top-4 flex flex-col items-center rounded-xl bg-white px-3 py-2 leading-none text-tikeo-ink shadow-sm">
      <span class="text-[11px] font-semibold capitalize text-tikeo-ink/70">{{ dateParts.weekday }}</span>
      <span class="mt-1 font-display text-3xl font-extrabold">{{ dateParts.day }}</span>
      <span class="mt-0.5 text-xs font-semibold capitalize text-tikeo-ink/70">{{ dateParts.month }}</span>
    </div>

    <button
      type="button"
      class="absolute right-4 top-4 flex h-10 items-center gap-1.5 rounded-full bg-white/95 px-3 text-tikeo-ink transition-transform active:scale-90"
      :aria-pressed="isFavorite(event.id)"
      :aria-label="isFavorite(event.id) ? t('home.removeFavorite') : t('home.addFavorite')"
      @click.prevent="handleFavoriteClick"
    >
      <svg class="h-[18px] w-[18px]" :class="isFavorite(event.id) ? 'fill-[#FF7A00] text-[#FF7A00]' : 'fill-none'" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 21s-7.5-4.6-10-9.1C.5 8.6 2.3 5 6 5c2 0 3.4 1.1 4 2.2C10.6 6.1 12 5 14 5c3.7 0 5.5 3.6 4 6.9-2.5 4.5-10 9.1-10 9.1z" />
      </svg>
      <span class="text-xs font-semibold">{{ likesLabel }}</span>
    </button>

    <div class="relative z-10 flex flex-col gap-3 p-5 md:p-7">
      <span v-if="event.category" class="w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">{{ event.category }}</span>
      <h3 class="font-display text-2xl font-extrabold leading-[1.08] tracking-tight md:text-4xl">
        <NuxtLink :to="eventUrl" class="after:absolute after:inset-0 after:content-['']">{{ event.title }}</NuxtLink>
      </h3>
      <p class="flex items-center gap-1.5 text-sm text-white/85">
        <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 21c-4.5-4-7-7.4-7-10.5A7 7 0 0119 10.5C19 13.6 16.5 17 12 21z" />
          <circle cx="12" cy="10.5" r="2.2" />
        </svg>
        {{ event.city }}<template v-if="event.country">, {{ event.country }}</template>
      </p>
      <div class="mt-1 flex items-center justify-between gap-4 border-t border-white/20 pt-4">
        <p class="leading-tight">
          <span class="block text-xs text-white/70">{{ t('home.from') }}</span>
          <span class="font-display text-xl font-bold md:text-2xl">
            <template v-if="isFree">{{ t('home.free') }}</template>
            <template v-else>{{ formattedPrice }} <span class="text-sm font-semibold">FCFA</span></template>
          </span>
        </p>
        <span class="rounded-full bg-[#FF7A00] px-5 py-2.5 text-sm font-bold text-tikeo-ink">{{ t('home.buyShort') }}</span>
      </div>
    </div>
  </article>

  <!-- ===================== CARTE STANDARD (événement ou cotisation) =====================
       Même langage que la maquette : grande photo avec le numéro du jour en gros, pastille de
       catégorie, favori en verre sombre ; dessous : titre, lieu, date, puis prix et flèche ronde
       qui devient orange (et pivote) au survol. Favori, abonnement et lien restent inchangés. -->
  <article
    v-tilt
    v-else
    class="ev-card group relative flex shrink-0 flex-col overflow-hidden rounded-[1.6rem] border border-tikeo-border bg-tikeo-surface shadow-card transition-[transform,box-shadow] duration-500 hover:shadow-card-hover focus-within:ring-2 focus-within:ring-[#FF7A00]/60"
    :class="[
      variant === 'full' || isTile ? 'w-[78vw] max-w-[300px] md:w-full md:max-w-none' : 'w-full',
      isTile ? 'h-full' : '',
    ]"
  >
    <!-- Visuel -->
    <div class="relative overflow-hidden bg-tikeo-ink" :class="isTile ? 'min-h-[9rem] flex-1' : 'aspect-[1.32]'">
      <img
        :src="event.coverImage"
        alt=""
        loading="lazy"
        decoding="async"
        class="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.08]"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-[#0E2240]/90 via-[#0E2240]/20 to-[#0E2240]/10" aria-hidden="true" />
      <div class="ev-lines pointer-events-none absolute inset-0 opacity-[0.12]" aria-hidden="true" />

      <!-- Catégorie -->
      <span v-if="event.category" class="absolute left-3.5 top-3.5 flex max-w-[calc(100%-4.5rem)] items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-[12px] font-bold text-tikeo-ink shadow-sm">
        <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF7A00]" aria-hidden="true" />
        <span class="truncate">{{ event.category }}</span>
      </span>

      <!-- Favori + nombre de cœurs -->
      <button
        type="button"
        class="absolute right-3 top-3 z-[2] flex h-10 min-w-[2.5rem] items-center justify-center gap-1 rounded-full bg-[#0E2240]/55 px-2 text-white backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-[#0E2240]/75 active:scale-90"
        :class="likes > 0 ? 'px-3' : ''"
        :aria-pressed="isFavorite(event.id)"
        :aria-label="`${isFavorite(event.id) ? t('home.removeFavorite') : t('home.addFavorite')} (${likes})`"
        @click.prevent.stop="handleFavoriteClick"
      >
        <svg class="h-[18px] w-[18px] transition-colors" :class="isFavorite(event.id) ? 'fill-[#FF5A5F] text-[#FF5A5F]' : 'fill-none'" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 21s-7.5-4.6-10-9.1C.5 8.6 2.3 5 6 5c2 0 3.4 1.1 4 2.2C10.6 6.1 12 5 14 5c3.7 0 5.5 3.6 4 6.9-2.5 4.5-10 9.1-10 9.1z" />
        </svg>
        <span v-if="likes > 0" class="text-xs font-bold">{{ likesLabel }}</span>
      </button>

      <!-- Jour en grand -->
      <div v-if="!isCause" class="absolute bottom-3 left-4 leading-none text-white" :title="dateParts.full">
        <span class="block text-[12px] font-bold uppercase tracking-[0.18em] text-white/90">{{ dateParts.month }}</span>
        <span class="mt-0.5 block font-display text-[3.6rem] font-extrabold leading-[0.9] tracking-[-0.05em]">{{ dateParts.day }}</span>
      </div>
    </div>

    <!-- Contenu -->
    <div class="flex flex-1 flex-col px-5 pb-5 pt-4">
      <h3 class="font-display text-[19px] font-extrabold leading-[1.15] tracking-[-0.02em] text-tikeo-black" :class="isTile ? 'line-clamp-2' : 'line-clamp-2 min-h-[2.8rem]'" :title="event.title">
        <NuxtLink :to="eventUrl" class="after:absolute after:inset-0 after:z-[1] after:content-['']">{{ event.title }}</NuxtLink>
      </h3>

      <ul class="mt-2.5 space-y-1.5 text-[13.5px] text-tikeo-gray-text">
        <li class="flex items-center gap-2">
          <svg class="h-4 w-4 shrink-0 text-[#E05F00]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.9" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 21c-4.5-4-7-7.4-7-10.5A7 7 0 0119 10.5C19 13.6 16.5 17 12 21z" /><circle cx="12" cy="10.5" r="2.2" />
          </svg>
          <span class="flex min-w-0 flex-1 items-center gap-2">
            <span class="truncate">{{ isCause ? event.country || event.city : event.city }}<template v-if="!isCause && event.country">, {{ event.country }}</template></span>
            <img v-if="flagUrl" :src="flagUrl" alt="" width="20" height="14" loading="lazy" class="h-3.5 w-5 shrink-0 rounded-[2px] object-cover shadow-[0_0_0_1px_rgba(0,0,0,0.08)]" />
          </span>
        </li>
        <li v-if="!isCause" class="flex items-center gap-2">
          <svg class="h-4 w-4 shrink-0 text-[#E05F00]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.9" aria-hidden="true">
            <rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path stroke-linecap="round" d="M3.5 10h17M8 3v4M16 3v4" />
          </svg>
          <span class="truncate">{{ dateLabel }}</span>
        </li>
      </ul>

      <!-- Cotisation : progression -->
      <div v-if="isCause && progress !== null" class="mt-3 flex items-center gap-2">
        <div class="h-2 flex-1 overflow-hidden rounded-full bg-tikeo-surface-alt" role="progressbar" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100">
          <div class="h-full rounded-full bg-[#FF7A00]" :style="{ width: `${Math.max(progress, 3)}%` }" />
        </div>
        <span class="text-xs font-bold text-tikeo-black">{{ progress }}%</span>
      </div>

      <!-- Prix + flèche ronde (le lien étendu du titre couvre toute la carte) -->
      <div class="mt-auto flex items-center justify-between gap-3 pt-4">
        <p class="min-w-0 leading-tight">
          <template v-if="isCause">
            <span class="block text-xs font-medium text-tikeo-gray-text">{{ t('home.raised') }}</span>
            <span class="block truncate font-display text-xl font-extrabold text-tikeo-black">{{ raisedLabel }} <span class="text-sm font-bold">F CFA</span></span>
          </template>
          <template v-else-if="isFree">
            <span class="block text-xs font-medium text-tikeo-gray-text">{{ t('home.entry') }}</span>
            <span class="block font-display text-xl font-extrabold text-[#1E9E5A]">{{ t('home.free') }}</span>
          </template>
          <template v-else>
            <span class="block text-xs font-medium text-tikeo-gray-text">{{ t('home.from') }}</span>
            <span class="block truncate font-display text-xl font-extrabold text-tikeo-black">{{ formattedPrice }} <span class="text-sm font-bold">F CFA</span></span>
          </template>
        </p>
        <span class="ev-go flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tikeo-surface-alt text-tikeo-black transition-all duration-500 group-hover:-rotate-45 group-hover:bg-[#FF7A00] group-hover:text-tikeo-ink" :title="isCause ? t('home.participate') : t('home.buyShort')" aria-hidden="true">
          <svg class="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.4"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 6l6 6-6 6" /></svg>
        </span>
      </div>

      <!-- Organisateur + S'abonner -->
      <div v-if="event.organizerName" class="mt-4 flex items-center gap-2.5 border-t border-tikeo-border pt-3.5">
        <img v-if="event.organizerAvatar" :src="event.organizerAvatar" alt="" width="30" height="30" loading="lazy" class="h-[1.875rem] w-[1.875rem] shrink-0 rounded-full object-cover" />
        <span v-else class="flex h-[1.875rem] w-[1.875rem] shrink-0 items-center justify-center rounded-full bg-tikeo-ink text-[10px] font-bold text-white dark:bg-white dark:text-tikeo-ink">{{ initials }}</span>
        <p class="flex min-w-0 flex-1 items-center gap-1 text-[13px] font-bold text-tikeo-black">
          <span class="truncate" :title="event.organizerName">{{ event.organizerName }}</span>
          <svg v-if="event.verified" class="h-4 w-4 shrink-0 text-[#1E9E5A]" viewBox="0 0 24 24" fill="currentColor" role="img" :aria-label="t('home.verified')">
            <path d="M12 2l2.4 2.1 3.2-.2 1 3 2.7 1.8-.9 3.1.9 3.1-2.7 1.8-1 3-3.2-.2L12 22l-2.4-2.1-3.2.2-1-3-2.7-1.8.9-3.1-.9-3.1 2.7-1.8 1-3 3.2.2L12 2z" />
            <path d="M8.5 12.3l2.5 2.5 4.6-4.9" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </p>
        <button
          v-if="event.organizerId"
          type="button"
          class="relative z-[2] shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition-colors"
          :class="isFollowing(event.organizerId) ? 'bg-tikeo-surface-alt text-tikeo-gray-text hover:text-tikeo-black' : 'bg-[#FF7A00]/12 text-[rgb(var(--tikeo-orange-strong))] hover:bg-[#FF7A00] hover:text-tikeo-ink'"
          :aria-pressed="isFollowing(event.organizerId)"
          @click.prevent.stop="handleFollowClick"
        >
          {{ isFollowing(event.organizerId) ? t('home.following') : t('home.subscribe') }}
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
/* Fines rayures diagonales sur la photo (comme sur la maquette) : discret, donne du relief. */
.ev-lines { background-image: repeating-linear-gradient(115deg, rgba(255, 255, 255, 0.9) 0 1px, transparent 1px 18px); mix-blend-mode: soft-light; }
</style>
