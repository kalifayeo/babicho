<script setup lang="ts">
/**
 * Objectif d'une cause (somme demandée) + barre de progression, sur la page publique.
 * N'est affiché que si l'organisateur a renseigné un objectif ET choisi de l'afficher :
 * dans le cas contraire le serveur ne renvoie pas `goalAmount` et rien n'apparaît.
 */
const props = defineProps<{ slug: string }>()
const { t } = useI18n()

const goal = ref<number | null>(null)
const collected = ref(0)

onMounted(async () => {
  try {
    const res = await $fetch<{ goalAmount: number | null; totalAmount: number | null }>(
      `/api/causes/${encodeURIComponent(props.slug)}/contributions`,
      { query: { limit: 0 } }
    )
    goal.value = res.goalAmount
    collected.value = res.totalAmount ?? 0
  } catch {
    goal.value = null
  }
})

const percent = computed(() => (goal.value ? Math.min(Math.round((collected.value / goal.value) * 100), 100) : 0))
const fmt = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`
</script>

<template>
  <div v-if="goal" class="mb-5 border border-tikeo-border bg-tikeo-surface p-5 shadow-card">
    <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <p>
        <span class="font-display text-2xl font-extrabold text-tikeo-black">{{ fmt(collected) }}</span>
        <span class="ml-2 text-sm text-tikeo-gray-text">{{ t('event.goalCollectedOf', { goal: fmt(goal) }) }}</span>
      </p>
      <p class="text-sm font-bold text-tikeo-black">{{ percent }}%</p>
    </div>
    <div
      class="mt-3 h-2.5 w-full overflow-hidden bg-tikeo-border"
      role="progressbar"
      :aria-valuenow="percent"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="t('event.goalProgressAria')"
    >
      <div class="h-full bg-[#FF7A00] transition-[width] duration-500 motion-reduce:transition-none" :style="{ width: `${percent}%` }" />
    </div>
    <p v-if="collected >= goal" class="mt-2 text-xs font-semibold text-tikeo-success">{{ t('event.goalReached') }}</p>
  </div>
</template>
