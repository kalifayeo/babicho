import type { Testimonial } from '~/types/database'

/** Témoignages actifs (accueil) : mis en avant d'abord, puis ordre défini dans l'admin. */
export function useTestimonials() {
  const items = useState<Testimonial[]>('tikeo-testimonials', () => [])
  const loaded = useState<boolean>('tikeo-testimonials-loaded', () => false)
  const loading = ref(false)

  async function fetchTestimonials() {
    if (loaded.value) return
    loading.value = true
    try {
      const supabase = useSupabase()
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .eq('status', 'active')
        .order('position', { ascending: true })
      if (error) throw error
      items.value = (data as unknown as Testimonial[]) ?? []
      loaded.value = true
    } catch {
      items.value = []
    } finally {
      loading.value = false
    }
  }

  if (import.meta.client) onMounted(fetchTestimonials)
  return { items, loading, loaded, fetchTestimonials }
}

export function useAdminTestimonials() {
  return useAdminCrud<Testimonial>('testimonials', {
    onChange: () => {
      useState<boolean>('tikeo-testimonials-loaded').value = false
    },
  })
}
