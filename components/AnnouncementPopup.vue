<script setup lang="ts">
/**
 * Pop-up d'annonce (promo, information...) géré par l'admin
 * (/admin/popups) : image ou bandeau de marque, titre, message et bouton
 * d'action optionnel.
 */
import type { Popup } from '~/types/database'

const props = defineProps<{ popup: Popup }>()
const emit = defineEmits<{ (e: 'close'): void }>()
const { t } = useI18n()
const router = useRouter()

// Seuls les chemins internes et les liens http(s) sont suivis : jamais
// « javascript: » ou autre schéma, même si un contenu admin en contenait.
function resolveCta(url: string | null): { kind: 'internal' | 'external'; href: string } | null {
  const u = (url || '').trim()
  if (!u) return null
  if (u.startsWith('/') && !u.startsWith('//')) return { kind: 'internal', href: u }
  if (/^https?:\/\//i.test(u)) return { kind: 'external', href: u }
  return null
}
const cta = computed(() => (props.popup.cta_label ? resolveCta(props.popup.cta_url) : null))

function onCta() {
  if (!cta.value) return
  emit('close')
  if (cta.value.kind === 'internal') router.push(cta.value.href)
  else window.open(cta.value.href, '_blank', 'noopener,noreferrer')
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => {
  window.addEventListener('keydown', onKey)
  document.body.style.overflow = 'hidden'
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <!-- Toujours centré dans l'écran (mobile comme ordinateur) -->
    <div
      class="popup-backdrop fixed inset-0 z-[105] flex items-center justify-center overflow-hidden bg-tikeo-ink/75 p-5 backdrop-blur-md sm:p-6"
      @click.self="emit('close')"
    >
      <div
        class="popup-in relative flex max-h-[calc(100dvh-2.5rem)] w-full max-w-[22.5rem] flex-col overflow-hidden bg-tikeo-surface shadow-[0_30px_70px_-15px_rgba(8,18,38,0.65)] sm:max-w-md"
        role="dialog"
        aria-modal="true"
        :aria-label="popup.title"
      >
        <div class="absolute inset-x-0 top-0 z-20 h-1 bg-tikeo-brand" aria-hidden="true" />

        <button
          type="button"
          class="absolute right-3 top-4 z-20 flex h-10 w-10 items-center justify-center bg-tikeo-ink/55 text-white backdrop-blur transition hover:bg-tikeo-ink/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          :aria-label="t('engagement.close')"
          @click="emit('close')"
        >
          <AppIcon name="close" class="h-5 w-5" :stroke="2.4" />
        </button>

        <!-- Visuel : cadrage plus haut pour garder les visages / sujets -->
        <div class="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-tikeo-brand">
          <img v-if="popup.image_url" :src="popup.image_url" :alt="popup.title" class="h-full w-full object-cover object-[50%_28%]" />
          <template v-else>
            <div class="popup-dots absolute inset-0 opacity-30" aria-hidden="true" />
            <div class="pointer-events-none absolute -left-8 -top-8 h-40 w-40 rounded-full bg-white/25 blur-2xl" />
            <div class="pointer-events-none absolute -bottom-10 -right-6 h-48 w-48 rounded-full bg-[#FFB066]/40 blur-3xl" />
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="popup-bob flex h-24 w-24 items-center justify-center bg-white shadow-[0_18px_40px_-10px_rgba(0,0,0,0.45)]"><AppIcon name="megaphone" class="h-12 w-12 text-tikeo-ink" /></span>
            </div>
          </template>
          <!-- léger dégradé pour que le bouton fermer reste lisible sur toute image -->
          <div class="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/25 to-transparent" aria-hidden="true" />
          <!-- Bord de billet perforé -->
          <div class="popup-edge pointer-events-none absolute inset-x-0 bottom-0 h-[10px]" aria-hidden="true" />
        </div>

        <!-- Texte : défile seul si le message est long -->
        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-4 text-center">
          <h2 class="font-display text-[1.65rem] font-extrabold leading-[1.1] tracking-tight text-tikeo-black [overflow-wrap:anywhere] sm:text-3xl">{{ popup.title }}</h2>
          <span class="mx-auto mt-3 block h-[3px] w-10 bg-[#FF7A00]" aria-hidden="true" />
          <p v-if="popup.message" class="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-tikeo-gray-text [overflow-wrap:anywhere]">{{ popup.message }}</p>

          <div class="mt-6 flex flex-col gap-1">
            <button v-if="cta" type="button" class="btn-ink !h-12 w-full !text-[15px]" @click="onCta">
              {{ popup.cta_label }}<AppIcon name="arrow-right" class="h-5 w-5" :stroke="2.4" />
            </button>
            <button v-if="cta" type="button" class="w-full py-2.5 text-[13px] font-bold text-tikeo-gray-text transition-colors hover:text-tikeo-orange" @click="emit('close')">
              {{ t('engagement.later') }}
            </button>
            <button v-else type="button" class="btn-ink !h-12 w-full !text-[15px]" @click="emit('close')">
              {{ t('engagement.gotIt') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.popup-in {
  animation: popup-in 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes popup-in {
  from { opacity: 0; transform: translateY(14px) scale(0.94); }
  to { opacity: 1; transform: none; }
}
.popup-backdrop {
  animation: popup-fade 0.25s ease-out;
}
@keyframes popup-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
.popup-dots {
  background-image: radial-gradient(rgba(255, 255, 255, 0.55) 1.2px, transparent 1.4px);
  background-size: 18px 18px;
}
.popup-edge {
  background-image: radial-gradient(circle at 50% 100%, rgb(var(--tikeo-surface)) 5px, transparent 5.5px);
  background-size: 20px 10px;
}
.popup-bob { animation: popup-bob 3.4s ease-in-out infinite; }
@keyframes popup-bob {
  0%, 100% { transform: translateY(0) rotate(-4deg); }
  50% { transform: translateY(-8px) rotate(3deg); }
}
@media (prefers-reduced-motion: reduce) {
  .popup-in, .popup-bob, .popup-backdrop { animation: none; }
}
</style>
