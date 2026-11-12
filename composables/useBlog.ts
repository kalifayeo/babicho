import type { BlogCategory, BlogPost, BlogPostSummary } from '~/types/database'

export const BLOG_CATEGORIES: BlogCategory[] = ['news', 'guides', 'organizers', 'events', 'product']

export const BLOG_CATEGORY_ICONS: Record<BlogCategory, string> = {
  news: 'megaphone',
  guides: 'compass',
  organizers: 'briefcase',
  events: 'calendar',
  product: 'sparkles',
}

/** Liste publique (rendue côté serveur) : articles publiés, du plus récent au plus ancien. */
export function useBlogList(limit = 60) {
  const { data, pending, error } = useAsyncData<BlogPostSummary[]>(`blog-list:${limit}`, async () => {
    try {
      return await $fetch<BlogPostSummary[]>('/api/blog', { query: { limit } })
    } catch {
      return []
    }
  })
  const posts = computed(() => data.value ?? [])
  return { posts, loading: computed(() => pending.value && !data.value), error }
}

/** Un article publié + articles liés (404 serveur propre si introuvable). */
export function useBlogPost(slug: string) {
  const requestEvent = import.meta.server ? useRequestEvent() : undefined
  const { data, pending } = useAsyncData<{ post: (BlogPostSummary & { content: string; updated_at: string }) | null; related: BlogPostSummary[] }>(
    `blog-post:${slug}`,
    async () => {
      try {
        return await $fetch<any>(`/api/blog/${encodeURIComponent(slug)}`)
      } catch (e: any) {
        const status = e?.statusCode ?? e?.status ?? e?.response?.status
        if (status === 404) {
          if (requestEvent) setResponseStatus(requestEvent, 404)
          return { post: null, related: [] }
        }
        throw e
      }
    }
  )
  return {
    post: computed(() => data.value?.post ?? null),
    related: computed(() => data.value?.related ?? []),
    loading: computed(() => pending.value && !data.value),
    notFound: computed(() => !!data.value && data.value.post === null),
  }
}

/** « 12 octobre 2026 » dans la langue courante. */
export function formatPostDate(iso: string | null | undefined, locale: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Gestion admin (/admin/blog) : tous les articles, brouillons et programmés compris. */
export function useAdminBlog() {
  const items = ref<Omit<BlogPost, 'content'>[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)
  const COLUMNS = 'id, slug, title, excerpt, cover_url, category, author_name, is_featured, status, published_at, created_at, updated_at'

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      const supabase = useSupabase()
      const { data, error: err } = await supabase.from('blog_posts').select(COLUMNS).order('created_at', { ascending: false })
      if (err) throw err
      items.value = (data as unknown as Omit<BlogPost, 'content'>[]) ?? []
    } catch (e: any) {
      error.value = e?.message || 'LOAD_FAILED'
    } finally {
      loading.value = false
    }
  }

  async function fetchOne(id: string) {
    const supabase = useSupabase()
    const { data, error: err } = await supabase.from('blog_posts').select('*').eq('id', id).maybeSingle()
    if (err) throw err
    return (data as unknown as BlogPost) ?? null
  }

  type Input = Pick<BlogPost, 'slug' | 'title' | 'excerpt' | 'content' | 'cover_url' | 'category' | 'author_name' | 'is_featured' | 'status' | 'published_at'>

  async function create(input: Input) {
    const supabase = useSupabase()
    const { data, error: err } = await supabase.from('blog_posts').insert(input).select('*').single()
    if (err) throw err
    return data as unknown as BlogPost
  }

  async function update(id: string, patch: Partial<Input>) {
    const supabase = useSupabase()
    const { data, error: err } = await supabase
      .from('blog_posts')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single()
    if (err) throw err
    const { content: _c, ...summary } = data as unknown as BlogPost
    items.value = items.value.map((p) => (p.id === id ? summary : p))
    return data as unknown as BlogPost
  }

  async function remove(id: string) {
    const supabase = useSupabase()
    const { error: err } = await supabase.from('blog_posts').delete().eq('id', id)
    if (err) throw err
    items.value = items.value.filter((p) => p.id !== id)
  }

  return { items, loading, error, fetchAll, fetchOne, create, update, remove }
}

/** Message lisible pour une erreur de base (slug déjà pris, etc.). */
export function blogErrorMessage(e: any, fallback: string, duplicate: string) {
  const msg = String(e?.message || '')
  if (e?.code === '23505' || /duplicate key|unique/i.test(msg)) return duplicate
  return msg || fallback
}
