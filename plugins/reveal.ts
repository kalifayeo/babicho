/**
 * Animations au scroll de Babicho : trois directives, une seule courbe
 * (--ease-tikeo) et les mêmes effets sur mobile et ordinateur.
 *
 *  v-reveal            un élément qui apparaît quand il entre dans l'écran
 *    <h2 v-reveal:title>      effets : up (défaut) down left right zoom blur flip pop wipe title rise
 *    <p v-reveal:up="120">    valeur = délai en ms, ou { delay, duration }
 *
 *  v-stagger           les ENFANTS directs apparaissent en cascade
 *    <ul v-stagger:zoom>      pas entre deux enfants : v-stagger:up="{ step: 90 }"
 *
 *  v-parallax          décor qui glisse doucement pendant le scroll
 *    <div v-parallax="0.12">  (réservé aux éléments décoratifs)
 *
 * IMPORTANT : plugin universel (pas de suffixe .client). Sans directive côté
 * serveur, le rendu SSR plante (« getSSRProps of undefined »). getSSRProps
 * pose donc les mêmes classes que le client : le HTML serveur est déjà dans
 * l'état de départ, sans clignotement à l'hydratation.
 *
 * Les animations elles-mêmes sont en CSS (assets/css/main.css, section
 * « Animations au scroll ») : seules `opacity`, `transform`, `filter` et
 * `clip-path` bougent, donc fluide même sur un téléphone d'entrée de gamme.
 * « Réduire les animations » (OS ou Paramètres Babicho) = tout s'affiche
 * immédiatement, sans mouvement.
 */
import type { Directive, DirectiveBinding } from 'vue'

const EFFECTS = ['up', 'down', 'left', 'right', 'zoom', 'blur', 'flip', 'pop', 'wipe', 'title', 'rise'] as const
type Effect = (typeof EFFECTS)[number]

interface RevealOptions {
  delay?: number
  duration?: number
  step?: number
}

function effectOf(binding: DirectiveBinding): Effect {
  const arg = binding.arg as Effect | undefined
  return arg && (EFFECTS as readonly string[]).includes(arg) ? arg : 'up'
}

function optionsOf(binding: DirectiveBinding): RevealOptions {
  const v = binding.value
  if (typeof v === 'number') return { delay: v, step: v }
  if (v && typeof v === 'object') return v as RevealOptions
  return {}
}

function cssVars(o: RevealOptions, isStagger: boolean): string {
  const parts: string[] = []
  if (isStagger) {
    if (o.step != null) parts.push(`--rv-st:${o.step}ms`)
    if (o.delay != null) parts.push(`--rv-d:${o.delay}ms`)
  } else if (o.delay != null) {
    parts.push(`--rv-d:${o.delay}ms`)
  }
  if (o.duration != null) parts.push(`--rv-t:${o.duration}ms`)
  return parts.join(';')
}

function reducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true ||
    document.documentElement.classList.contains('ui-reduce-motion')
  )
}

// --- Un seul IntersectionObserver pour toute la page ---------------------
let io: IntersectionObserver | null = null

function observer(): IntersectionObserver | null {
  if (io) return io
  if (typeof IntersectionObserver === 'undefined') return null
  io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement
        // Déjà dépassé (rechargement au milieu de la page, saut d'ancre) :
        // on l'affiche tout de suite, sans rejouer l'animation dans le vide.
        if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
          el.classList.add('rv-in', 'rv-now')
          io!.unobserve(el)
          continue
        }
        if (entry.isIntersecting) {
          el.classList.add('rv-in')
          io!.unobserve(el)
        }
      }
    },
    // L'élément se déclenche quand son bord haut passe dans les 90 % bas de
    // l'écran : marche pour un petit titre comme pour un grand bloc.
    { threshold: 0, rootMargin: '0px 0px -10% 0px' }
  )
  return io
}

