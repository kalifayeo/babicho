<script setup lang="ts">
/**
 * Gabarit des pages connexion / inscription / mot de passe oublié.
 *
 * Le gabarit reprend l'idée du billet de l'app :
 *  - desktop : un grand « billet » en deux volets séparés par une perforation
 *    (encoches + pointillés) — volet marine à gauche (promesse de Babicho),
 *    volet blanc à droite avec le formulaire ;
 *  - mobile / tablette : le billet est à la verticale — bandeau marine (logo,
 *    titre, sous-titre) puis le formulaire sous la perforation.
 * `wide` ne sert plus qu'à élargir un peu la carte sur tablette.
 */
defineProps<{ title: string; subtitle?: string; wide?: boolean }>()
const { t } = useI18n()
const year = new Date().getFullYear()

const points = [
  { icon: 'ticket', title: 'authLayout.point1Title', text: 'authLayout.point1Text' },
  { icon: 'qr', title: 'authLayout.point2Title', text: 'authLayout.point2Text' },
  { icon: 'card', title: 'authLayout.point3Title', text: 'authLayout.point3Text' },
]
</script>

<template>
  <div class="relative isolate flex min-h-[calc(100vh-64px)] flex-col items-center justify-center overflow-hidden bg-tikeo-gray-light px-4 py-6 sm:py-10">
    <!-- Halos de marque -->
    <div
      class="pointer-events-none absolute inset-0 -z-10"
      style="background: radial-gradient(48rem 24rem at 8% -8%, rgb(255 122 0 / 0.16), transparent 62%), radial-gradient(48rem 26rem at 100% 108%, rgb(0 87 184 / 0.16), transparent 62%)"
      aria-hidden="true"
    />

    <main class="w-full lg:max-w-[62rem]" :class="wide ? 'max-w-[40rem]' : 'max-w-[32rem]'">
      <div class="relative flex flex-col overflow-hidden rounded-[28px] bg-tikeo-surface shadow-[0_30px_70px_-30px_rgba(10,26,52,0.55)] ring-1 ring-black/5 dark:ring-white/10 lg:flex-row">
        <!-- ============ Volet marque ============ -->
        <aside class="relative isolate overflow-hidden bg-tikeo-ink text-white lg:w-[42%] lg:shrink-0">
          <img src="/images/auth-concert.jpg" alt="" aria-hidden="true" class="absolute inset-0 -z-20 h-full w-full scale-110 object-cover object-center opacity-25 blur-[3px]" decoding="async" />
          <div class="absolute inset-0 -z-10 bg-gradient-to-b from-tikeo-ink/60 via-tikeo-ink/85 to-tikeo-ink" aria-hidden="true" />
          <div
            class="absolute inset-0 -z-10"
            style="background: radial-gradient(22rem 16rem at 0% 0%, rgb(255 122 0 / 0.28), transparent 65%), radial-gradient(22rem 18rem at 100% 100%, rgb(0 87 184 / 0.4), transparent 65%)"
            aria-hidden="true"
          />
          <div class="absolute inset-x-0 top-0 h-1 bg-tikeo-brand" aria-hidden="true" />
          <!-- Perforation -->
          <span class="pointer-events-none absolute inset-x-7 bottom-0 border-b-2 border-dashed border-white/25 lg:inset-x-auto lg:bottom-8 lg:right-0 lg:top-8 lg:border-b-0 lg:border-r-2" aria-hidden="true" />

          <div class="relative flex h-full flex-col px-7 pb-9 pt-8 lg:min-h-[34rem] lg:justify-between lg:px-10 lg:py-10">
            <NuxtLink to="/" aria-label="Babicho" class="inline-flex self-start">
              <img src="/logo-babicho.png" alt="Babicho" class="h-11 w-auto drop-shadow-lg lg:h-14" />
            </NuxtLink>

            <!-- Mobile / tablette : titre de la page dans le bandeau -->
            <div class="mt-6 lg:hidden">
              <h1 class="font-display text-[1.75rem] font-extrabold leading-tight tracking-tight">{{ title }}</h1>
              <p v-if="subtitle" class="mt-2 max-w-md text-sm leading-relaxed text-white/75">{{ subtitle }}</p>
            </div>

            <!-- Desktop : promesse de la marque -->
            <div class="hidden lg:block">
              <p class="font-display text-[2.6rem] font-extrabold leading-[1.05] tracking-tight">{{ t('authLayout.live') }}</p>
              <p class="mt-4 max-w-xs text-[15px] leading-relaxed text-white/75">{{ t('authLayout.intro') }}</p>
              <ul class="mt-8 space-y-5">
                <li v-for="p in points" :key="p.title" class="flex items-start gap-3.5">
                  <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#FF9A3D] ring-1 ring-white/15">
                    <AppIcon :name="p.icon" class="h-5 w-5" />
                  </span>
                  <span class="min-w-0">
                    <span class="block text-sm font-bold">{{ t(p.title) }}</span>
                    <span class="mt-0.5 block text-[13px] leading-snug text-white/65">{{ t(p.text) }}</span>
                  </span>
                </li>
              </ul>
            </div>

            <p class="hidden text-xs text-white/50 lg:block">{{ t('authLayout.footer') }}</p>
          </div>
        </aside>

        <!-- Encoches du billet : en bas du bandeau (mobile) ou entre les deux volets (desktop) -->
        <div class="relative z-10 h-0 lg:hidden" aria-hidden="true">
          <span class="absolute -left-3.5 -top-3.5 h-7 w-7 rounded-full bg-tikeo-gray-light" />
          <span class="absolute -right-3.5 -top-3.5 h-7 w-7 rounded-full bg-tikeo-gray-light" />
        </div>
        <span class="absolute left-[42%] top-0 z-10 hidden h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-tikeo-gray-light lg:block" aria-hidden="true" />
        <span class="absolute bottom-0 left-[42%] z-10 hidden h-7 w-7 -translate-x-1/2 translate-y-1/2 rounded-full bg-tikeo-gray-light lg:block" aria-hidden="true" />

        <!-- ============ Volet formulaire ============ -->
        <div class="px-6 pb-8 pt-8 sm:px-10 lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-14 lg:py-12">
          <div class="mx-auto w-full max-w-[28rem]">
            <h1 class="hidden font-display text-3xl font-extrabold leading-tight tracking-tight text-tikeo-black lg:block">{{ title }}</h1>
            <p v-if="subtitle" class="mb-7 mt-2 hidden text-sm leading-relaxed text-tikeo-gray-text lg:block">{{ subtitle }}</p>
            <slot />
          </div>
        </div>
      </div>

      <p class="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-tikeo-gray-text">
        <AppIcon name="lock" class="h-3 w-3" :stroke="2.4" />
        {{ t('authLayout.secure') }} · © {{ year }} Babicho
      </p>
    </main>
  </div>
</template>
