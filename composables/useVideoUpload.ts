/**
 * Envoi d'une vidéo (.mp4 / .webm) vers le bucket Storage « site-videos »
 * (voir supabase/migrations/0058_home_videos.sql). Réservé à l'admin.
 * Utilisé par VideoInput.vue ; le formulaire ne manipule qu'une URL.
 */
export const VIDEO_BUCKET = 'site-videos'
export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm']
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024 // 50 Mo : limite du plan gratuit Supabase

const TYPE_BY_EXT: Record<string, string> = { mp4: 'video/mp4', webm: 'video/webm' }

/** Certains navigateurs (Windows) ne renseignent pas file.type : on se rabat sur l'extension. */
function detectType(file: File): string {
  if (file.type) return file.type
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  return TYPE_BY_EXT[ext] || ''
}

export function useVideoUpload() {
  const uploading = ref(false)

  /** Renvoie l'URL publique de la vidéo envoyée. Lève 'unsupportedType', 'tooLarge', 'bucketMissing' ou 'uploadFailed'. */
  async function uploadVideo(file: File): Promise<string> {
    const type = detectType(file)
    if (!ACCEPTED_VIDEO_TYPES.includes(type)) throw new Error('unsupportedType')
    if (file.size > MAX_VIDEO_SIZE) throw new Error('tooLarge')

    uploading.value = true
    try {
      const supabase = useSupabase()
      const ext = type === 'video/webm' ? 'webm' : 'mp4'
      const objectName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`
      const { error } = await supabase.storage.from(VIDEO_BUCKET).upload(objectName, file, {
        cacheControl: '31536000', // nom unique par envoi : cache long autorisé
        upsert: false,
        contentType: type,
      })
      if (error) {
        if (/bucket not found/i.test(error.message || '')) throw new Error('bucketMissing')
        throw error
      }
      const { data } = supabase.storage.from(VIDEO_BUCKET).getPublicUrl(objectName)
      if (!data?.publicUrl) throw new Error('uploadFailed')
      return data.publicUrl
    } finally {
      uploading.value = false
    }
  }

  return { uploading, uploadVideo }
}
