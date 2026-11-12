<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin', adminPermission: 'blog.manage' })

import { BLOG_CATEGORIES, blogErrorMessage } from '~/composables/useBlog'
import { readingMinutes, slugify } from '~/utils/markdown'
import type { BlogCategory } from '~/types/database'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const api = useAdminBlog()

const isNew = computed(() => route.params.id === 'nouveau')
const postId = ref<string | null>(isNew.value ? null : String(route.params.id))

const form = reactive({
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  cover_url: '',
  category: 'news' as BlogCategory,
  author_name: '',
  is_featured: false,
  status: 'draft' as 'draft' | 'published',
  publishAt: '', // valeur d'un <input type="datetime-local">
})
const slugTouched = ref(false)
const loading = ref(!isNew.value)
const notFound = ref(false)
const saving = ref(false)
const message = ref('')
const errorMsg = ref('')
const mode = ref<'write' | 'preview'>('write')
const textarea = ref<HTMLTextAreaElement | null>(null)

// ISO (UTC) <-> « 2026-10-12T09:30 » (heure locale) pour le champ de date.
const toLocalInput = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null)

onMounted(async () => {
  if (isNew.value) return
  try {
    const p = await api.fetchOne(postId.value!)
    if (!p) {
      notFound.value = true
      return
    }
    Object.assign(form, {
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt || '',
      content: p.content || '',
      cover_url: p.cover_url || '',
      category: p.category,
      author_name: p.author_name || '',
      is_featured: p.is_featured,
      status: p.status,
      publishAt: toLocalInput(p.published_at),
    })
    slugTouched.value = true
  } catch (e: any) {
    errorMsg.value = e?.message || t('adminBlog.error')
  } finally {
    loading.value = false
  }
})

// Le lien se déduit du titre tant qu'on ne l'a pas modifié à la main.
watch(
  () => form.title,
  (v) => {
    if (!slugTouched.value) form.slug = slugify(v)
  }
)

const minutes = computed(() => readingMinutes(form.content))
const scheduled = computed(() => !!form.publishAt && new Date(form.publishAt).getTime() > Date.now())
const slugValid = computed(() => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.slug))
const canSave = computed(() => !!form.title.trim() && slugValid.value && !saving.value)

// --- Barre d'outils Markdown ----------------------------------------------------
async function edit(fn: (value: string, start: number, end: number) => { value: string; start: number; end: number }) {
  const el = textarea.value
  if (!el) return
  const r = fn(form.content, el.selectionStart, el.selectionEnd)
  form.content = r.value
  await nextTick()
  el.focus()
  el.setSelectionRange(r.start, r.end)
}
const wrap = (before: string, after: string, placeholder: string) =>
  edit((v, s, e) => {
    const sel = v.slice(s, e) || placeholder
    return { value: v.slice(0, s) + before + sel + after + v.slice(e), start: s + before.length, end: s + before.length + sel.length }
  })
const prefixLines = (prefix: string | ((i: number) => string)) =>
  edit((v, s, e) => {
    const lineStart = v.lastIndexOf('\n', s - 1) + 1
    const block = v.slice(lineStart, e) || ''
    const out = block.split('\n').map((l, i) => (typeof prefix === 'function' ? prefix(i) : prefix) + l).join('\n')
    return { value: v.slice(0, lineStart) + out + v.slice(e), start: lineStart, end: lineStart + out.length }
  })
