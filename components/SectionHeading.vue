<script setup lang="ts">
/**
 * En-tête commun des sections d'accueil (témoignages, actualités, partenaires) :
 * petit repère « eyebrow » avec filet dégradé, titre, sous-titre et, à droite,
 * un slot pour le lien « Tout voir » ou des onglets. `dark` = version sur fond encre.
 */
withDefaults(defineProps<{ eyebrow?: string; title: string; subtitle?: string; titleId?: string; dark?: boolean }>(), {
  eyebrow: '',
  subtitle: '',
  titleId: undefined,
  dark: false,
})
</script>

<template>
  <div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
    <div class="max-w-2xl">
      <p
        v-if="eyebrow"
        class="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] md:text-[11px]"
        :class="dark ? 'text-[#FF9A3D]' : 'text-[rgb(var(--tikeo-orange-strong))]'"
      >
        <span class="h-0.5 w-6 bg-tikeo-brand" aria-hidden="true" />{{ eyebrow }}
      </p>
      <h2
        :id="titleId"
        v-reveal:title
        class="font-display text-lg font-extrabold leading-tight tracking-tight md:text-2xl"
        :class="dark ? 'text-white' : 'text-tikeo-black'"
      >
        {{ title }}
      </h2>
      <p v-if="subtitle" class="mt-1 max-w-xl text-[13px] leading-relaxed md:text-sm" :class="dark ? 'text-white/70' : 'text-tikeo-gray-text'">
        {{ subtitle }}
      </p>
    </div>
    <slot />
  </div>
</template>
