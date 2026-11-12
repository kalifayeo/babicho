/**
 * Scène 3D décorative du hero d'accueil : des billets électroniques et des formes
 * géométriques orange / bleu qui flottent, réagissent à la souris et au défilement.
 *
 * Ce module est volontairement isolé et chargé À LA DEMANDE (import() dans
 * components/Hero3D.vue) : Three.js n'est téléchargé que sur les appareils jugés
 * capables (voir utils/gfx.ts). Aucun modèle externe : tout est généré en code
 * (géométries + textures dessinées en canvas) → poids réseau quasi nul.
 *
 * Deux niveaux de qualité :
 *   full : reflets (environnement), antialias, particules, résolution jusqu'à x1,75
 *   lite : 2 billets + 3 formes, sans reflets ni particules, résolution x1
 * Un moniteur de fluidité rétrograde tout seul (full → lite → abandon, la page
 * garde alors son décor CSS).
 */
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  AmbientLight,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  OctahedronGeometry,
  Object3D,
  PerspectiveCamera,
  PMREMGenerator,
  Points,
  PointsMaterial,
  Scene,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  WebGLRenderer,
} from 'three'
import type { Material, Texture } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

export interface HeroSceneOptions {
  lite: boolean
  /** Logo Babicho (même origine) dessiné sur le billet blanc. */
  logoUrl?: string
  /** Appelé après la première image affichée (fondu d'apparition du canvas). */
  onReady?: () => void
  /** Appelé si la scène doit être abandonnée (contexte perdu, appareil trop lent). */
  onFallback?: () => void
}

export interface HeroSceneHandle {
  destroy: () => void
  /** Suspend / reprend le rendu (ex. pendant la lecture de la vidéo plein cadre). */
  setPaused: (paused: boolean) => void
}

// --- Couleurs de marque -----------------------------------------------------------
const ORANGE = '#FF7A00'
const ORANGE_LIGHT = '#FF9A3D'
const BLUE = '#0057B8'
const BLUE_LIGHT = '#2F7FD6'
const INK = '#0A162C'

type Kind = 'orange' | 'blue' | 'white'

// --- Petit générateur pseudo-aléatoire (rendu identique à chaque chargement) ---------
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

// --- Géométrie d'un billet : rectangle arrondi + 2 encoches à l'emplacement du talon ---
const T_W = 3.2
const T_H = 1.7
const STUB = 0.74 // le talon commence à 74 % de la largeur

function ticketShape(): Shape {
  const w = T_W
  const h = T_H
  const r = 0.14
  const nr = 0.13
  const x0 = -w / 2
  const x1 = w / 2
  const y0 = -h / 2
  const y1 = h / 2
  const nx = x0 + w * STUB
  const s = new Shape()
  s.moveTo(x0 + r, y0)
  s.lineTo(nx - nr, y0)
  s.absarc(nx, y0, nr, Math.PI, 0, true)
  s.lineTo(x1 - r, y0)
  s.quadraticCurveTo(x1, y0, x1, y0 + r)
  s.lineTo(x1, y1 - r)
  s.quadraticCurveTo(x1, y1, x1 - r, y1)
  s.lineTo(nx + nr, y1)
  s.absarc(nx, y1, nr, 0, Math.PI, true)
  s.lineTo(x0 + r, y1)
  s.quadraticCurveTo(x0, y1, x0, y1 - r)
  s.lineTo(x0, y0 + r)
  s.quadraticCurveTo(x0, y0, x0 + r, y0)
  return s
}

/** UV 0..1 sur la plaque (ShapeGeometry donne les UV en coordonnées brutes). */
function remapUV(geo: ShapeGeometry) {
  const uv = geo.attributes.uv
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (uv.getX(i) + T_W / 2) / T_W, (uv.getY(i) + T_H / 2) / T_H)
  }
  uv.needsUpdate = true
}