function start(el: HTMLElement) {
  if (reducedMotion()) {
    el.classList.add('rv-in', 'rv-now')
    return
  }
  const o = observer()
  if (!o) {
    el.classList.add('rv-in', 'rv-now')
    return
  }
  o.observe(el)
}

function stop(el: HTMLElement) {
  io?.unobserve(el)
}

// --- Parallaxe : un seul écouteur de scroll, un seul rAF -------------------
interface ParallaxItem {
  el: HTMLElement
  speed: number
  visible: boolean
}
const parallaxItems = new Set<ParallaxItem>()
let parallaxIo: IntersectionObserver | null = null
let ticking = false
let listening = false

function paintParallax() {
  ticking = false
  const vh = window.innerHeight
  // Sur mobile le mouvement est réduit de moitié : plus discret, moins coûteux.
  const k = window.innerWidth < 768 ? 0.5 : 1
  parallaxItems.forEach((item) => {
    if (!item.visible) return
    const r = item.el.parentElement?.getBoundingClientRect() ?? item.el.getBoundingClientRect()
    const offset = r.top + r.height / 2 - vh / 2
    item.el.style.transform = `translate3d(0, ${(offset * item.speed * k).toFixed(1)}px, 0)`
  })
}

function onScroll() {
  if (!ticking) {
    ticking = true
    requestAnimationFrame(paintParallax)
  }
}

function addParallax(item: ParallaxItem) {
  if (!parallaxIo && typeof IntersectionObserver !== 'undefined') {
    parallaxIo = new IntersectionObserver((entries) => {
      for (const e of entries) {
        for (const it of parallaxItems) {
          if (it.el === e.target) it.visible = e.isIntersecting
        }
      }
      onScroll()
    })
  }
  parallaxItems.add(item)
  parallaxIo?.observe(item.el.parentElement ?? item.el)
  if (!listening) {
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    listening = true
  }
  onScroll()
}

function removeParallax(el: HTMLElement) {
  for (const it of parallaxItems) {
    if (it.el === el) {
      parallaxItems.delete(it)
      parallaxIo?.unobserve(el.parentElement ?? el)
    }
  }
  if (parallaxItems.size === 0 && listening) {
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onScroll)
    listening = false
  }
}

// --- Directives -------------------------------------------------------------
const reveal: Directive<HTMLElement> = {
  getSSRProps(binding) {
    const vars = cssVars(optionsOf(binding), false)
    return { class: `rv rv-${effectOf(binding)}`, ...(vars ? { style: vars } : {}) }
  },
  created(el, binding) {
    el.classList.add('rv', `rv-${effectOf(binding)}`)
    const vars = cssVars(optionsOf(binding), false)
    if (vars) el.style.cssText += `;${vars}`
  },
  mounted(el) {
    start(el)
  },
  beforeUnmount(el) {
    stop(el)
  },
}

const stagger: Directive<HTMLElement> = {
  getSSRProps(binding) {
    const vars = cssVars(optionsOf(binding), true)
    return { 'data-stagger': effectOf(binding), ...(vars ? { style: vars } : {}) }
  },
  created(el, binding) {
    el.setAttribute('data-stagger', effectOf(binding))
    const vars = cssVars(optionsOf(binding), true)
    if (vars) el.style.cssText += `;${vars}`
  },
  mounted(el) {
    start(el)
  },
  beforeUnmount(el) {
    stop(el)
  },
}

const parallax: Directive<HTMLElement> = {
  // Décor uniquement : rien à rendre côté serveur.
  getSSRProps() {
    return {}
  },
  mounted(el, binding) {
    if (typeof window === 'undefined' || reducedMotion()) return
    const speed = typeof binding.value === 'number' ? binding.value : 0.1
    el.style.willChange = 'transform'
    addParallax({ el, speed, visible: false })
  },
  beforeUnmount(el) {
    removeParallax(el)
  },
}

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('reveal', reveal)
  nuxtApp.vueApp.directive('stagger', stagger)
  nuxtApp.vueApp.directive('parallax', parallax)
})
