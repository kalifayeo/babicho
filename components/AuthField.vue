<script setup lang="ts">
/**
 * Champ de formulaire des pages d'authentification : libellé au-dessus,
 * champ arrondi 48 px avec icône optionnelle à gauche (bordure orange au
 * focus) et un œil pour afficher / masquer le mot de passe. Les attributs
 * natifs (name, autocomplete, required, maxlength, placeholder, class…) vont
 * sur l'<input> ; `wrapperClass` s'applique au conteneur (ex. sm:col-span-2).
 */
defineOptions({ inheritAttrs: false })
const props = defineProps<{ modelValue: string; label: string; type?: string; hint?: string; icon?: string; wrapperClass?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const { t } = useI18n()

const show = ref(false)
const isPassword = computed(() => props.type === 'password')
const inputType = computed(() => (isPassword.value && show.value ? 'text' : props.type || 'text'))
</script>

<template>
  <label class="block" :class="wrapperClass">
    <span class="mb-1.5 block text-[13px] font-semibold text-tikeo-black">{{ label }}</span>
    <span class="group relative block">
      <AppIcon
        v-if="icon"
        :name="icon"
        class="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-tikeo-gray-text transition-colors group-focus-within:text-[rgb(var(--tikeo-orange-strong))]"
      />
      <input
        v-bind="$attrs"
        :type="inputType"
        :value="modelValue"
        class="field-input !h-12 rounded-xl border-tikeo-border bg-tikeo-surface-alt/50 focus:bg-tikeo-surface"
        :class="[icon ? 'pl-11' : '', isPassword ? 'pr-12' : '']"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <button
        v-if="isPassword"
        type="button"
        class="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-tikeo-gray-text transition-colors hover:text-tikeo-black"
        :aria-label="show ? t('authLayout.hidePassword') : t('authLayout.showPassword')"
        @click.prevent="show = !show"
      >
        <AppIcon :name="show ? 'eye-off' : 'eye'" class="h-5 w-5" />
      </button>
    </span>
    <span v-if="hint" class="mt-1.5 block text-xs text-tikeo-gray-text">{{ hint }}</span>
  </label>
</template>