// --- Textures dessinées en canvas ---------------------------------------------------------
const TEX_W = 1024
const TEX_H = Math.round(TEX_W * (T_H / T_W))

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function drawQr(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, fg: string, seed: number) {
  const n = 17
  const cell = size / n
  const rand = rng(seed)
  ctx.fillStyle = fg
  const finder = (fx: number, fy: number) => {
    ctx.fillRect(x + fx * cell, y + fy * cell, cell * 5, cell * 5)
    ctx.clearRect(x + (fx + 1) * cell, y + (fy + 1) * cell, cell * 3, cell * 3)
    ctx.fillRect(x + (fx + 2) * cell, y + (fy + 2) * cell, cell, cell)
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const inFinder = (i < 6 && j < 6) || (i > n - 7 && j < 6) || (i < 6 && j > n - 7)
      if (!inFinder && rand() > 0.52) ctx.fillRect(x + i * cell, y + j * cell, cell * 0.92, cell * 0.92)
    }
  }
  finder(0, 0)
  finder(n - 5, 0)
  finder(0, n - 5)
}

function drawFace(kind: Kind, logo?: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = TEX_W
  c.height = TEX_H
  const ctx = c.getContext('2d')!
  const stubX = TEX_W * STUB

  // Fond
  const g = ctx.createLinearGradient(0, 0, TEX_W, TEX_H)
  if (kind === 'orange') {
    g.addColorStop(0, ORANGE_LIGHT)
    g.addColorStop(1, '#E05F00')
  } else if (kind === 'blue') {
    g.addColorStop(0, BLUE_LIGHT)
    g.addColorStop(1, '#003C86')
  } else {
    g.addColorStop(0, '#FFFFFF')
    g.addColorStop(1, '#E9EEF6')
  }
  ctx.fillStyle = g
  ctx.fillRect(0, 0, TEX_W, TEX_H)

  const fg = kind === 'white' ? INK : '#FFFFFF'
  const soft = kind === 'white' ? 'rgba(10,22,44,0.55)' : 'rgba(255,255,255,0.78)'

  // Halo décoratif
  const halo = ctx.createRadialGradient(TEX_W * 0.25, TEX_H * 0.15, 10, TEX_W * 0.25, TEX_H * 0.15, TEX_W * 0.6)
  halo.addColorStop(0, kind === 'white' ? 'rgba(255,122,0,0.16)' : 'rgba(255,255,255,0.28)')
  halo.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, stubX, TEX_H)

  // Texte (partie principale)
  const pad = 56
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = soft
  ctx.font = '700 26px system-ui, -apple-system, "Segoe UI", sans-serif'
  const label = 'BILLET ÉLECTRONIQUE'
  ctx.save()
  ;(ctx as unknown as { letterSpacing: string }).letterSpacing = '5px'
  if (kind === 'white' && logo) {
    const lh = 78
    const lw = (logo.width / logo.height) * lh
    ctx.drawImage(logo, pad - 6, 46, lw, lh)
  } else {
    ctx.fillText(label, pad, 84)
  }
  ctx.restore()

  const titles: Record<Kind, [string, string, string]> = {
    orange: ['CONCERT LIVE', 'Abidjan · Sam. 20h30', '5 000 FCFA'],
    blue: ['FESTIVAL', 'Bouaké · Dim. 18h00', '3 000 FCFA'],
    white: ['SOIRÉE VIP', 'Yamoussoukro · Ven. 22h', '10 000 FCFA'],
  }
  const [title, sub, price] = titles[kind]
  ctx.fillStyle = fg
  ctx.font = '900 96px system-ui, -apple-system, "Segoe UI", sans-serif'
  ctx.fillText(title, pad, 250)
  ctx.fillStyle = soft
  ctx.font = '600 38px system-ui, -apple-system, "Segoe UI", sans-serif'
  ctx.fillText(sub, pad, 312)

  // Pastille de prix
  ctx.font = '800 36px system-ui, -apple-system, "Segoe UI", sans-serif'
  const pw = ctx.measureText(price).width + 56
  roundRect(ctx, pad, 360, pw, 68, 34)
  ctx.fillStyle = kind === 'white' ? ORANGE : 'rgba(255,255,255,0.95)'
  ctx.fill()
  ctx.fillStyle = kind === 'white' ? '#FFFFFF' : kind === 'orange' ? '#C54F00' : '#003C86'
  ctx.fillText(price, pad + 28, 410)

  // Code-barres décoratif
  const rand = rng(kind === 'orange' ? 7 : kind === 'blue' ? 21 : 33)
  ctx.fillStyle = kind === 'white' ? 'rgba(10,22,44,0.8)' : 'rgba(255,255,255,0.85)'
  let bx = pad
  while (bx < stubX - 70) {
    const bw = 2 + Math.floor(rand() * 5)
    ctx.fillRect(bx, 462, bw, 44)
    bx += bw + 2 + Math.floor(rand() * 4)
  }

  // Ligne de découpe pointillée
  ctx.strokeStyle = kind === 'white' ? 'rgba(10,22,44,0.35)' : 'rgba(255,255,255,0.65)'
  ctx.lineWidth = 3
  ctx.setLineDash([12, 12])
  ctx.beginPath()
  ctx.moveTo(stubX, 30)
  ctx.lineTo(stubX, TEX_H - 30)
  ctx.stroke()
  ctx.setLineDash([])

  // Talon : QR code
  const qs = 196
  const qx = stubX + (TEX_W - stubX - qs) / 2
  roundRect(ctx, qx - 14, 150, qs + 28, qs + 28, 16)
  ctx.fillStyle = '#FFFFFF'
  ctx.fill()
  drawQr(ctx, qx, 164, qs, INK, kind === 'orange' ? 3 : kind === 'blue' ? 5 : 9)
  ctx.fillStyle = soft
  ctx.font = '700 22px system-ui, -apple-system, "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('1 PERSONNE', stubX + (TEX_W - stubX) / 2, 400)
  ctx.textAlign = 'left'
  return c
}

