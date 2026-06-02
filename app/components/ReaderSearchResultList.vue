<template>
  <p
    v-if="isSearching"
    class="text-sm text-muted text-center py-6"
    v-text="$t('reader_search_loading')"
  />
  <p
    v-else-if="hasSearched && results.length === 0"
    class="text-sm text-muted text-center py-6"
    v-text="$t('reader_search_no_results')"
  />
  <ul
    v-else-if="segmentedResults.length > 0"
    class="divide-y divide-muted select-none"
  >
    <li
      v-for="result in segmentedResults"
      :key="result.id"
    >
      <button
        type="button"
        class="w-full text-left px-4 py-3 hover:bg-elevated transition-colors"
        @click="handleClick(result)"
      >
        <p
          v-if="result.chapterTitle"
          class="text-xs text-muted mb-1 truncate"
          v-text="result.chapterTitle"
        />
        <p class="text-sm line-clamp-2">
          <template
            v-for="(segment, segmentIndex) in result.segments"
            :key="segmentIndex"
          >
            <mark
              v-if="segment.isMatch"
              class="bg-yellow-200 dark:bg-yellow-700 text-inherit rounded-sm px-0.5"
              v-text="segment.text"
            />
            <span
              v-else
              v-text="segment.text"
            />
          </template>
        </p>
        <p
          v-if="result.pageLabel"
          class="text-xs text-muted mt-1"
          v-text="result.pageLabel"
        />
      </button>
    </li>
  </ul>
</template>

<script setup lang="ts">
interface ExcerptSegment {
  text: string
  isMatch: boolean
}

const props = defineProps<{
  isSearching: boolean
  hasSearched: boolean
  results: ReaderSearchResult[]
  query: string
}>()

const emit = defineEmits<{
  select: [result: ReaderSearchResult]
}>()

const { t: $t } = useI18n()

// `section.find()` (EPUB) and `getTextContent()` (PDF) normalize whitespace in
// ways that a literal indexOf can miss.
function buildHighlightRegex(trimmedQuery: string): RegExp | null {
  const tokens = trimmedQuery.split(/\s+/).filter(Boolean).map(escapeRegExp)
  if (!tokens.length) return null
  return new RegExp(tokens.join('\\s+'), 'gi')
}

// Both excerpt sources center the match with ~60-75 chars of leading context,
// which pushes the keyword past the 2-line clamp on long CJK paragraphs so the
// visible portion shows only the lead-in text. Drop excess leading context (but
// keep a little) so the highlighted match stays within the first visible line.
const EXCERPT_LEAD_CHARS = 12

function clampExcerptToMatch(excerpt: string, regex: RegExp | null): string {
  if (!regex) return excerpt
  const matchIndex = excerpt.search(regex)
  if (matchIndex <= EXCERPT_LEAD_CHARS) return excerpt
  return `…${excerpt.slice(matchIndex - EXCERPT_LEAD_CHARS)}`
}

function splitExcerpt(excerpt: string, regex: RegExp | null): ExcerptSegment[] {
  if (!regex) return [{ text: excerpt, isMatch: false }]

  const segments: ExcerptSegment[] = []
  let cursor = 0
  for (const match of excerpt.matchAll(regex)) {
    const matchText = match[0]
    if (!matchText) continue
    const start = match.index ?? 0
    if (start > cursor) {
      segments.push({ text: excerpt.slice(cursor, start), isMatch: false })
    }
    segments.push({ text: matchText, isMatch: true })
    cursor = start + matchText.length
  }
  if (cursor < excerpt.length) {
    segments.push({ text: excerpt.slice(cursor), isMatch: false })
  }
  return segments
}

const segmentedResults = computed(() => {
  const trimmedQuery = props.query.trim()
  const regex = trimmedQuery ? buildHighlightRegex(trimmedQuery) : null
  return props.results.map(result => ({
    ...result,
    segments: splitExcerpt(clampExcerptToMatch(result.excerpt, regex), regex),
  }))
})

function handleClick(result: ReaderSearchResult) {
  emit('select', result)
}
</script>
