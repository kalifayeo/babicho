/**
 * Moteur de scroll partagé (effets « scrub » : l'animation suit le doigt / la molette).
 *
 * Un SEUL écouteur de scroll passif + un SEUL requestAnimationFrame pour tout le
 * site. Seuls les éléments proches de l'écran sont recalculés (IntersectionObserver).
 * Utilisé par : v-scrub (plugins/reveal.ts), ScrollVideoSection, MarqueeBand.
 */

export type ScrubCallback = (rect: DOMRect, viewportHeight: number) => void

interface ScrubItem {
  el: HTMLElement
  fn: ScrubCallback
  visible: boolean
}

const items = new Map<Element, ScrubItem>()
let io: IntersectionObserver | null = null
let ticking = false
let listening = false

export const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n)
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
export const easeInCubic = (t: number) => t * t * t
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/**
 * Traversée de l'écran : 0 quand le haut de l'élément touche le bas de l'écran,
 * 1 quand son bas quitte le haut de l'écran.
 */
export function crossing(rect: DOMRect, vh: number): number {
  return clamp01((vh - rect.top) / (vh + rect.height))
}

/**
 * Progression d'une section « collante » (plus haute que l'écran, contenu en
 * position: sticky) : 0 au début du collage, 1 à la fin.
 */
export function stickyProgress(rect: DOMRect, vh: number): number {
  const total = rect.height - vh
  return total > 0 ? clamp01(-rect.top / total) : 0
}

function run() {
  ticking = false
  const vh = window.innerHeight
  items.forEach((it) => {
    if (it.visible) it.fn(it.el.getBoundingClientRect(), vh)
  })
}

function schedule() {
  if (!ticking) {
    ticking = true
    requestAnimationFrame(run)
  }
}

function ensureObserver(): IntersectionObserver | null {
  if (io) return io
  if (typeof IntersectionObserver === 'undefined') return null
  io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const it = items.get(e.target)
        if (!it) continue
        it.visible = e.isIntersecting
        // Dernier calcul à la sortie : l'élément se fige sur sa valeur finale
        // (0 ou 1) même si le scroll a été très rapide.
        it.fn(it.el.getBoundingClientRect(), window.innerHeight)
      }
      schedule()
    },
    // On calcule déjà un demi-écran avant l'arrivée (préchargement des vidéos).
    { rootMargin: '50% 0px 50% 0px', threshold: 0 }
  )
  return io
}

/** Abonne un élément. Retourne la fonction de désabonnement. */
export function scrub(el: HTMLElement, fn: ScrubCallback): () => void {
  if (typeof window === 'undefined') return () => {}
  const observer = ensureObserver()
  const item: ScrubItem = { el, fn, visible: !observer }
  items.set(el, item)
  observer?.observe(el)
  if (!listening) {
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })
    listening = true
  }
  schedule()
  return () => {
    items.delete(el)
    observer?.unobserve(el)
    if (items.size === 0 && listening) {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      listening = false
    }
  }
}
