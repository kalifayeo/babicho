/**
 * Niveau de qualité des effets 3D de l'appareil (utilisé par components/Hero3D.vue).
 *
 *   'none' : pas de WebGL du tout — « réduire les animations » (OS ou Paramètres
 *            Babicho), « économie de données », mode économie du navigateur
 *            (Save-Data) ou réseau lent (2G / 3G). La page garde son décor CSS.
 *   'lite' : smartphones, tablettes, PC modestes — scène allégée.
 *   'full' : grand écran + processeur confortable + souris — scène complète.
 *
 * Ne fait AUCUNE requête : tout est lu dans le navigateur. Côté serveur : 'none'.
 */
export type GfxTier = 'full' | 'lite' | 'none'

interface NetworkInformationLike {
  saveData?: boolean
  effectiveType?: string
}

export function gfxTier(): GfxTier {
  if (typeof window === 'undefined') return 'none'

  const root = document.documentElement
  if (root.classList.contains('ui-reduce-motion') || root.classList.contains('ui-data-saver')) return 'none'
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 'none'

  const nav = navigator as Navigator & { connection?: NetworkInformationLike; deviceMemory?: number }
  const conn = nav.connection
  if (conn?.saveData) return 'none'
  if (conn?.effectiveType && /^(slow-2g|2g|3g)$/.test(conn.effectiveType)) return 'none'

  const cores = nav.hardwareConcurrency || 4
  const memory = nav.deviceMemory // Go (Chrome / Android uniquement)
  const hasMouse = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches === true
  const roomy = window.innerWidth >= 1024
  const strong = cores >= 6 && (memory === undefined || memory >= 4)
  return roomy && hasMouse && strong ? 'full' : 'lite'
}
