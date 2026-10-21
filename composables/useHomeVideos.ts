/**
 * Sections vidéo de l'accueil (pliables au scroll, voir ScrollVideoSection.vue).
 *
 * Sources (une section n'apparaît que si sa vidéo est renseignée), par ordre de priorité :
 *  1. la page /admin/accueil, section « Vidéos de l'accueil » (fichier envoyé ou lien) ;
 *  2. les variables d'environnement :
 *     - « presentation » : NUXT_PUBLIC_PRESENTATION_VIDEO_URL (défaut /videos/presentation.mp4)
 *     - « ambiance »     : NUXT_PUBLIC_HOME_VIDEO_AMBIANCE_URL   (+ _POSTER facultatif)
 *     - « organizers »   : NUXT_PUBLIC_HOME_VIDEO_ORGANIZERS_URL (+ _POSTER facultatif)
 * Formats : lien YouTube, lien Vimeo, ou fichier .mp4 / .webm (chemin du site ou URL https).
 */
import { parsePresentationSource, type PresentationSource } from '~/composables/usePresentationVideo'

export interface HomeVideoItem {
  id: string
  /** « story » : au milieu de l'accueil ; « organizers » : juste avant l'appel organisateur */
  group: 'story' | 'organizers'
  source: PresentationSource
  poster: string
  eyebrow: string
  title: string
  subtitle: string
  cta?: { label: string; to: string }
}

export function useHomeVideos() {
  const { t } = useI18n()
  const config = useRuntimeConfig()
  const presentation = usePresentationVideo()
  const { content } = useHomeHeroContent()

  const items = computed<HomeVideoItem[]>(() => {
    const out: HomeVideoItem[] = []

    if (presentation.source.value) {
      out.push({
        id: 'presentation',
        group: 'story',
        source: presentation.source.value,
        poster: presentation.poster.value,
        eyebrow: t('homeVideo.presentation.eyebrow'),
        title: t('homeVideo.presentation.title'),
        subtitle: t('homeVideo.presentation.subtitle'),
        cta: { label: t('homeVideo.presentation.cta'), to: '/comment-ca-marche' },
      })
    }

    const ambiance = parsePresentationSource(String(content.value?.ambiance_video_url || config.public.homeVideoAmbianceUrl || ''))
    if (ambiance) {
      out.push({
        id: 'ambiance',
        group: 'story',
        source: ambiance,
        poster: String(content.value?.ambiance_poster_url || config.public.homeVideoAmbiancePoster || ''),
        eyebrow: t('homeVideo.ambiance.eyebrow'),
        title: t('homeVideo.ambiance.title'),
        subtitle: t('homeVideo.ambiance.subtitle'),
        cta: { label: t('homeVideo.ambiance.cta'), to: '/evenements' },
      })
    }

    const organizers = parsePresentationSource(String(content.value?.organizers_video_url || config.public.homeVideoOrganizersUrl || ''))
    if (organizers) {
      out.push({
        id: 'organizers',
        group: 'organizers',
        source: organizers,
        poster: String(content.value?.organizers_poster_url || config.public.homeVideoOrganizersPoster || ''),
        eyebrow: t('homeVideo.organizers.eyebrow'),
        title: t('homeVideo.organizers.title'),
        subtitle: t('homeVideo.organizers.subtitle'),
        cta: { label: t('homeVideo.organizers.cta'), to: '/devenir-organisateur' },
      })
    }

    return out
  })

  return { items }
}
