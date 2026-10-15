<script setup lang="ts">
/**
 * Logo du site : image choisie dans l'admin (/admin/contact-reseaux), sinon le
 * logo Babicho par défaut. `light` force la version claire (pastille blanche) ; `onDark`
 * prend la version pour fonds foncés (sans pastille). Si l'image ne se charge pas, on retombe sur le logo par défaut.
 */
import { DEFAULT_LOGO } from '~/composables/useSiteBranding'

const props = withDefaults(defineProps<{ light?: boolean; onDark?: boolean; sizeClass?: string; eager?: boolean }>(), {
  light: false,
  onDark: false,
  sizeClass: undefined,
  eager: false,
})

const { name, logo, logoLight, logoDark, sizeClass: brandSize, ready } = useSiteBranding()
const failed = ref(false)
watch([logo, logoLight], () => (failed.value = false))

const src = computed(() => (failed.value ? DEFAULT_LOGO : props.onDark ? logoDark.value : props.light ? logoLight.value : logo.value))
</script>

<template>
  <img
    :src="src"
    :alt="name"
    width="174"
    height="62"
    :fetchpriority="eager ? 'high' : undefined"
    :loading="eager ? undefined : 'lazy'"
    class="w-auto object-contain transition-opacity duration-200"
    :class="[sizeClass ?? brandSize, ready ? 'opacity-100' : 'opacity-0']"
    @error="failed = true"
  />
</template>
