<script setup lang="ts">
import type { Ref } from 'vue'
// Liste de navigation de l'espace Admin (menu latéral desktop + tiroir mobile).
// Fond sombre : éléments en pilules arrondies, élément actif en dégradé orange.
interface NavItem {
  to: string
  label: string
  icon: string
  badge?: Ref<number>
}
const props = defineProps<{
  groups: Array<{ label: string; items: NavItem[] }>
  large?: boolean
  /** Règle d'élément actif propre à l'espace (organisateur) ; sinon règle admin. */
  activeFn?: (to: string) => boolean
}>()

const route = useRoute()
function isActive(to: string) {
  if (props.activeFn) return props.activeFn(to)
  return to === '/admin' ? route.path === '/admin' || route.path === '/admin/' : route.path.startsWith(to)
}
</script>

<template>
  <nav class="admin-scroll flex-1 overflow-y-auto px-3 pb-3 pt-1">
    <div v-for="group in groups" :key="group.label" class="mb-5">
      <p class="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">{{ group.label }}</p>
      <ul class="space-y-1">
        <li v-for="item in group.items" :key="item.to">
          <NuxtLink
            :to="item.to"
            :aria-current="isActive(item.to) ? 'page' : undefined"
            class="admin-nav-link group relative flex items-center gap-3 rounded-xl px-3 font-semibold transition-all duration-200"
            :class="[
              large ? 'h-12 text-[15px]' : 'h-10 text-sm',
              isActive(item.to)
                ? 'is-active bg-gradient-to-r from-[#FF7A00] to-[#FF9A3D] text-[#0E2240]'
                : 'text-white/70 hover:bg-white/10 hover:text-white',
            ]"
          >
            <span
              class="flex shrink-0 items-center justify-center rounded-lg transition-colors"
              :class="[large ? 'h-8 w-8' : 'h-7 w-7', isActive(item.to) ? 'bg-white/30' : 'bg-white/5 group-hover:bg-white/10']"
            >
              <AppIcon :name="item.icon" :class="large ? 'h-5 w-5' : 'h-[17px] w-[17px]'" />
            </span>
            <span class="flex-1 truncate">{{ item.label }}</span>
            <span
              v-if="item.badge && item.badge.value > 0"
              class="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold"
              :class="isActive(item.to) ? 'bg-[#0E2240] text-white' : 'bg-[#FF7A00] text-[#0E2240]'"
            >{{ item.badge.value }}</span>
          </NuxtLink>
        </li>
      </ul>
    </div>
  </nav>
</template>
