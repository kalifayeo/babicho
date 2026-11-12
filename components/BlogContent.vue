<script setup lang="ts">
/** Corps d'un article (Markdown → HTML sûr, voir utils/markdown.ts) avec la mise en forme « éditoriale ». */
import { renderMarkdown } from '~/utils/markdown'

const props = defineProps<{ source: string }>()
const html = computed(() => renderMarkdown(props.source))
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html : HTML produit par renderMarkdown (texte échappé, URL http(s)/relatives uniquement) -->
  <div class="blog-prose" v-html="html" />
</template>

<style scoped>
.blog-prose {
  font-size: 1.0625rem;
  line-height: 1.8;
  color: rgb(var(--tikeo-text-primary));
  overflow-wrap: anywhere;
}
.blog-prose :deep(p) {
  margin: 0 0 1.25em;
}
.blog-prose :deep(h2) {
  margin: 2em 0 0.6em;
  font-family: 'Bricolage Grotesque', 'Instrument Sans', system-ui, sans-serif;
  font-size: 1.6rem;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.01em;
}
.blog-prose :deep(h2)::before {
  content: '';
  display: block;
  width: 1.5rem;
  height: 3px;
  margin-bottom: 0.6rem;
  background: #ff7a00;
}
.blog-prose :deep(h3) {
  margin: 1.6em 0 0.5em;
  font-family: 'Bricolage Grotesque', 'Instrument Sans', system-ui, sans-serif;
  font-size: 1.25rem;
  font-weight: 800;
}
.blog-prose :deep(a) {
  font-weight: 600;
  text-decoration: underline;
  text-decoration-color: #ff7a00;
  text-decoration-thickness: 2px;
  text-underline-offset: 4px;
}
.blog-prose :deep(a:hover) {
  color: rgb(var(--tikeo-orange));
}
.blog-prose :deep(ul),
.blog-prose :deep(ol) {
  margin: 0 0 1.25em;
  padding-left: 1.4em;
}
.blog-prose :deep(ul) {
  list-style: square;
}
.blog-prose :deep(ol) {
  list-style: decimal;
}
.blog-prose :deep(li) {
  margin-bottom: 0.4em;
}
.blog-prose :deep(li)::marker {
  color: #ff7a00;
}
.blog-prose :deep(blockquote) {
  margin: 1.6em 0;
  padding: 0.4em 0 0.4em 1.2em;
  border-left: 4px solid #ff7a00;
  font-size: 1.15rem;
  font-style: italic;
  color: rgb(var(--tikeo-text-secondary));
}
.blog-prose :deep(img) {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 1.6em auto;
}
.blog-prose :deep(hr) {
  margin: 2em 0;
  border: 0;
  border-top: 1px solid rgb(var(--tikeo-border));
}
</style>
