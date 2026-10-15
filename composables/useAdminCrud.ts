/**
 * CRUD d'administration générique pour une table ordonnée (position, status) :
 * témoignages, événements à la une… Même logique que useAdminPartners, sans la
 * recopier. La RLS de chaque table reste la vraie barrière (permission dédiée).
 *
 *   const api = useAdminCrud<Testimonial>('testimonials', { onChange: () => { … } })
 */
export function useAdminCrud<T extends { id: string; position: number }>(
  table: 'testimonials' | 'featured_events' | 'press_items' | 'press_resources',
  options: { select?: string; onChange?: () => void } = {}
) {
  const items = ref<T[]>([]) as Ref<T[]>
  const loading = ref(true)
  const error = ref<string | null>(null)
  const sorted = computed(() => [...items.value].sort((a, b) => a.position - b.position))
  const select = options.select ?? '*'

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      const supabase = useSupabase()
      const { data, error: err } = await supabase.from(table).select(select).order('position', { ascending: true })
      if (err) throw err
      items.value = (data as unknown as T[]) ?? []
    } catch (e: any) {
      error.value = e?.message || 'LOAD_FAILED'
    } finally {
      loading.value = false
    }
  }

  async function create(input: Record<string, unknown>) {
    const supabase = useSupabase()
    const position = Math.max(0, ...items.value.map((i) => i.position)) + 1
    const { data, error: err } = await supabase.from(table).insert({ ...input, position }).select(select).single()
    if (err) throw err
    items.value = [...items.value, data as unknown as T]
    options.onChange?.()
    return data as unknown as T
  }

  async function update(id: string, patch: Record<string, unknown>) {
    const supabase = useSupabase()
    const { data, error: err } = await supabase
      .from(table)
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(select)
      .single()
    if (err) throw err
    items.value = items.value.map((i) => (i.id === id ? (data as unknown as T) : i))
    options.onChange?.()
    return data as unknown as T
  }

  async function remove(id: string) {
    const supabase = useSupabase()
    const { error: err } = await supabase.from(table).delete().eq('id', id)
    if (err) throw err
    items.value = items.value.filter((i) => i.id !== id)
    options.onChange?.()
  }

  // Monter / descendre : on renumérote 1..n.
  async function move(item: T, direction: -1 | 1) {
    const list = [...sorted.value]
    const index = list.findIndex((p) => p.id === item.id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= list.length) return
    ;[list[index], list[target]] = [list[target], list[index]]
    await Promise.all(list.map((p, i) => (p.position !== i + 1 ? update(p.id, { position: i + 1 }) : null)))
  }

  onMounted(fetchAll)

  return { items, sorted, loading, error, fetchAll, create, update, remove, move }
}
