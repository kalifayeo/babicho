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
    v-if="isFeature"
    class="group relative flex min-h-[26rem] shrink-0 flex-col justify-end overflow-hidden rounded-2xl bg-tikeo-ink text-white shadow-card transition-shadow duration-300 hover:shadow-card-hover"
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
       Lecture de haut en bas : visuel (date, catégorie, favori) -> titre -> infos
       (date, lieu) -> prix + bouton -> organisateur. Une seule couleur d'action
       (orange), aucun texte coupé sur les infos importantes, hauteur alignée
       entre cartes voisines (le bloc prix/bouton reste calé en bas). -->
  <article
    v-else
    class="group relative flex shrink-0 flex-col overflow-hidden rounded-2xl border border-tikeo-border bg-tikeo-surface shadow-card transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-card-hover"
    :class="[
      variant === 'full' || isTile ? 'w-[78vw] max-w-[300px] md:w-full md:max-w-none' : 'w-full',
      isTile ? 'h-full' : '',
    ]"
  >
    <!-- Visuel -->
    <div class="relative overflow-hidden bg-tikeo-surface-alt" :class="isTile ? 'min-h-[9rem] flex-1' : 'aspect-[16/10]'">
      <img
        :src="event.coverImage"
        alt=""
        loading="lazy"
        decoding="async"
        class="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
      />
      <div class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent" aria-hidden="true" />

      <!-- Date (événement) : pastille calendrier -->
      <div
        v-if="!isCause"
        class="absolute left-3 top-3 flex min-w-[3rem] flex-col items-center rounded-xl bg-white px-2.5 py-1.5 leading-none text-tikeo-ink shadow-md"
        :title="dateParts.full"
      >
        <span class="text-[10px] font-extrabold uppercase tracking-wider text-[#E05F00]">{{ dateParts.month }}</span>
        <span class="mt-1 font-display text-xl font-extrabold">{{ dateParts.day }}</span>
      </div>

      <!-- Favori + nombre de cœurs -->
      <button
        type="button"
        class="absolute right-3 top-3 z-[2] flex h-9 min-w-[2.25rem] items-center justify-center gap-1 rounded-full bg-white/95 px-2 text-tikeo-ink shadow-md backdrop-blur transition-transform active:scale-90"
        :class="likes > 0 ? 'px-2.5' : ''"
        :aria-pressed="isFavorite(event.id)"
        :aria-label="`${isFavorite(event.id) ? t('home.removeFavorite') : t('home.addFavorite')} (${likes})`"
        @click.prevent.stop="handleFavoriteClick"
      >
        <svg class="h-[18px] w-[18px] transition-colors" :class="isFavorite(event.id) ? 'fill-[#EE1C25] text-[#EE1C25]' : 'fill-none hover:text-[#EE1C25]'" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 21s-7.5-4.6-10-9.1C.5 8.6 2.3 5 6 5c2 0 3.4 1.1 4 2.2C10.6 6.1 12 5 14 5c3.7 0 5.5 3.6 4 6.9-2.5 4.5-10 9.1-10 9.1z" />
        </svg>
        <span v-if="likes > 0" class="text-xs font-bold">{{ likesLabel }}</span>
      </button>

      <!-- Catégorie -->
      <span v-if="event.category" class="absolute bottom-3 left-3 flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-tikeo-ink shadow-sm">
        <svg class="h-3.5 w-3.5 shrink-0 text-[#E05F00]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 12V5a2 2 0 012-2h7l9 9-9 9-9-9z" />
          <circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" />
        </svg>
        <span class="truncate">{{ event.category }}</span>
      </span>
    </div>

    <!-- Contenu -->
    <div class="flex flex-1 flex-col p-4">
      <h3 class="font-display text-[17px] font-extrabold leading-snug tracking-tight text-tikeo-black" :class="isTile ? 'line-clamp-2' : 'line-clamp-2 min-h-[2.9rem]'" :title="event.title">
        <NuxtLink :to="eventUrl" class="after:absolute after:inset-0 after:z-[1] after:content-['']">{{ event.title }}</NuxtLink>
      </h3>

      <!-- Infos pratiques -->
      <ul class="mt-3 space-y-2 text-[13px] text-tikeo-gray-text">
        <li v-if="!isCause" class="flex items-start gap-2.5">
          <svg class="mt-px h-4 w-4 shrink-0 text-[#E05F00]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.9" aria-hidden="true">
            <rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path stroke-linecap="round" d="M3.5 10h17M8 3v4M16 3v4" />
          </svg>
          <span class="font-semibold leading-snug text-tikeo-black">{{ dateLabel }}</span>
        </li>
        <li class="flex items-start gap-2.5">
          <svg class="mt-px h-4 w-4 shrink-0 text-[#E05F00]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.9" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 21c-4.5-4-7-7.4-7-10.5A7 7 0 0119 10.5C19 13.6 16.5 17 12 21z" /><circle cx="12" cy="10.5" r="2.2" />
          </svg>
          <span class="flex min-w-0 flex-1 items-center gap-2 leading-snug">
            <span class="truncate">{{ isCause ? event.country || event.city : event.city }}<template v-if="!isCause && event.country">, {{ event.country }}</template></span>
            <img v-if="flagUrl" :src="flagUrl" alt="" width="20" height="14" loading="lazy" class="h-3.5 w-5 shrink-0 rounded-[2px] object-cover shadow-[0_0_0_1px_rgba(0,0,0,0.08)]" />
          </span>
        </li>
      </ul>

      <!-- Cotisation : progression -->
      <div v-if="isCause && progress !== null" class="mt-3 flex items-center gap-2">
        <div class="h-2 flex-1 overflow-hidden rounded-full bg-tikeo-surface-alt" role="progressbar" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100">
          <div class="h-full rounded-full bg-[#FF7A00]" :style="{ width: `${Math.max(progress, 3)}%` }" />
        </div>
        <span class="text-xs font-bold text-tikeo-black">{{ progress }}%</span>
      </div>

      <!-- Prix + bouton (calés en bas de carte) -->
      <div class="mt-auto flex items-end justify-between gap-3 pt-4">
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
        <!-- Le lien étendu du titre couvre toute la carte : ce bouton n'est que visuel -->
        <span class="flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#FF7A00] px-5 text-sm font-extrabold text-tikeo-ink shadow-[0_8px_18px_-8px_rgba(255,122,0,0.8)] transition-colors duration-200 group-hover:bg-[#F06F00]">
          {{ isCause ? t('home.participate') : t('home.buyShort') }}
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 6l6 6-6 6" /></svg>
        </span>
      </div>

      <!-- Organisateur + S'abonner -->
      <div v-if="event.organizerName" class="mt-4 flex items-center gap-2.5 border-t border-tikeo-border pt-3">
        <img v-if="event.organizerAvatar" :src="event.organizerAvatar" alt="" width="32" height="32" loading="lazy" class="h-8 w-8 shrink-0 rounded-full object-cover" />
        <span v-else class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tikeo-ink text-[11px] font-bold text-white dark:bg-white dark:text-tikeo-ink">{{ initials }}</span>
        <div class="min-w-0 flex-1 leading-tight">
          <p class="text-[11px] text-tikeo-gray-text">{{ t('home.publishedBy') }}</p>
          <p class="flex items-center gap-1 text-[13px] font-bold text-tikeo-black">
            <span class="truncate" :title="event.organizerName">{{ event.organizerName }}</span>
            <svg v-if="event.verified" class="h-4 w-4 shrink-0 text-[#1E9E5A]" viewBox="0 0 24 24" fill="currentColor" role="img" :aria-label="t('home.verified')">
              <path d="M12 2l2.4 2.1 3.2-.2 1 3 2.7 1.8-.9 3.1.9 3.1-2.7 1.8-1 3-3.2-.2L12 22l-2.4-2.1-3.2.2-1-3-2.7-1.8.9-3.1-.9-3.1 2.7-1.8 1-3 3.2.2L12 2z" />
              <path d="M8.5 12.3l2.5 2.5 4.6-4.9" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </p>
        </div>
        <button
          v-if="event.organizerId"
          type="button"
          class="relative z-[2] shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold transition-colors"
          :class="isFollowing(event.organizerId) ? 'border-tikeo-border bg-transparent text-tikeo-gray-text hover:border-tikeo-ink hover:text-tikeo-black' : 'border-tikeo-ink text-tikeo-black hover:bg-tikeo-ink hover:text-white dark:border-white/70 dark:hover:bg-white dark:hover:text-tikeo-ink'"
          :aria-pressed="isFollowing(event.organizerId)"
          @click.prevent.stop="handleFollowClick"
        >
          {{ isFollowing(event.organizerId) ? t('home.following') : t('home.subscribe') }}
        </button>
      </div>
    </div>
  </article>
</template>