const insertLink = () => edit((v, s, e) => {
  const label = v.slice(s, e) || t('adminBlog.linkText')
  const ins = `[${label}](https://)`
  return { value: v.slice(0, s) + ins + v.slice(e), start: s + label.length + 3, end: s + label.length + 11 }
})
const insertImage = () => edit((v, s, e) => {
  const ins = `\n\n![${t('adminBlog.imageAlt')}](https://)\n\n`
  return { value: v.slice(0, s) + ins + v.slice(e), start: s + ins.length - 11, end: s + ins.length - 3 }
})
const tools = computed(() => [
  { icon: 'bold', label: t('adminBlog.toolBold'), text: 'B', run: () => wrap('**', '**', t('adminBlog.toolBold')) },
  { icon: 'italic', label: t('adminBlog.toolItalic'), text: 'I', run: () => wrap('*', '*', t('adminBlog.toolItalic')) },
  { icon: 'h2', label: t('adminBlog.toolH2'), text: 'H2', run: () => prefixLines('## ') },
  { icon: 'h3', label: t('adminBlog.toolH3'), text: 'H3', run: () => prefixLines('### ') },
  { icon: 'list', label: t('adminBlog.toolList'), text: '•', run: () => prefixLines('- ') },
  { icon: 'ol', label: t('adminBlog.toolOrdered'), text: '1.', run: () => prefixLines((i) => `${i + 1}. `) },
  { icon: 'quote', label: t('adminBlog.toolQuote'), text: '❝', run: () => prefixLines('> ') },
  { icon: 'link', label: t('adminBlog.toolLink'), text: '🔗', run: insertLink },
  { icon: 'image', label: t('adminBlog.toolImage'), text: '▣', run: insertImage },
])

// --- Enregistrement ---------------------------------------------------------------
function flash(msg: string) {
  errorMsg.value = ''
  message.value = msg
  setTimeout(() => (message.value = ''), 3000)
}

