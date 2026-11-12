<script setup lang="ts">
/**
 * Champ vidéo à deux modes (admin) :
 *   - « Depuis mon ordinateur » : un .mp4 / .webm part dans le bucket Storage
 *     « site-videos » et le champ récupère l'URL publique ;
 *   - « Lien internet » : lien YouTube, Vimeo ou fichier vidéo hébergé ailleurs.
 * Le parent ne reçoit qu'une chaîne (v-model). Un aperçu permet de vérifier
 * tout de suite que la vidéo se lit correctement.
 */
import { parsePresentationSource } from '~/composables/usePresentationVideo'

const props = defineProps<{ modelValue: string; label?: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const { t } = useI18n()
const { uploading, uploadVideo } = useVideoUpload()

const mode = ref<'upload' | 'url'>('upload')
const dragging = ref(false)
const uploadError = ref('')
const previewFailed = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const urlValue = computed({
  get: () => props.modelValue,
  set: (v: string) => emit('update:modelValue', v),
})
const hasValue = computed(() => Boolean(props.modelValue?.trim()))
const source = computed(() => parsePresentationSource(props.modelValue))
const urlInvalid = computed(() => hasValue.value && !source.value)
watch(() => props.modelValue, () => (previewFailed.value = false))

async function handleFiles(files: FileList | null) {
  uploadError.value = ''
  const file = files?.[0]
  if (!file) return
  try {
    emit('update:modelValue', await uploadVideo(file))
  } catch (e: any) {
    const code = e?.message
    uploadError.value =
      code === 'unsupportedType' ? t('videoInput.errorType')
      : code === 'tooLarge' ? t('videoInput.errorSize')
      : code === 'bucketMissing' ? t('videoInput.errorBucket')
      : t('videoInput.errorUpload')
  } finally {
    if (fileInput.value) fileInput.value.value = ''
  }
}

function onDrop(e: DragEvent) {
  dragging.value = false
  handleFiles(e.dataTransfer?.files ?? null)
}

function clearValue() {
  emit('update:modelValue', '')
  uploadError.value = ''
}
</script>

<template>
  <div>
    <label v-if="label" class="mb-1.5 block text-[13px] font-bold text-tikeo-black">{{ label }}</label>

    <div class="mb-2 flex gap-1">
      <button
        type="button"
        class="border px-3 py-1.5 text-xs font-medium transition"
        :class="mode === 'upload' ? 'border-tikeo-orange bg-tikeo-orange/10 text-tikeo-orange' : 'border-tikeo-border text-tikeo-gray-text hover:text-tikeo-black'"
        @click="mode = 'upload'"
      >{{ t('videoInput.tabUpload') }}</button>
      <button
        type="button"
        class="border px-3 py-1.5 text-xs font-medium transition"
        :class="mode === 'url' ? 'border-tikeo-orange bg-tikeo-orange/10 text-tikeo-orange' : 'border-tikeo-border text-tikeo-gray-text hover:text-tikeo-black'"
        @click="mode = 'url'"
      >{{ t('videoInput.tabUrl') }}</button>
    </div>

    <div
      v-if="mode === 'upload'"
      class="flex cursor-pointer flex-col items-center justify-center border border-dashed px-4 py-5 text-center transition"
      :class="dragging ? 'border-tikeo-orange bg-tikeo-orange/5' : 'border-tikeo-border hover:border-tikeo-orange/60'"
      role="button"
      tabindex="0"
      @click="!uploading && fileInput?.click()"
      @keydown.enter.prevent="!uploading && fileInput?.click()"
      @keydown.space.prevent="!uploading && fileInput?.click()"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <input ref="fileInput" type="file" class="hidden" accept="video/mp4,video/webm,.mp4,.webm" @change="handleFiles(($event.target as HTMLInputElement).files)" />
      <svg class="mb-2 h-6 w-6 text-tikeo-gray-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 16V4m0 0L8 8m4-4l4 4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
      </svg>
      <p class="text-xs font-medium text-tikeo-black">{{ uploading ? t('videoInput.uploading') : t('videoInput.dropzone') }}</p>
      <p class="mt-0.5 text-[11px] text-tikeo-gray-text">{{ t('videoInput.hint') }}</p>
    </div>

    <div v-else>
      <input v-model="urlValue" type="url" inputmode="url" class="input-field w-full" :class="urlInvalid ? '!border-red-500' : ''" :placeholder="t('videoInput.urlPlaceholder')" />
      <p v-if="urlInvalid" class="mt-1 text-[11px] font-semibold text-red-600">{{ t('videoInput.urlInvalid') }}</p>
    </div>

    <p v-if="uploadError" class="acc-alert-error mt-2 !text-xs">{{ uploadError }}</p>

    <!-- Aperçu : permet de vérifier que la vidéo se lit avant d'enregistrer -->
    <div v-if="hasValue && source" class="mt-3 border border-tikeo-border p-3">
      <div class="flex items-start justify-between gap-3">
        <p class="min-w-0 truncate text-[11px] text-tikeo-gray-text">{{ modelValue }}</p>
        <button type="button" class="shrink-0 text-[11px] font-semibold text-red-600 hover:underline" @click="clearValue">{{ t('videoInput.remove') }}</button>
      </div>
      <template v-if="source.kind === 'file'">
        <video
          v-if="!previewFailed"
          :key="source.src"
          :src="source.src"
          class="mt-2 max-h-52 w-full bg-black object-contain"
          controls
          muted
          playsinline
          preload="metadata"
          @error="previewFailed = true"
        />
        <p v-else class="acc-alert-error mt-2 !text-xs">{{ t('videoInput.previewFailed') }}</p>
      </template>
      <p v-else class="mt-2 text-xs font-semibold text-emerald-700">{{ t('videoInput.embedRecognized') }}</p>
    </div>
  </div>
</template>
