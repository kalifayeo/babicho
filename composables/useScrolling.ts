/**
 * Vrai pendant que la page défile, faux ~250 ms après l'arrêt du défilement.
 * Sert à faire disparaître les boutons flottants du bas (barre de navigation,
 * WhatsApp) pendant le scroll puis à les refaire apparaître. Un seul écouteur
 * `scroll` (passif) est installé pour toute l'application.
 */
let installed = false

export function useScrolling() {
  const scrolling = useState<boolean>('tikeo-scrolling', () => false)

  if (import.meta.client && !installed) {
    installed = true
    let lastY = window.scrollY
    let timer: ReturnType<typeof setTimeout> | undefined
    window.addEventListener(
      'scroll',
      () => {
        const y = window.scrollY
        if (Math.abs(y - lastY) < 3) return // ignore les micro-mouvements
        lastY = y
        scrolling.value = true
        clearTimeout(timer)
        timer = setTimeout(() => {
          scrolling.value = false
        }, 250)
      },
      { passive: true },
    )
  }

  return scrolling
}
