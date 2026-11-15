<script setup lang="ts">
import { HOME_FILTERS_PRICE_MAX } from '~/composables/useHomeFilters'

const props = withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })
const emit = defineEmits<{ apply: [] }>()

const { t } = useI18n()
const { filters, activeFilterCount, resetFilters } = useHomeFilters()
const dateOptions = useHomeDateRangeOptions()

const priceChips = computed(() => [
  { value: 0, label: t('filters.priceFree') },
  { value: 1000, label: t('filters.priceUnder', { n: '1 000' }) },
  { value: 5000, label: t('filters.priceUnder', { n: '5 000' }) },
  { value: HOME_FILTERS_PRICE_MAX, label: t('filters.priceAll') },
])

const cities = ['Abidjan', 'Bouaké', 'Yamoussoukro', 'Korhogo', 'San-Pédro', 'Man', 'Daloa', 'Gagnoa']
</script>

<template>
  <div :class="props.compact ? 'space-y-3' : 'space-y-4'">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold text-tikeo-black">{{ t('filters.title') }}</h3>
      <button
        v-if="activeFilterCount > 0"
        type="button"
        class="text-xs font-semibold text-tikeo-orange"
        @click="resetFilters"
      >
        {{ t('filters.reset', { count: activeFilterCount }) }}
      </button>
    </div>

    <div>
      <label class="mb-1 block text-xs font-medium text-tikeo-gray-text">{{ t('filters.city') }}</label>
      <select v-model="filters.city" class="input-field">
        <option :value="null">{{ t('filters.allCities') }}</option>
        <option v-for="c in cities" :key="c" :value="c">{{ c }}</option>
      </select>
    </div>

    <div>
      <label class="mb-1 block text-xs font-medium text-tikeo-gray-text">{{ t('filters.date') }}</label>
      <select v-model="filters.date" class="input-field">
        <option v-for="opt in dateOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
    </div>

    <div>
      <label class="mb-1 block text-xs font-medium text-tikeo-gray-text">{{ t('filters.priceMax') }}</label>
      <div class="mb-1 flex justify-between text-xs text-tikeo-gray-text">
        <span>0 FCFA</span>
        <span>{{ filters.priceMax >= HOME_FILTERS_PRICE_MAX ? t('filters.noLimit') : `${filters.priceMax.toLocaleString('fr-FR')} FCFA` }}</span>
      </div>
      <input v-model.number="filters.priceMax" type="range" min="0" :max="HOME_FILTERS_PRICE_MAX" step="500" class="w-full accent-tikeo-orange" />
      <div class="mt-2 flex flex-wrap gap-1.5">
        <button
          v-for="chip in priceChips"
          :key="chip.value"
          type="button"
          class="rounded-full border px-3 py-1 text-xs font-bold transition-colors"
          :class="filters.priceMax === chip.value ? 'border-[#FF7A00] bg-[#FF7A00] text-tikeo-ink' : 'border-tikeo-border bg-tikeo-surface text-tikeo-black hover:border-[#FF7A00]'"
          @click="filters.priceMax = chip.value"
        >{{ chip.label }}</button>
      </div>
    </div>

    <button type="button" class="btn-primary w-full" @click="emit('apply')">
      {{ t('filters.seeEvents') }}
    </button>
  </div>
</template>
