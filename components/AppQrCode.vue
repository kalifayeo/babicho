<script setup lang="ts">
/**
 * QR code vers la page /application (qui oriente ensuite vers le bon store).
 * Généré dans le navigateur avec la bibliothèque `qrcode` déjà utilisée pour
 * les billets ; un carré blanc s'affiche pendant le chargement.
 */
import QRCode from 'qrcode'

const props = withDefaults(defineProps<{ size?: number }>(), { size: 132 })
const { t } = useI18n()
const src = ref('')

onMounted(async () => {
  try {
    src.value = await QRCode.toDataURL(`${window.location.origin}/application`, {
      margin: 1,
      width: props.size * 2,
      color: { dark: '#0E2240', light: '#FFFFFF' },
    })
  } catch {
    /* le QR est un confort : sans lui, les badges suffisent */
  }
})
</script>

<template>
  <div class="bg-white p-2 shadow-card" :style="{ width: `${size + 16}px`, height: `${size + 16}px` }">
    <img v-if="src" :src="src" :alt="t('appDownload.qrAlt')" :width="size" :height="size" class="block h-full w-full" />
  </div>
</template>
