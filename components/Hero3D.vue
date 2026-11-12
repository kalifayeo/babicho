<script setup lang="ts">
/**
 * Décor 3D du hero d'accueil : billets électroniques et formes orange / bleu qui flottent.
 *
 *  • Rendu serveur : seulement un décor CSS 3D (2 billets inclinés) — aucun JavaScript,
 *    aucun impact sur le SEO ni sur le premier affichage.
 *  • Sur les appareils capables (utils/gfx.ts), la vraie scène Three.js est chargée À LA
 *    DEMANDE, quand le navigateur est au repos (≈ 138 Ko gzip, jamais sur 2G/3G,
 *    « économie de données » ou « réduire les animations »), puis fond en douceur sur le décor CSS.
 *  • Si l'appareil peine ou perd le contexte WebGL, la scène se retire seule et le décor CSS revient.
 * Entièrement décoratif : aria-hidden, aucun élément cliquable.
 */
const props = withDefaults(defineProps<{ paused?: boolean }>(), { paused: false })

const host = ref<HTMLElement | null>(null)
const ready = ref(false)

let handle: { destroy: () => void; setPaused: (p: boolean) => void } | null = null
let cancelled = false
let idleHandle: number | ReturnType<typeof setTimeout> = 0

onMounted(() => {
  const tier = gfxTier()
  if (tier === 'none') return

  const start = async () => {
    if (cancelled || !host.value) return
    try {
      const mod = await import('~/utils/three/heroScene')
      if (cancelled || !host.value) return
      const h = await mod.mountHeroScene(host.value, {
        lite: tier === 'lite',
        logoUrl: '/logo-babicho.png',
        onReady: () => {
          ready.value = true
        },
        onFallback: () => {
          ready.value = false
        },
      })
      if (cancelled) {
        h.destroy()
        return
      }
      handle = h
      h.setPaused(props.paused)
    } catch {
      ready.value = false
    }
  }

  // On attend que la page soit affichée et le navigateur au repos : la 3D ne retarde jamais le contenu.
  if ('requestIdleCallback' in window) idleHandle = window.requestIdleCallback(start, { timeout: 2500 })
  else idleHandle = setTimeout(start, 1200)
})

watch(
  () => props.paused,
  (p) => handle?.setPaused(p)
)

onBeforeUnmount(() => {
  cancelled = true
  if (typeof idleHandle === 'number' && 'cancelIdleCallback' in window) window.cancelIdleCallback(idleHandle)
  else clearTimeout(idleHandle as ReturnType<typeof setTimeout>)
  handle?.destroy()
  handle = null
})
</script>

<template>
  <div ref="host" class="h3d-host pointer-events-none absolute inset-0 overflow-hidden" :class="{ 'is-ready': ready }" aria-hidden="true">
    <!-- Décor CSS 3D : affiché dès le rendu serveur, remplacé en fondu par la scène WebGL -->
    <div class="h3d-fallback">
      <div class="h3d-ticket h3d-ticket--orange">
        <span class="h3d-kicker">BILLET ÉLECTRONIQUE</span>
        <span class="h3d-title">CONCERT LIVE</span>
        <span class="h3d-sub">Abidjan · Sam. 20h30</span>
        <span class="h3d-qr" />
      </div>
      <div class="h3d-ticket h3d-ticket--blue">
        <span class="h3d-kicker">BILLET ÉLECTRONIQUE</span>
        <span class="h3d-title">FESTIVAL</span>
        <span class="h3d-sub">Bouaké · Dim. 18h00</span>
        <span class="h3d-qr" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.h3d-host :deep(canvas) {
  opacity: 0;
  transition: opacity 0.9s ease;
}
.h3d-host.is-ready :deep(canvas) {
  opacity: 1;
}
.h3d-fallback {
  position: absolute;
  inset: 0;
  display: none;
  transition: opacity 0.7s ease;
}
.h3d-host.is-ready .h3d-fallback {
  opacity: 0;
}
@media (min-width: 640px) {
  .h3d-fallback {
    display: block;
  }
}

.h3d-ticket {
  --tilt: 28deg;
  position: absolute;
  width: clamp(11rem, 19vw, 17rem);
  aspect-ratio: 3.2 / 1.7;
  border-radius: 0.9rem;
  padding: 1.1rem 1.2rem;
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  box-shadow: 0 30px 50px -22px rgba(0, 0, 0, 0.7);
  /* encoches du talon, comme un vrai billet */
  -webkit-mask: radial-gradient(circle 0.55rem at 74% 0, #0000 97%, #000) top / 100% 51% no-repeat, radial-gradient(circle 0.55rem at 74% 100%, #0000 97%, #000) bottom / 100% 51% no-repeat;
  mask: radial-gradient(circle 0.55rem at 74% 0, #0000 97%, #000) top / 100% 51% no-repeat, radial-gradient(circle 0.55rem at 74% 100%, #0000 97%, #000) bottom / 100% 51% no-repeat;
  will-change: transform;
}
.h3d-ticket--orange {
  left: 4%;
  top: 14%;
  background: linear-gradient(135deg, #ff9a3d, #e05f00);
  transform: perspective(900px) rotateY(var(--tilt)) rotateZ(-7deg);
  animation: h3d-bob-a 7s ease-in-out infinite;
}
.h3d-ticket--blue {
  right: 4%;
  bottom: 14%;
  background: linear-gradient(135deg, #2f7fd6, #003c86);
  transform: perspective(900px) rotateY(calc(var(--tilt) * -1)) rotateZ(6deg);
  animation: h3d-bob-b 8s ease-in-out -2s infinite;
}
.h3d-kicker {
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.22em;
  opacity: 0.78;
}
.h3d-title {
  margin-top: 0.35rem;
  font-size: clamp(1rem, 1.7vw, 1.55rem);
  font-weight: 900;
  line-height: 1;
}
.h3d-sub {
  font-size: clamp(0.55rem, 0.8vw, 0.75rem);
  font-weight: 600;
  opacity: 0.85;
}
.h3d-qr {
  position: absolute;
  right: 6%;
  top: 50%;
  width: 17%;
  aspect-ratio: 1;
  transform: translateY(-50%);
  border-radius: 0.25rem;
  background:
    conic-gradient(from 90deg at 50% 50%, #0a162c 25%, #fff 0 50%, #0a162c 0 75%, #fff 0) 0 0 / 28% 28%,
    #fff;
  box-shadow: 0 0 0 0.25rem #fff;
}
@keyframes h3d-bob-a {
  0%, 100% { translate: 0 0; rotate: 0deg; }
  50% { translate: 0 -14px; rotate: 1.5deg; }
}
@keyframes h3d-bob-b {
  0%, 100% { translate: 0 0; rotate: 0deg; }
  50% { translate: 0 12px; rotate: -1.5deg; }
}
@media (prefers-reduced-motion: reduce) {
  .h3d-ticket { animation: none !important; }
}
:global(html.ui-reduce-motion) .h3d-ticket,
:global(html.ui-data-saver) .h3d-ticket {
  animation: none !important;
}
</style>
