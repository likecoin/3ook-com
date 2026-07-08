export interface StoreSearchSuggestion {
  classId: string
  title: string
  thumbnailUrl?: string
}

export const SUGGESTION_MIN_TERM_LENGTH = 2
const SUGGESTION_DEBOUNCE_MS = 300
const SUGGESTION_LIMIT = 6
const SUGGESTION_CACHE_MAX = 50

/**
 * Live search suggestions for the store/library search input. Debounces the
 * term, hits the existing `/api/store/search` endpoint (sharing its 60s cache
 * via `ts`), and returns the top matching books. Reads the raw endpoint
 * response rather than the bookstore store getter so fresh matches aren't
 * dropped by the hidden-book filter before their bookstore info has loaded.
 */
export function useStoreSearchSuggestions(
  searchTerm: MaybeRefOrGetter<string>,
  options: {
    isLibrary?: MaybeRefOrGetter<boolean>
    isComposing?: MaybeRefOrGetter<boolean>
  } = {},
) {
  const suggestions = ref<StoreSearchSuggestion[]>([])
  const isLoading = ref(false)
  const { getResizedNormalizedImageURL } = useImageResize()

  const debouncedTerm = refDebounced(
    computed(() => toValue(searchTerm).trim()),
    SUGGESTION_DEBOUNCE_MS,
  )

  // Cache resolved suggestions per scope+term so re-typing a cleared term is instant.
  const cache = new Map<string, StoreSearchSuggestion[]>()

  // Monotonic id, bumped on every run, so any short-circuit (cleared/cached
  // term) or newer request invalidates an older in-flight fetch's late response.
  let latestRequestId = 0

  function clearSuggestions() {
    if (suggestions.value.length) suggestions.value = []
  }

  watch(
    [
      debouncedTerm,
      () => !!toValue(options.isLibrary),
      () => !!toValue(options.isComposing),
    ],
    async ([term, isLibrary, isComposing]) => {
      // Bump before the isComposing guard so entering composition also invalidates
      // any in-flight fetch's late response.
      const requestId = ++latestRequestId

      // Reset here; only the fetch path below re-enables it, so cached/too-short/
      // composing runs never spin and a superseded run stops the spinner cleanly.
      isLoading.value = false

      // Hold results steady mid-IME-composition; the compositionend flip re-runs this.
      if (isComposing) return

      if (term.length < SUGGESTION_MIN_TERM_LENGTH) {
        clearSuggestions()
        return
      }

      const cacheKey = `${isLibrary ? '1' : '0'}:${term}`
      const cached = cache.get(cacheKey)
      if (cached) {
        suggestions.value = cached
        return
      }

      isLoading.value = true
      try {
        const result = await fetchBookstoreCMSPublicationsBySearchTerm(term, {
          limit: SUGGESTION_LIMIT,
          ts: getTimestampRoundedToMinute(),
          isLibrary,
        })
        if (requestId !== latestRequestId) return

        const items = result.records
          .filter(record => record.classId && record.title)
          .slice(0, SUGGESTION_LIMIT)
          .map(record => ({
            classId: normalizeNFTClassId(record.classId),
            title: record.title!,
            // Route the raw (possibly ipfs://) thumbnailUrl through the resize proxy
            // once here so the CSP-safe URL isn't rebuilt on every keystroke re-render.
            thumbnailUrl: record.imageUrl ? getResizedNormalizedImageURL(record.imageUrl, { size: 100 }) : undefined,
          }))
        cache.set(cacheKey, items)
        // Cap the per-instance cache so a long session of distinct searches can't grow it unbounded.
        if (cache.size > SUGGESTION_CACHE_MAX) {
          const oldestKey = cache.keys().next().value
          if (oldestKey) cache.delete(oldestKey)
        }
        suggestions.value = items
      }
      catch {
        if (requestId === latestRequestId) clearSuggestions()
      }
      finally {
        if (requestId === latestRequestId) isLoading.value = false
      }
    },
  )

  return {
    suggestions: readonly(suggestions),
    isLoading: readonly(isLoading),
  }
}
