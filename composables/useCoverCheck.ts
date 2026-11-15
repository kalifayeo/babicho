export type CoverState = 'unknown' | 'ok' | 'missing' | 'broken'

/** Image de secours utilisée par le site quand un événement n'a pas d'affiche. */
export const COVER_FALLBACK = '/sample-event.jpg'

/** Teste (dans le navigateur) si une URL d'image se charge réellement. */
function probe(url: string, timeoutMs = 8000): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    const done = (ok: boolean) => {
      clearTimeout(timer)
      img.onload = img.onerror = null
      resolve(ok)
    }
    const timer = setTimeout(() => done(false), timeoutMs)
    img.onload = () => done(img.naturalWidth > 0)
    img.onerror = () => done(false)
    img.src = url
  })
}

/**
 * Contrôle des affiches d'événements pour l'admin : "missing" = aucune URL,
 * "broken" = URL qui ne charge pas (supprimée, lien mort, hôte bloqué…).
 */
export function useCoverCheck() {
  const states = ref<Record<string, CoverState>>({})
  const checking = ref(false)
  const progress = ref(0)

  const stateOf = (e: { id: string; cover_image: string | null }): CoverState =>
    !e.cover_image?.trim() ? 'missing' : states.value[e.id] ?? 'unknown'

  async function checkAll(events: { id: string; cover_image: string | null }[]) {
    checking.value = true
    progress.value = 0
    const queue = events.filter((e) => e.cover_image?.trim())
    let done = 0
    const worker = async () => {
      while (queue.length) {
        const e = queue.shift()!
        const ok = await probe(e.cover_image!)
        states.value = { ...states.value, [e.id]: ok ? 'ok' : 'broken' }
        progress.value = ++done
      }
    }
    await Promise.all(Array.from({ length: 6 }, worker))
    checking.value = false
  }

  return { states, checking, progress, stateOf, checkAll }
}