function drawBack(kind: Kind): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = Math.round(512 * (T_H / T_W))
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, c.width, c.height)
  g.addColorStop(0, kind === 'blue' ? BLUE_LIGHT : kind === 'white' ? '#F4F7FC' : ORANGE_LIGHT)
  g.addColorStop(1, kind === 'blue' ? '#003C86' : kind === 'white' ? '#DCE4F1' : '#E05F00')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.fillStyle = kind === 'white' ? 'rgba(10,22,44,0.10)' : 'rgba(255,255,255,0.16)'
  ctx.font = '900 70px system-ui, -apple-system, "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  for (let i = 0; i < 4; i++) ctx.fillText('BABICHO', c.width / 2 + (i % 2 ? 90 : -90), 90 + i * 85)
  return c
}

function sparkTexture(): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

// --- Éléments animés ---------------------------------------------------------------------
interface Floater {
  obj: Object3D
  /** position de base en fraction de la demi-largeur / demi-hauteur visibles */
  fx: number
  fy: number
  z: number
  /** échelle de base ; pour un billet : fraction de la largeur d'écran */
  frac: number
  rotY: number
  rotZ: number
  phase: number
  amp: number
  spin: number
  ticket: boolean
  /** profondeur de parallaxe souris */
  depth: number
  delay: number
  baseScale: number
  /** limite horizontale (fraction de la demi-largeur) pour que l'objet ne soit jamais coupé */
  limit: number
}

