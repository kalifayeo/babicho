<script setup lang="ts">
/**
 * En-tête compact « encre » des pages de tunnel (paiement, confirmation) :
 * même univers que l'accueil et la page événement (filet orange→bleu, trame
 * de perforation, étiquette en capitales, titre en Bricolage).
 * Slots : `default` (sous le titre), `aside` (à droite du titre).
 */
defineProps<{
  eyebrow?: string
  title: string
  subtitle?: string
  back?: boolean
  /** Barre d'étapes du tunnel (Billets → Paiement → Confirmation). */
  steps?: Array<{ label: string; state: 'done' | 'current' | 'todo' }>
}>()
const router = useRouter()
</script>

<template>
  <div class="mx-auto max-w-tikeo-content px-4 pt-2 md:px-6 md:pt-4">
    <section class="relative isolate overflow-hidden rounded-[1.75rem] bg-tikeo-ink text-white md:rounded-[2.5rem]">
      <div class="pointer-events-none absolute -right-20 -top-24 -z-10 h-80 w-80 rounded-full bg-[#FF7A00]/30 blur-[90px]" aria-hidden="true" />
      <div class="pointer-events-none absolute -bottom-28 left-1/4 -z-10 h-64 w-64 rounded-full bg-[#0057B8]/35 blur-[90px]" aria-hidden="true" />
      <div class="ph-grid pointer-events-none absolute inset-0 -z-10 opacity-[0.07]" aria-hidden="true" />

      <div class="px-5 py-8 sm:px-8 md:px-12 md:py-12">
        <div class="flex items-center justify-between gap-4">
          <div class="flex min-w-0 items-center gap-3 md:gap-4">
            <button
              v-if="back"
              type="button"
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:border-[#FF7A00] hover:bg-[#FF7A00] hover:text-tikeo-ink"
              aria-label="Retour"
              @click="router.back()"
            >
              <AppIcon name="chevron-left" class="h-5 w-5" :stroke="2.4" />
            </button>
            <div class="min-w-0">
              <p v-if="eyebrow" v-reveal:up class="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#FFB066]">
                <span class="h-1.5 w-6 rounded-full bg-[#FF7A00]" aria-hidden="true" />
                {{ eyebrow }}
              </p>
              <h1 v-reveal:up="80" class="font-display text-[2rem] font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-4xl md:text-[3rem]" :class="eyebrow ? 'mt-2.5' : ''" style="text-wrap: balance">{{ title }}</h1>
              <p v-if="subtitle" v-reveal:up="140" class="mt-3 max-w-xl text-[15px] leading-relaxed text-white/70 md:text-lg">{{ subtitle }}</p>
            </div>
          </div>
          <div v-if="$slots.aside" class="shrink-0">
            <slot name="aside" />
          </div>
        </div>
        <ol v-if="steps?.length" class="mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider md:mt-7 md:gap-3" aria-label="Étapes de la commande">
          <template v-for="(s, i) in steps" :key="s.label">
            <li class="flex items-center gap-2" :class="s.state === 'todo' ? 'text-white/45' : 'text-white'">
              <span
                class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px]"
                :class="s.state === 'done' ? 'bg-[#FF7A00] text-tikeo-ink' : s.state === 'current' ? 'bg-white text-tikeo-ink' : 'border border-white/30'"
              >
                <AppIcon v-if="s.state === 'done'" name="check" class="h-3.5 w-3.5" :stroke="3" />
                <template v-else>{{ i + 1 }}</template>
              </span>
              <span class="hidden sm:inline">{{ s.label }}</span>
              <span v-if="s.state === 'current'" class="sm:hidden">{{ s.label }}</span>
            </li>
            <li v-if="i < steps.length - 1" class="h-px w-5 bg-white/25 md:w-10" aria-hidden="true" />
          </template>
        </ol>
        <div v-if="$slots.default" v-reveal:up="200" class="mt-6 md:mt-7">
          <slot />
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.ph-grid { background-image: linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px); background-size: 38px 38px; mask-image: radial-gradient(circle at 85% 0%, #000, transparent 70%); }
</style>
