<script setup lang="ts">
/**
 * En-tête commun des sections d'accueil (témoignages, actualités, partenaires) :
 * petit repère « eyebrow » avec filet dégradé, titre, sous-titre et, à droite,
 * un slot pour le lien « Tout voir » ou des onglets. `dark` = version sur fond encre.
 */
const props = withDefaults(defineProps<{ eyebrow?: string; title: string; subtitle?: string; text?: string; center?: boolean; titleId?: string; dark?: boolean }>(), {
  eyebrow: '',
  subtitle: '',
  text: '',
  center: false,
  titleId: undefined,
  dark: false,
})
const sub = computed(() => props.subtitle || props.text)
</script>

<template>
  <div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3" :class="center ? 'justify-center text-center' : ''">
    <div class="max-w-2xl" :class="center ? 'mx-auto' : ''">
      <p
        v-if="eyebrow"
        class="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em]" :style="center ? 'justify-content:center' : undefined"
        :class="dark ? 'text-[#FF9A3D]' : 'text-[rgb(var(--tikeo-orange-strong))]'"
      >
        <span class="h-1.5 w-6 rounded-full bg-tikeo-brand" aria-hidden="true" />{{ eyebrow }}
      </p>
      <h2
        :id="titleId"
        v-reveal:title
        class="font-display text-2xl font-extrabold leading-tight tracking-[-0.03em] md:text-[2rem]"
        :class="dark ? 'text-white' : 'text-tikeo-black'"
      >
        {{ title }}
      </h2>
      <p v-if="sub" class="mt-2 max-w-xl text-sm leading-relaxed md:text-base" :class="[center ? 'mx-auto' : '', dark ? 'text-white/70' : 'text-tikeo-gray-text']">
        {{ sub }}
      </p>
    </div>
    <slot />
  </div>
</template>