export async function mountHeroScene(host: HTMLElement, opts: HeroSceneOptions): Promise<HeroSceneHandle> {
  let lite = opts.lite
  const canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true')
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none'

  let renderer: WebGLRenderer
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: !lite, powerPreference: 'low-power' })
  } catch {
    opts.onFallback?.()
    return { destroy() {}, setPaused() {} }
  }
  host.appendChild(canvas)
  renderer.setClearColor(0x000000, 0)
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.3
  const dprCap = () => (lite ? 1 : Math.min(window.devicePixelRatio || 1, 1.75))
  renderer.setPixelRatio(dprCap())

  const scene = new Scene()
  const camera = new PerspectiveCamera(40, 1, 0.1, 60)
  camera.position.set(0, 0, 10)

  const disposables: { dispose: () => void }[] = []
  const own = <T extends { dispose: () => void }>(x: T): T => {
    disposables.push(x)
    return x
  }

  // Lumières ; en « full » un environnement procédural donne de vrais reflets métalliques.
  scene.add(new AmbientLight(0xffffff, lite ? 1.35 : 0.55))
  const warm = new DirectionalLight(0xffb066, lite ? 1.9 : 2.2)
  warm.position.set(-4, 5, 6)
  const cool = new DirectionalLight(0x5aa9ff, lite ? 1.1 : 1.4)
  cool.position.set(5, -3, 4)
  scene.add(warm, cool)
  if (!lite) {
    const pmrem = own(new PMREMGenerator(renderer))
    const room = new RoomEnvironment()
    const envRT = pmrem.fromScene(room, 0.04)
    disposables.push({ dispose: () => envRT.dispose() })
    scene.environment = envRT.texture
    scene.environmentIntensity = 0.55
    room.traverse((o) => {
      const m = o as Mesh
      if (m.geometry) m.geometry.dispose()
    })
  }

  const world = new Group()
  scene.add(world)
  const floaters: Floater[] = []

  // --- Billets ---------------------------------------------------------------------------------
  const shape = ticketShape()
  const depth = 0.07
  const bevel = 0.028
  const bodyGeo = own(
    new ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: lite ? 12 : 28 })
  )
  bodyGeo.translate(0, 0, -depth / 2)
  const faceGeo = own(new ShapeGeometry(shape, lite ? 12 : 28))
  remapUV(faceGeo)
  const zFace = depth / 2 + bevel + 0.003

  const textures: Texture[] = []
  const whiteFaceTex: { tex: CanvasTexture | null } = { tex: null }

  function makeTicket(kind: Kind): Group {
    const bodyColor = kind === 'orange' ? '#E86A00' : kind === 'blue' ? '#004A9E' : '#F1F4FA'
    const body = new Mesh(bodyGeo, own(new MeshStandardMaterial({ color: new Color(bodyColor), metalness: 0.25, roughness: 0.38 })))
    const faceTex = new CanvasTexture(drawFace(kind))
    faceTex.colorSpace = SRGBColorSpace
    faceTex.anisotropy = lite ? 1 : 4
    textures.push(faceTex)
    if (kind === 'white') whiteFaceTex.tex = faceTex
    const face = new Mesh(faceGeo, own(new MeshStandardMaterial({ map: faceTex, metalness: 0.05, roughness: 0.5 })))
    face.position.z = zFace
    const backTex = new CanvasTexture(drawBack(kind))
    backTex.colorSpace = SRGBColorSpace
    textures.push(backTex)
    const back = new Mesh(faceGeo, own(new MeshStandardMaterial({ map: backTex, metalness: 0.05, roughness: 0.5 })))
    back.rotation.y = Math.PI
    back.position.z = -zFace
    // La face arrière est vue « de l'autre côté » : on inverse le sens horizontal des UV.
    back.scale.x = 1
    const g = new Group()
    g.add(body, face, back)
    return g
  }

  function addTicket(kind: Kind, cfg: Partial<Floater>) {
    const g = makeTicket(kind)
    world.add(g)
    floaters.push({ obj: g, fx: 0, fy: 0, z: 0, frac: 0.2, rotY: 0, rotZ: 0, phase: 0, amp: 0.14, spin: 0, ticket: true, depth: 1, delay: 0, baseScale: 1, limit: 0.96, ...cfg })
  }

  addTicket('orange', { fx: -0.7, fy: 0.66, z: 0.2, frac: 0.19, rotY: 0.55, rotZ: 0.2, phase: 0.2, depth: 1.0, delay: 0.1 })
  addTicket('blue', { fx: 0.7, fy: -0.64, z: 0, frac: 0.18, rotY: -0.55, rotZ: -0.16, phase: 2.1, depth: 0.8, delay: 0.35 })
  if (!lite) addTicket('white', { fx: 0.74, fy: 0.62, z: -2.4, frac: 0.13, rotY: -0.35, rotZ: 0.22, phase: 4.0, depth: 0.5, delay: 0.6 })

  // Logo Babicho sur le billet blanc (dès qu'il est chargé).
  if (!lite && opts.logoUrl) {
    const img = new Image()
    img.onload = () => {
      if (!whiteFaceTex.tex) return
      whiteFaceTex.tex.image = drawFace('white', img)
      whiteFaceTex.tex.needsUpdate = true
    }
    img.src = opts.logoUrl
  }

  // --- Formes géométriques -------------------------------------------------------------------
  const shapeMat = (color: string, metalness: number, roughness: number) =>
    own(new MeshStandardMaterial({ color: new Color(color), metalness, roughness, flatShading: true }))

  function addShape(geo: BufferGeometry, mat: Material, cfg: Partial<Floater>) {
    own(geo)
    const m = new Mesh(geo, mat)
    world.add(m)
    floaters.push({ obj: m, fx: 0, fy: 0, z: 0, frac: 1, rotY: 0, rotZ: 0, phase: 0, amp: 0.2, spin: 0.35, ticket: false, depth: 1.4, delay: 0, baseScale: 1, limit: 0.96, ...cfg })
  }
  addShape(new IcosahedronGeometry(0.5, 0), shapeMat(ORANGE, 0.55, 0.28), { fx: -0.52, fy: -0.64, z: 1.2, baseScale: 1, phase: 1.3, spin: 0.5, depth: 1.6, delay: 0.5 })
  addShape(new TorusGeometry(0.44, 0.14, lite ? 10 : 16, lite ? 26 : 48), shapeMat(BLUE, 0.5, 0.3), { fx: 0.5, fy: 0.66, z: 0.8, baseScale: 1, phase: 3.2, spin: 0.42, depth: 1.5, delay: 0.7 })
  addShape(new OctahedronGeometry(0.34, 0), shapeMat('#FFC48A', 0.35, 0.3), { fx: 0.9, fy: 0.08, z: 1.6, baseScale: 1, phase: 5.0, spin: 0.6, depth: 1.9, delay: 0.85 })
  if (!lite) {
    addShape(new SphereGeometry(0.2, 24, 20), shapeMat(BLUE_LIGHT, 0.2, 0.2), { fx: -0.9, fy: -0.1, z: 1.4, baseScale: 1, phase: 0.8, spin: 0.1, depth: 1.8, delay: 0.9 })
    addShape(new SphereGeometry(0.14, 20, 16), shapeMat(ORANGE_LIGHT, 0.3, 0.25), { fx: -0.3, fy: 0.78, z: 1.0, baseScale: 1, phase: 2.6, spin: 0.1, depth: 1.7, delay: 1.0 })
    addShape(new IcosahedronGeometry(0.22, 0), shapeMat(BLUE, 0.4, 0.3), { fx: 0.32, fy: -0.78, z: 0.9, baseScale: 1, phase: 4.4, spin: 0.7, depth: 1.5, delay: 1.1 })
  }

  // --- Particules (full uniquement) ----------------------------------------------------------
  let particles: Points | null = null
  let particleBase: Float32Array | null = null
  if (!lite) {
    const count = 90
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const rand = rng(42)
    const o = new Color(ORANGE_LIGHT)
    const w = new Color('#FFFFFF')
    const b = new Color(BLUE_LIGHT)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rand() - 0.5) * 18
      pos[i * 3 + 1] = (rand() - 0.5) * 9
      pos[i * 3 + 2] = -3 + rand() * 6
      const c = rand() < 0.5 ? o : rand() < 0.6 ? w : b
      col.set([c.r, c.g, c.b], i * 3)
    }
    particleBase = pos.slice()
    const geo = own(new BufferGeometry())
    geo.setAttribute('position', new Float32BufferAttribute(pos, 3))
    geo.setAttribute('color', new Float32BufferAttribute(col, 3))
    const tex = own(sparkTexture())
    const mat = own(new PointsMaterial({ size: 0.16, map: tex, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, blending: AdditiveBlending, sizeAttenuation: true }))
    particles = new Points(geo, mat)
    world.add(particles)
  }

  // --- Mise en page selon le format de l'écran -------------------------------------------------
  let halfW = 6
  let halfH = 3.6
  let portrait = false
  function resize() {
    const w = Math.max(host.clientWidth, 1)
    const h = Math.max(host.clientHeight, 1)
    renderer.setPixelRatio(dprCap())
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    halfH = Math.tan(MathUtils.degToRad(camera.fov / 2)) * camera.position.z
    halfW = halfH * camera.aspect
    portrait = camera.aspect < 1.2
    for (const f of floaters) {
      if (f.ticket) {
        // billet : largeur = frac × largeur d'écran (plus grand en portrait pour rester lisible)
        const frac = portrait ? f.frac * 1.7 : f.frac
        f.baseScale = (frac * 2 * halfW) / T_W
        f.limit = Math.max(0.2, 0.95 - frac * 1.1)
      } else {
        f.baseScale = portrait ? Math.max(0.55, halfW / 4.2) : Math.min(1.25, Math.max(0.8, halfW / 5.4))
      }
    }
  }
  resize()
  const ro = new ResizeObserver(resize)
  ro.observe(host)

  // --- Interaction : souris + défilement -----------------------------------------------------------
  let tx = 0
  let ty = 0
  let px = 0
  let py = 0
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    const r = host.getBoundingClientRect()
    tx = MathUtils.clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1)
    ty = MathUtils.clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1)
  }
  window.addEventListener('pointermove', onMove, { passive: true })

  // --- Boucle de rendu (suspendue hors écran / onglet masqué) ------------------------------------------
  let raf = 0
  let running = false
  let inView = true
  let externallyPaused = false
  let destroyed = false
  let t0 = performance.now()
  let last = t0
  let frames = 0
  let slowFrames = 0
  let readyFired = false
  let downgraded = false

  const io = new IntersectionObserver((entries) => {
    inView = entries[0]?.isIntersecting ?? true
    syncRunning()
  })
  io.observe(host)
  const onVis = () => syncRunning()
  document.addEventListener('visibilitychange', onVis)

  function syncRunning() {
    const should = inView && !externallyPaused && !document.hidden && !destroyed
    if (should && !running) {
      running = true
      last = performance.now()
      raf = requestAnimationFrame(frame)
    } else if (!should && running) {
      running = false
      cancelAnimationFrame(raf)
    }
  }

  const easeOutBack = (x: number) => {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
  }

  function frame(now: number) {
    if (!running) return
    raf = requestAnimationFrame(frame)
    const dt = now - last
    last = now
    const t = (now - t0) / 1000

    // Moniteur de fluidité : si l'appareil peine, on rétrograde puis on abandonne la 3D.
    frames++
    if (frames > 40) {
      slowFrames = dt > 38 ? slowFrames + 1 : Math.max(0, slowFrames - 1)
      if (slowFrames > 25) {
        slowFrames = 0
        if (!lite && !downgraded) {
          downgraded = true
          lite = true
          renderer.setPixelRatio(1)
          if (particles) particles.visible = false
          scene.environment = null
          resize()
        } else {
          opts.onFallback?.()
          destroy()
          return
        }
      }
    }

    // Souris amortie
    px += (tx - px) * 0.06
    py += (ty - py) * 0.06
    const scrollY = window.scrollY || 0

    world.rotation.y = px * 0.1
    world.rotation.x = py * 0.05
    world.position.y = scrollY * 0.0035

    for (const f of floaters) {
      const k = MathUtils.clamp((t - f.delay) / 1.3, 0, 1)
      const grow = k === 0 ? 0.0001 : easeOutBack(k)
      const s = f.baseScale * grow
      f.obj.scale.setScalar(s)
      const bob = Math.sin(t * 0.8 + f.phase) * f.amp
      const fx = MathUtils.clamp(f.fx, -f.limit, f.limit)
      f.obj.position.set(fx * halfW + px * 0.22 * f.depth, f.fy * halfH + bob - py * 0.14 * f.depth, f.z)
      if (f.ticket) {
        f.obj.rotation.set(Math.sin(t * 0.4 + f.phase) * 0.08 - py * 0.16, f.rotY + Math.sin(t * 0.5 + f.phase) * 0.2 + px * 0.3, f.rotZ + Math.sin(t * 0.35 + f.phase) * 0.04)
      } else {
        f.obj.rotation.x += 0.004 * f.spin * (dt / 16)
        f.obj.rotation.y += 0.006 * f.spin * (dt / 16)
      }
    }

    if (particles && particleBase) {
      const arr = particles.geometry.attributes.position as Float32BufferAttribute
      for (let i = 0; i < arr.count; i++) {
        arr.setY(i, particleBase[i * 3 + 1] + Math.sin(t * 0.35 + i) * 0.22)
        arr.setX(i, particleBase[i * 3] + Math.cos(t * 0.25 + i * 1.7) * 0.12)
      }
      arr.needsUpdate = true
      particles.rotation.y = t * 0.02
    }

    renderer.render(scene, camera)
    if (!readyFired) {
      readyFired = true
      opts.onReady?.()
    }
  }

  const onLost = (e: Event) => {
    e.preventDefault()
    opts.onFallback?.()
    destroy()
  }
  canvas.addEventListener('webglcontextlost', onLost)

  function destroy() {
    if (destroyed) return
    destroyed = true
    running = false
    cancelAnimationFrame(raf)
    io.disconnect()
    ro.disconnect()
    document.removeEventListener('visibilitychange', onVis)
    window.removeEventListener('pointermove', onMove)
    canvas.removeEventListener('webglcontextlost', onLost)
    for (const t of textures) t.dispose()
    for (const d of disposables) d.dispose()
    renderer.dispose()
    renderer.forceContextLoss()
    canvas.remove()
  }

  syncRunning()
  return {
    destroy,
    setPaused(p: boolean) {
      externallyPaused = p
      syncRunning()
    },
  }
}
