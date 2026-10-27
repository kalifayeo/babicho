/**
 * Mini-convertisseur Markdown → HTML pour les articles du blog.
 *
 * Sécurité : le texte est ÉCHAPPÉ en premier (aucun HTML saisi n'est conservé),
 * puis seules des balises produites ici sont ajoutées. Les liens et images
 * n'acceptent que http(s) ou un chemin interne : jamais « javascript: ».
 *
 * Syntaxe : ## Titre, ### Sous-titre, **gras**, *italique*, [lien](url),
 * ![image](url), > citation, - liste, 1. liste numérotée, --- séparateur.
 */
export function escapeHtmlText(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function safeUrl(raw: string) {
  // Le texte est déjà échappé (&amp; &quot;…) : on ne touche qu'au schéma.
  const url = raw.trim()
  if (/^https?:\/\//i.test(url) || (url.startsWith('/') && !url.startsWith('//') && !url.includes('\\'))) return url
  return ''
}

function inline(text: string) {
  return text
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt, url) => {
      const u = safeUrl(url)
      return u ? `<img src="${u}" alt="${alt}" loading="lazy" decoding="async" />` : alt
    })
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, url) => {
      const u = safeUrl(url)
      if (!u) return label
      const external = /^https?:\/\//i.test(u)
      return `<a href="${u}"${external ? ' target="_blank" rel="noopener noreferrer nofollow"' : ''}>${label}</a>`
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
}

export function renderMarkdown(source: string): string {
  const lines = escapeHtmlText((source || '').replace(/\r\n/g, '\n')).split('\n')
  const out: string[] = []
  let para: string[] = []
  let list: { tag: 'ul' | 'ol'; items: string[] } | null = null
  let quote: string[] = []

  const flushPara = () => {
    if (para.length) out.push(`<p>${inline(para.join('<br />'))}</p>`)
    para = []
  }
  const flushList = () => {
    if (list) out.push(`<${list.tag}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.tag}>`)
    list = null
  }
  const flushQuote = () => {
    if (quote.length) out.push(`<blockquote>${inline(quote.join('<br />'))}</blockquote>`)
    quote = []
  }
  const flushAll = () => {
    flushPara()
    flushList()
    flushQuote()
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    let m: RegExpMatchArray | null
    if (!line.trim()) {
      flushAll()
    } else if ((m = line.match(/^(#{2,3})\s+(.*)$/))) {
      flushAll()
      const level = m[1].length
      out.push(`<h${level}>${inline(m[2])}</h${level}>`)
    } else if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      flushAll()
      out.push('<hr />')
    } else if ((m = line.match(/^&gt;\s?(.*)$/))) {
      flushPara()
      flushList()
      quote.push(m[1])
    } else if ((m = line.match(/^[-*]\s+(.*)$/))) {
      flushPara()
      flushQuote()
      if (!list || list.tag !== 'ul') {
        flushList()
        list = { tag: 'ul', items: [] }
      }
      list.items.push(m[1])
    } else if ((m = line.match(/^\d+[.)]\s+(.*)$/))) {
      flushPara()
      flushQuote()
      if (!list || list.tag !== 'ol') {
        flushList()
        list = { tag: 'ol', items: [] }
      }
      list.items.push(m[1])
    } else {
      flushList()
      flushQuote()
      para.push(line)
    }
  }
  flushAll()
  return out.join('\n')
}

/** Durée de lecture estimée (≈ 200 mots / minute), au moins 1 minute. */
export function readingMinutes(text: string) {
  const words = (text || '').trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

/** « Mon super article !» → « mon-super-article » (accents retirés, ≤ 80 caractères). */
export function slugify(title: string) {
  return (title || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '')
}
