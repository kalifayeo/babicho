<script setup lang="ts">
/**
 * « Vous aimerez aussi » : événements à venir de la même ville ou de la
 * même catégorie, pour garder le visiteur sur le site après une fiche.
 * Même mise en page que les sections de l'accueil : carrousel sur mobile,
 * grille sur ordinateur.
 */
import type { EventCardData } from '~/types/database'

const props = defineProps<{ eventId: string; city?: string | null; category?: string | null }>()
const { t } = useI18n()
const events = ref<EventCardData[]>([])

async function load() {
  try {
    const supabase = useSupabase()
    const { data } = await supabase
      .from('events')
      .select(EVENT_CARD_SELECT)
      .eq('status', 'published')
      .neq('id', props.eventId)
      .or(upcomingEventsOrFilter())
      .order('start_date', { ascending: true })
      .limit(30)

    const scored = ((data as any[]) ?? [])
      .filter((e) => !isEventPast(e.start_date, e.end_date))
      .map((e) => {
      const score = (props.city && e.city === props.city ? 2 : 0) + (props.category && e.category?.name === props.category ? 1 : 0)
      return { score, card: mapEventCard(e) }
    })
    // Meilleure pertinence d'abord, puis date la plus proche (le tri de départ est conservé à score égal).
    events.value = await enrichCards(
      scored
        .map((s, i) => ({ ...s, i }))
        .sort((a, b) => b.score - a.score || a.i - b.i)
        .slice(0, 4)
        .map((s) => s.card),
    )
  } catch {
    events.value = [] // section décorative : jamais d'erreur visible
  }
}

onMounted(load)
</script>

<template>
  <section v-if="events.length" class="mx-auto max-w-tikeo-container px-4 pb-4 pt-12 md:px-6 md:pt-16">
    <div class="mb-5 flex items-end justify-between gap-4">
      <h2 class="font-display text-2xl font-extrabold tracking-tight text-tikeo-black md:text-3xl">{{ t('event.similarTitle') }}</h2>
      <NuxtLink
        to="/evenements"
        class="flex h-10 shrink-0 items-center gap-1.5 px-1 text-sm font-bold text-tikeo-black underline decoration-tikeo-orange decoration-2 underline-offset-[6px] hover:text-tikeo-orange md:px-3"
      >
        {{ t('home.seeAll') }}
      </NuxtLink>
    </div>

    <div class="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:gap-5 md:overflow-visible md:px-0">
      <EventCard v-for="e in events" :key="e.id" :event="e" variant="full" class="snap-start" />
    </div>
  </section>
</template>