async function save(target: 'draft' | 'published') {
  if (!canSave.value) {
    errorMsg.value = !form.title.trim() ? t('adminBlog.titleRequired') : t('adminBlog.slugInvalid')
    return
  }
  saving.value = true
  errorMsg.value = ''
  const publishing = target === 'published'
  // Publier sans date = publier maintenant ; une date future = article programmé.
  const publishedAt = publishing ? fromLocalInput(form.publishAt) || new Date().toISOString() : fromLocalInput(form.publishAt)
  const payload = {
    slug: form.slug,
    title: form.title.trim(),
    excerpt: form.excerpt.trim() || null,
    content: form.content,
    cover_url: form.cover_url.trim() || null,
    category: form.category,
    author_name: form.author_name.trim() || null,
    is_featured: form.is_featured,
    status: target,
    published_at: publishedAt,
  }
  try {
    if (postId.value) {
      await api.update(postId.value, payload)
    } else {
      const created = await api.create(payload)
      postId.value = created.id
      router.replace(`/admin/blog/${created.id}`)
    }
    form.status = target
    form.publishAt = toLocalInput(publishedAt)
    flash(publishing ? (scheduled.value ? t('adminBlog.savedScheduled') : t('adminBlog.published')) : t('adminBlog.savedDraft'))
  } catch (e: any) {
    errorMsg.value = blogErrorMessage(e, t('adminBlog.error'), t('adminBlog.slugTaken'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-8 md:px-6">
    <NuxtLink to="/admin/blog" class="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-tikeo-gray-text transition-colors hover:text-tikeo-black"><AppIcon name="arrow-left" class="h-4 w-4" :stroke="2.2" />{{ t('adminBlog.back') }}</NuxtLink>

    <div v-if="loading" class="space-y-3"><div class="h-12 animate-pulse bg-tikeo-border" /><div class="h-96 animate-pulse bg-tikeo-border" /></div>
    <AdminEmpty v-else-if="notFound" icon="newspaper" :text="t('adminBlog.notFound')"><NuxtLink to="/admin/blog" class="btn-ink">{{ t('adminBlog.back') }}</NuxtLink></AdminEmpty>

    <form v-else class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]" @submit.prevent="save('draft')">
      <div class="min-w-0 space-y-4">
        <h1 class="text-xl font-bold text-tikeo-black">{{ postId ? t('adminBlog.editTitle') : t('adminBlog.newTitle') }}</h1>
        <p v-if="errorMsg" class="acc-alert-error">{{ errorMsg }}</p>
        <p v-if="message" class="acc-alert-success">{{ message }}</p>

        <div>
          <label class="mb-1 block text-xs font-medium text-tikeo-gray-text" for="b-title">{{ t('adminBlog.fieldTitle') }} *</label>
          <input id="b-title" v-model="form.title" type="text" maxlength="140" required class="input-field w-full !text-lg font-bold" :placeholder="t('adminBlog.titlePlaceholder')" />
        </div>

        <div>
          <div class="mb-1 flex flex-wrap items-center justify-between gap-2">
            <span class="text-xs font-medium text-tikeo-gray-text">{{ t('adminBlog.fieldContent') }}</span>
            <div class="flex border border-tikeo-border" role="tablist">
              <button type="button" role="tab" :aria-selected="mode === 'write'" class="flex h-8 items-center gap-1.5 px-3 text-xs font-bold" :class="mode === 'write' ? 'bg-tikeo-ink text-white dark:bg-[#FF7A00] dark:text-tikeo-ink' : 'text-tikeo-black'" @click="mode = 'write'"><AppIcon name="edit" class="h-3.5 w-3.5" />{{ t('adminBlog.write') }}</button>
              <button type="button" role="tab" :aria-selected="mode === 'preview'" class="flex h-8 items-center gap-1.5 px-3 text-xs font-bold" :class="mode === 'preview' ? 'bg-tikeo-ink text-white dark:bg-[#FF7A00] dark:text-tikeo-ink' : 'text-tikeo-black'" @click="mode = 'preview'"><AppIcon name="eye" class="h-3.5 w-3.5" />{{ t('adminBlog.preview') }}</button>
            </div>
          </div>

          <div v-show="mode === 'write'">
            <div class="no-scrollbar flex gap-1 overflow-x-auto border border-b-0 border-tikeo-border bg-tikeo-surface-alt p-1.5">
              <button v-for="tool in tools" :key="tool.icon" type="button" :title="tool.label" :aria-label="tool.label" class="flex h-8 min-w-8 shrink-0 items-center justify-center border border-transparent px-2 text-xs font-extrabold text-tikeo-black transition-colors hover:border-tikeo-ink hover:bg-tikeo-surface dark:hover:border-[#FF7A00]" @click="tool.run()">{{ tool.text }}</button>
            </div>
            <textarea ref="textarea" v-model="form.content" rows="22" maxlength="60000" class="input-field w-full !font-mono !text-[13.5px] !leading-relaxed" :placeholder="t('adminBlog.contentPlaceholder')" />
            <p class="mt-1 flex flex-wrap justify-between gap-2 text-[11px] text-tikeo-gray-text"><span>{{ t('adminBlog.markdownHint') }}</span><span>{{ t('blog.readingTime', { n: minutes }) }} · {{ form.content.length }}/60000</span></p>
          </div>
          <div v-show="mode === 'preview'" class="min-h-[28rem] border border-tikeo-border bg-tikeo-surface p-5 md:p-8">
            <p v-if="!form.content.trim()" class="text-sm text-tikeo-gray-text">{{ t('adminBlog.previewEmpty') }}</p>
            <template v-else>
              <h2 class="mb-4 font-display text-3xl font-extrabold leading-tight tracking-tight text-tikeo-black">{{ form.title }}</h2>
              <BlogContent :source="form.content" />
            </template>
          </div>
        </div>
      </div>

      <aside class="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div class="org-panel space-y-3 p-4">
          <p class="flex items-center gap-2 text-sm font-bold text-tikeo-black"><AppIcon name="send" class="h-4 w-4 text-tikeo-orange" />{{ t('adminBlog.publishBox') }}</p>
          <p class="text-xs text-tikeo-gray-text">
            {{ t('adminBlog.statusLabel') }} :
            <strong class="text-tikeo-black">{{ form.status === 'published' ? (scheduled ? t('adminBlog.state_scheduled') : t('adminBlog.state_published')) : t('adminBlog.state_draft') }}</strong>
          </p>
          <div>
            <label class="mb-1 block text-xs font-medium text-tikeo-gray-text" for="b-date">{{ t('adminBlog.fieldPublishAt') }}</label>
            <input id="b-date" v-model="form.publishAt" type="datetime-local" class="input-field w-full" />
            <p class="mt-1 text-[11px] text-tikeo-gray-text">{{ t('adminBlog.publishAtHint') }}</p>
          </div>
          <div class="flex flex-col gap-2 pt-1">
            <button type="button" class="btn-ink !h-10 !text-[13px]" :disabled="!canSave" @click="save('published')">
              <AppIcon :name="scheduled ? 'clock' : 'send'" class="h-[18px] w-[18px]" />{{ saving ? t('adminBlog.saving') : scheduled ? t('adminBlog.schedule') : form.status === 'published' ? t('adminBlog.update') : t('adminBlog.publishNow') }}
            </button>
            <button type="submit" class="acc-btn-ghost !text-[13px]" :disabled="!canSave"><AppIcon name="save" class="h-[18px] w-[18px]" />{{ t('adminBlog.saveDraft') }}</button>
            <NuxtLink v-if="form.status === 'published' && !scheduled && form.slug" :to="`/blog/${form.slug}`" target="_blank" class="acc-link flex items-center gap-1.5 text-xs"><AppIcon name="external-link" class="h-4 w-4" />{{ t('adminBlog.view') }}</NuxtLink>
          </div>
        </div>

        <div class="org-panel space-y-3 p-4">
          <div>
            <label class="mb-1 block text-xs font-medium text-tikeo-gray-text" for="b-cat">{{ t('adminBlog.fieldCategory') }}</label>
            <select id="b-cat" v-model="form.category" class="input-field w-full"><option v-for="c in BLOG_CATEGORIES" :key="c" :value="c">{{ t(`blog.categories.${c}`) }}</option></select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-tikeo-gray-text" for="b-author">{{ t('adminBlog.fieldAuthor') }}</label>
            <input id="b-author" v-model="form.author_name" type="text" maxlength="80" class="input-field w-full" placeholder="Équipe Babicho" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-tikeo-gray-text" for="b-slug">{{ t('adminBlog.fieldSlug') }}</label>
            <input id="b-slug" v-model="form.slug" type="text" maxlength="120" class="input-field w-full font-mono !text-[13px]" :class="form.slug && !slugValid ? '!border-red-500' : ''" @input="slugTouched = true" />
            <p class="mt-1 break-all text-[11px] text-tikeo-gray-text">/blog/{{ form.slug || '…' }}</p>
          </div>
          <label class="flex items-center justify-between gap-3 border border-tikeo-border p-3">
            <span><span class="flex items-center gap-1.5 text-sm font-bold text-tikeo-black"><AppIcon name="star" class="h-4 w-4 text-tikeo-orange" />{{ t('adminBlog.fieldFeatured') }}</span><span class="mt-0.5 block text-[11px] text-tikeo-gray-text">{{ t('adminBlog.featuredHint') }}</span></span>
            <ToggleSwitch :model-value="form.is_featured" :aria-label="t('adminBlog.fieldFeatured')" @update:model-value="form.is_featured = $event" />
          </label>
        </div>

        <div class="org-panel space-y-3 p-4">
          <MediaInput v-model="form.cover_url" folder="blog-covers" :label="t('adminBlog.fieldCover')" />
          <div>
            <label class="mb-1 block text-xs font-medium text-tikeo-gray-text" for="b-excerpt">{{ t('adminBlog.fieldExcerpt') }}</label>
            <textarea id="b-excerpt" v-model="form.excerpt" rows="3" maxlength="300" class="input-field w-full" :placeholder="t('adminBlog.excerptHint')" />
            <p class="mt-1 text-right text-[11px] text-tikeo-gray-text">{{ form.excerpt.length }}/300</p>
          </div>
        </div>
      </aside>
    </form>
  </div>
</template>
