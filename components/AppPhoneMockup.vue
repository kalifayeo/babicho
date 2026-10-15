<script setup lang="ts">
/**
 * Téléphone dessiné en CSS : l'écran montre un événement et le billet QR,
 * tels qu'ils apparaîtront dans l'application. Aucune image de store à
 * charger, tout est vectoriel/CSS et suit les traductions.
 *
 * Animation : quand un parent porte la classe `.rv-in` (voir v-reveal),
 * l'écran se « remplit » en séquence — carte événement, puis billet, puis
 * mention « valide ». Un trait orange balaye le QR code en boucle (comme un
 * scan), et la cloche pulse. Sans parent animé (page /application), le
 * téléphone est simplement affiché.
 */
/** `compact` : téléphone un peu plus petit sur mobile (accueil). */
defineProps<{ compact?: boolean }>()
const { t } = useI18n()
</script>

<template>
  <div class="pm relative mx-auto sm:w-[17rem]" :class="compact ? 'w-[13.5rem]' : 'w-[15.5rem]'" aria-hidden="true">
    <div class="relative aspect-[9/18.6] overflow-hidden rounded-[2.4rem] border-[7px] border-black bg-white shadow-[0_30px_60px_-12px_rgba(14,34,64,0.55)]">
      <!-- encoche -->
      <span class="absolute left-1/2 top-2 z-20 h-4 w-16 -translate-x-1/2 rounded-full bg-black" />
      <!-- reflet de l'écran -->
      <span class="pm-glare pointer-events-none absolute inset-0 z-20" />

      <div class="flex h-full flex-col bg-[#F3F5F9] pt-8 text-tikeo-ink">
        <div class="flex items-center justify-between px-4 pb-2">
          <img src="/logo-babicho.png" alt="" class="h-5 w-auto" />
          <span class="relative flex h-7 w-7 items-center justify-center bg-white">
            <AppIcon name="bell" class="h-4 w-4" />
            <span class="tk-ping absolute right-1 top-1 h-2 w-2 rounded-full bg-[#FF7A00]" />
          </span>
        </div>

        <!-- événement -->
        <div class="pm-card mx-3 bg-white shadow-card">
          <div class="relative h-24 overflow-hidden bg-tikeo-ink">
            <img src="/sample-event.jpg" alt="" class="pm-cover h-full w-full object-cover" loading="lazy" />
            <span class="absolute left-2 top-2 bg-[#FF7A00] px-1.5 py-0.5 text-[9px] font-extrabold text-tikeo-ink">{{ t('appDownload.mockDate') }}</span>
          </div>
          <div class="px-3 py-2.5">
            <p class="font-display text-[13px] font-extrabold leading-tight">{{ t('appDownload.mockTitle') }}</p>
            <p class="mt-0.5 flex items-center gap-1 text-[10px] text-[#5B6B85]">
              <AppIcon name="pin" class="h-3 w-3" />{{ t('appDownload.mockPlace') }}
            </p>
          </div>
        </div>

        <!-- billet -->
        <div class="pm-ticket relative mx-3 mt-3 bg-tikeo-ink p-3 text-white">
          <div class="absolute inset-x-0 top-0 h-[3px] bg-tikeo-brand" />
          <div class="flex items-center justify-between gap-2">
            <div>
              <p class="text-[9px] font-bold uppercase tracking-wider text-white/60">{{ t('appDownload.mockTicket') }}</p>
              <p class="mt-0.5 font-display text-[13px] font-extrabold">{{ t('appDownload.mockType') }}</p>
            </div>
            <span class="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden bg-white text-tikeo-ink">
              <AppIcon name="qr" class="h-11 w-11" :stroke="1.5" />
              <!-- trait de scan -->
              <span class="pm-scan tk-deco absolute inset-x-0 top-0 h-[2px] bg-[#FF7A00]" />
            </span>
          </div>
          <div class="pm-valid mt-2.5 flex items-center gap-1.5 border-t border-dashed border-white/30 pt-2 text-[10px] font-semibold text-[#FFB267]">
            <AppIcon name="shield-check" class="h-3.5 w-3.5" />{{ t('appDownload.mockValid') }}
          </div>
        </div>

        <!-- barre du bas -->
        <div class="mt-auto flex items-center justify-around bg-white py-2.5 text-[#5B6B85]">
          <AppIcon name="home" class="h-4 w-4 text-[#FF7A00]" />
          <AppIcon name="compass" class="h-4 w-4" />
          <AppIcon name="ticket" class="h-4 w-4" />
          <AppIcon name="user" class="h-4 w-4" />
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* Non « scoped » : les animations dépendent de la classe .rv-in posée sur un
   parent par la directive v-reveal. */
@keyframes pm-in {
  from { opacity: 0; transform: translate3d(0, 26px, 0) scale(0.96); }
  to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
}
@keyframes pm-cover {
  from { transform: scale(1.25); }
  to { transform: scale(1); }
}
@keyframes pm-scan {
  0% { transform: translateY(0); opacity: 0; }
  12% { opacity: 1; }
  88% { opacity: 1; }
  100% { transform: translateY(54px); opacity: 0; }
}
@keyframes pm-glare {
  0%, 55% { transform: translateX(-120%); }
  100% { transform: translateX(120%); }
}
.pm-scan {
  box-shadow: 0 0 8px 1px rgb(255 122 0 / 0.8);
  animation: pm-scan 2.2s ease-in-out infinite;
}
.pm-glare {
  background: linear-gradient(105deg, transparent 38%, rgb(255 255 255 / 0.28) 50%, transparent 62%);
  animation: pm-glare 6s ease-in-out 2s infinite;
}
.rv-in .pm-card { animation: pm-in 0.8s var(--ease-tikeo) 0.5s backwards; }
.rv-in .pm-cover { animation: pm-cover 1.6s var(--ease-tikeo) 0.5s backwards; }
.rv-in .pm-ticket { animation: pm-in 0.8s var(--ease-tikeo) 0.85s backwards; }
.rv-in .pm-valid { animation: pm-in 0.6s var(--ease-tikeo) 1.4s backwards; }

@media (prefers-reduced-motion: reduce) {
  .pm-scan, .pm-glare { animation: none; }
}
html.ui-reduce-motion .pm-scan,
html.ui-reduce-motion .pm-glare,
html.ui-data-saver .pm-glare { animation: none; }
html.ui-reduce-motion .rv-in .pm-card,
html.ui-reduce-motion .rv-in .pm-cover,
html.ui-reduce-motion .rv-in .pm-ticket,
html.ui-reduce-motion .rv-in .pm-valid { animation: none; }
</style>
