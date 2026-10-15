import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/blog/:slug — un article PUBLIÉ complet + jusqu'à 3 articles liés.
 * 404 si l'article n'existe pas, est en brouillon ou programmé (RLS).
 */
const SUMMARY_COLUMNS = 'id, slug, title, excerpt, cover_url, category, author_name, is_featured, published_at'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') ?? ''
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 120) {
    throw createError({ statusCode: 404, statusMessage: 'Article introuvable.' })
  }
  const config = useRuntimeConfig(event)
  if (!config.public.supabaseUrl || !config.public.supabaseAnonKey) {
    throw createError({ statusCode: 503, statusMessage: 'Service temporairement indisponible.' })
  }
  const supabase = createClient(config.public.supabaseUrl, config.public.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: post, error } = await supabase
    .from('blog_posts')
    .select(`${SUMMARY_COLUMNS}, content, updated_at`)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
  if (error) {
    console.error('[api/blog/:slug] erreur Supabase :', error)
    throw createError({ statusCode: 500, statusMessage: "Impossible de charger l'article." })
  }
  if (!post) throw createError({ statusCode: 404, statusMessage: 'Article introuvable.' })

  const { data: related } = await supabase
    .from('blog_posts')
    .select(SUMMARY_COLUMNS)
    .eq('status', 'published')
    .eq('category', post.category)
    .neq('id', post.id)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(3)

  setHeader(event, 'Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
  return { post, related: related ?? [] }
})
