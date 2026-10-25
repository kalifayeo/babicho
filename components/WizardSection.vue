<script setup lang="ts">
/** Bloc titré d'un formulaire en plusieurs parties (création / modification d'événement). */
defineProps<{ title: string; icon?: string }>()
</script>

<template>
  <section class="flex flex-col gap-4 rounded-3xl border border-tikeo-border bg-tikeo-surface p-5 shadow-card md:p-7">
    <h2 class="flex items-center gap-3 text-[15px] font-extrabold text-tikeo-black">
      <span v-if="icon" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FF7A00]/12 text-[#E56A00]">
        <AppIcon :name="icon" class="h-[18px] w-[18px]" />
      </span>
      {{ title }}
    </h2>
    <slot />
  </section>
</template>
