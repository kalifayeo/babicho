/**
 * Image de secours pour les affiches d'événements.
 *
 * Si l'URL d'une affiche est cassée (lien mort, fichier supprimé, hébergeur
 * lent…), le navigateur affichait un grand rectangle bleu nuit vide.
 * Toute balise <img data-img-fallback> qui échoue est maintenant remplacée
 * par l'image locale /sample-event.jpg. Les logos, avatars et images du blog
 * ne sont pas concernés (pas d'attribut).
 */
const FALLBACK = '/sample-event.jpg'

function fix(img: HTMLImageElement) {
  if (!img.hasAttribute('data-img-fallback')) return
  if (img.dataset.imgFailed === '1' && img.src.endsWith(FALLBACK)) return
  img.dataset.imgFailed = '1'
  img.removeAttribute('srcset')
  img.src = FALLBACK
}

export default defineNuxtPlugin((nuxtApp) => {
  // L'événement « error » ne remonte pas : on l'écoute en phase de capture.
  document.addEventListener('error', (e) => {
    const t = e.target
    if (t instanceof HTMLImageElement) fix(t)
  }, true)

  // Images déjà en échec avant que l'application soit prête (rendu serveur).
  const scan = () => {
    document.querySelectorAll<HTMLImageElement>('img[data-img-fallback]').forEach((img) => {
      if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) fix(img)
    })
  }
  nuxtApp.hook('app:mounted', () => { scan(); setTimeout(scan, 1500) })
  nuxtApp.hook('page:finish', () => setTimeout(scan, 400))
})
