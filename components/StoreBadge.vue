<script setup lang="ts">
/**
 * Badge « Télécharger sur l'App Store » / « Disponible sur Google Play ».
 * Les liens viennent de NUXT_PUBLIC_APP_STORE_URL / NUXT_PUBLIC_PLAY_STORE_URL.
 * Tant qu'un lien est vide, le badge reste cliquable (il mène à /application)
 * et porte une pastille « Bientôt » : aucun faux lien de store.
 */
const props = defineProps<{ store: 'apple' | 'google'; size?: 'sm' | 'md' | 'lg' }>()
const { t } = useI18n()
const config = useRuntimeConfig()

const url = computed(() => String((props.store === 'apple' ? config.public.appStoreUrl : config.public.playStoreUrl) || ''))
const live = computed(() => !!url.value)
const name = computed(() => (props.store === 'apple' ? 'App Store' : 'Google Play'))
const small = computed(() => (props.store === 'apple' ? t('stores.appleSmall') : t('stores.googleSmall')))
const label = computed(() => `${small.value} ${name.value}${live.value ? '' : ` — ${t('stores.soonLabel')}`}`)

function onClick(e: MouseEvent) {
  if (live.value) return
  e.preventDefault()
  navigateTo('/application')
}
</script>

<template>
  <a
    :href="live ? url : '/application'"
    :target="live ? '_blank' : undefined"
    :rel="live ? 'noopener noreferrer' : undefined"
    :aria-label="label"
    class="relative inline-flex shrink-0 items-center rounded-[10px] border border-[#A6A6A6] bg-black text-white transition-colors duration-200 hover:bg-[#1c1c1c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    :class="size === 'lg' ? 'h-[3.4rem] gap-2.5 pl-3.5 pr-4' : size === 'sm' ? 'h-10 gap-2 pl-2.5 pr-3' : 'h-12 gap-2.5 pl-3.5 pr-4'"
    @click="onClick"
  >
    <!-- Apple -->
    <svg v-if="store === 'apple'" class="shrink-0" :class="size === 'sm' ? 'h-5 w-5' : 'h-7 w-7'" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
    <!-- Google Play (4 facettes) -->
    <svg v-else class="shrink-0" :class="size === 'sm' ? 'h-5 w-5' : 'h-7 w-7'" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#FFD500" d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594z" />
      <path fill="#00A0FF" d="M1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924z" />
      <path fill="#00E676" d="M13.544 10.989l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973z" />
      <path fill="#FF3D4A" d="M13.544 13.056l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z" />
    </svg>

    <span class="flex flex-col text-left leading-none">
      <span class="font-medium tracking-wide text-white/90" :class="size === 'sm' ? 'text-[8px]' : size === 'lg' ? 'text-[10px] sm:text-[11px]' : 'text-[10px]'">{{ small }}</span>
      <span class="mt-0.5 font-display font-semibold tracking-tight" :class="size === 'lg' ? 'text-[1.4rem]' : size === 'sm' ? 'text-[15px]' : 'text-xl'">{{ name }}</span>
    </span>

    <span
      v-if="!live"
      class="absolute -right-1.5 -top-2 bg-white px-1 py-px text-[9px] font-extrabold uppercase tracking-wide text-tikeo-ink shadow-card ring-1 ring-black/10"
    >
      {{ t('stores.soon') }}
    </span>
  </a>
</template>
