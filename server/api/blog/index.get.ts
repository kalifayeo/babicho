import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/blog — articles PUBLIÉS (sans le contenu), du plus récent au plus ancien.
 * Lecture avec la clé ANON : la RLS (migration 0049) masque brouillons et
 * articles programmés. Route serveur pour que le blog soit rendu côté serveur
 * (référencement Google, aperçus de partage).
 */
const SUMMARY_COLUMNS = 'id, slug, title, excerpt, cover_url, category, author_name, is_featured, published_at'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  if (!config.public.supabaseUrl || !config.public.supabaseAnonKey) {
    throw createError({ statusCode: 503, statusMessage: 'Service temporairement indisponible.' })
  }
  const limit = Math.min(60, Math.max(1, Number(getQuery(event).limit) || 60))

  const supabase = createClient(config.public.supabaseUrl, config.public.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await supabase
    .from('blog_posts')
    .select(SUMMARY_COLUMNS)
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (error) {
    console.error('[api/blog] erreur Supabase :', error)
    throw createError({ statusCode: 500, statusMessage: 'Impossible de charger les articles.' })
  }
  setHeader(event, 'Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
  return data ?? []
})
