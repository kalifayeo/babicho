<script setup lang="ts">
/**
 * Loader 3D : un cube aux couleurs de Babicho (orange, bleu nuit, bleu) qui
 * tourne et flotte au-dessus d'une ombre, avec un petit satellite en orbite.
 * Respecte « réduire les animations ».
 */
withDefaults(defineProps<{ size?: number }>(), { size: 64 })
</script>

<template>
  <div class="ld3" :style="{ '--s': size + 'px' }" role="presentation" aria-hidden="true">
    <div class="ld3-float">
      <div class="ld3-cube">
        <span class="ld3-f ld3-front" /><span class="ld3-f ld3-back" /><span class="ld3-f ld3-right" />
        <span class="ld3-f ld3-left" /><span class="ld3-f ld3-top" /><span class="ld3-f ld3-bottom" />
        <span class="ld3-core" />
      </div>
      <div class="ld3-orbit"><i /></div>
    </div>
    <div class="ld3-shadow" />
  </div>
</template>

<style scoped>
.ld3 { --h: calc(var(--s) / 2); position: relative; width: calc(var(--s) * 2); height: calc(var(--s) * 2); perspective: 600px; }
.ld3-float { position: absolute; inset: 0; display: grid; place-items: center; transform-style: preserve-3d; animation: ld3-float 2.2s ease-in-out infinite; }
.ld3-cube { position: relative; width: var(--s); height: var(--s); transform-style: preserve-3d; animation: ld3-spin 3.6s cubic-bezier(0.6, 0, 0.3, 1) infinite; }
.ld3-f { position: absolute; inset: 0; border-radius: calc(var(--s) * 0.16); border: 1px solid rgba(255, 255, 255, 0.35); backface-visibility: visible; }
.ld3-front { transform: translateZ(var(--h)); background: linear-gradient(135deg, #ff9a3d, #ff7a00); }
.ld3-back { transform: rotateY(180deg) translateZ(var(--h)); background: linear-gradient(135deg, #ff7a00, #e05f00); }
.ld3-right { transform: rotateY(90deg) translateZ(var(--h)); background: linear-gradient(135deg, #1a4a8f, #0057b8); }
.ld3-left { transform: rotateY(-90deg) translateZ(var(--h)); background: linear-gradient(135deg, #0057b8, #0e2240); }
.ld3-top { transform: rotateX(90deg) translateZ(var(--h)); background: linear-gradient(135deg, #16305a, #0e2240); }
.ld3-bottom { transform: rotateX(-90deg) translateZ(var(--h)); background: linear-gradient(135deg, #0e2240, #16305a); }
.ld3-core { position: absolute; inset: 28%; border-radius: 50%; background: #fff; opacity: 0.9; filter: blur(3px); transform: translateZ(0); }
.ld3-orbit { position: absolute; inset: 0; transform-style: preserve-3d; animation: ld3-orbit 2.4s linear infinite; }
.ld3-orbit i { position: absolute; left: 50%; top: 4%; width: calc(var(--s) * 0.16); height: calc(var(--s) * 0.16); margin-left: calc(var(--s) * -0.08); border-radius: 50%; background: #ff7a00; box-shadow: 0 0 14px #ff7a00; }
.ld3-shadow { position: absolute; left: 50%; bottom: 2%; width: var(--s); height: calc(var(--s) * 0.18); margin-left: calc(var(--s) * -0.5); border-radius: 50%; background: rgba(14, 34, 64, 0.35); filter: blur(8px); animation: ld3-shadow 2.2s ease-in-out infinite; }
@keyframes ld3-spin { from { transform: rotateX(-24deg) rotateY(0); } to { transform: rotateX(-24deg) rotateY(360deg); } }
@keyframes ld3-float { 50% { transform: translateY(-10%); } }
@keyframes ld3-shadow { 50% { transform: scale(0.75); opacity: 0.6; } }
@keyframes ld3-orbit { from { transform: rotateX(70deg) rotateZ(0); } to { transform: rotateX(70deg) rotateZ(360deg); } }
@media (prefers-reduced-motion: reduce) { .ld3-float, .ld3-cube, .ld3-orbit, .ld3-shadow { animation-duration: 12s; } }
:global(html.ui-reduce-motion) .ld3-float, :global(html.ui-reduce-motion) .ld3-orbit, :global(html.ui-reduce-motion) .ld3-shadow { animation: none; }
</style>
