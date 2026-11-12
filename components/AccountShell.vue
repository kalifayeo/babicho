<script setup lang="ts">
/**
 * Gabarit commun des pages « Mon espace » :
 *   1. un bandeau encre arrondi (halo orange, titre, sous-titre, actions) ;
 *   2. ordinateur : barre latérale à gauche + contenu à droite ;
 *      mobile : pastilles de navigation puis contenu.
 * Slots : `default`, `stats` (sous le titre, dans le bandeau), `actions`.
 * `width` : 'full' | 'wide' (contenu pleine colonne) ou 'narrow' (réglages, centré).
 * `identity` : avatar de l'utilisateur à gauche du titre.
 */
const props = withDefaults(
  defineProps<{ title: string; subtitle?: string; width?: 'full' | 'wide' | 'narrow'; identity?: boolean }>(),
  { width: 'wide', identity: false }
)

const { t } = useI18n()
const { profile } = useAuth()
const initials = computed(() => {
  const parts = (profile.value?.full_name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
})
const bodyWidth = computed(() => (props.width === 'narrow' ? 'max-w-3xl' : ''))
</script>

<template>
  <div class="type-scope pb-10 md:pb-16">
    <!-- ============ Bandeau ============ -->
    <div class="mx-auto mt-2 max-w-tikeo-content px-4 md:mt-4 md:px-6">
    <section class="relative isolate overflow-hidden rounded-[1.75rem] bg-tikeo-ink text-white md:rounded-[2.25rem]">
      <div class="pointer-events-none absolute -right-20 -top-24 -z-10 h-80 w-80 rounded-full bg-[#FF7A00]/30 blur-[90px]" aria-hidden="true" />
      <div class="pointer-events-none absolute -bottom-24 left-1/4 -z-10 h-64 w-64 rounded-full bg-[#0057B8]/35 blur-[90px]" aria-hidden="true" />
      <div class="acs-grid pointer-events-none absolute inset-0 -z-10 opacity-[0.07]" aria-hidden="true" />

      <div class="px-5 py-7 md:px-10 md:py-10">
        <div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-5">
          <div v-reveal:up class="flex min-w-0 items-center gap-4 md:gap-5">
            <UserAvatar
              v-if="identity"
              :avatar-url="profile?.avatar_url"
              :initials="initials"
              size-class="h-16 w-16 md:h-20 md:w-20 ring-4 ring-white/15"
              text-class="text-xl md:text-2xl"
            />
            <div class="min-w-0">
              <p class="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#FFB066]">
                <span class="h-1.5 w-6 rounded-full bg-[#FF7A00]" aria-hidden="true" />
                {{ t('account.eyebrow') }}
              </p>
              <h1 class="mt-2 font-display text-[1.9rem] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-4xl md:text-[2.6rem]">{{ title }}</h1>
              <p v-if="subtitle" class="mt-2 max-w-xl text-[15px] leading-relaxed text-white/70 md:text-base">{{ subtitle }}</p>
            </div>
          </div>
          <div v-if="$slots.actions" v-reveal:up="120" class="flex flex-wrap items-center gap-3 max-sm:w-full">
            <slot name="actions" />
          </div>
        </div>
        <div v-if="$slots.stats" class="mt-6 md:mt-8"><slot name="stats" /></div>
      </div>
    </section>
    </div>

    <!-- ============ Navigation + contenu ============ -->
    <div class="mx-auto max-w-tikeo-content px-4 pt-6 md:px-6 md:pt-10 lg:grid lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:gap-10">
      <aside class="lg:pt-0"><AccountNav /></aside>
      <div class="mt-7 min-w-0 lg:mt-0">
        <div class="w-full" :class="[bodyWidth, width === 'narrow' ? 'mx-auto' : '']"><slot /></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.acs-grid { background-image: linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px); background-size: 38px 38px; mask-image: radial-gradient(circle at 80% 0%, #000, transparent 70%); }
</style>
