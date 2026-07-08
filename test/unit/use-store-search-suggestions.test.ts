import { nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useStoreSearchSuggestions } from '~/composables/use-store-search-suggestions'

// Mirrors SUGGESTION_DEBOUNCE_MS in the composable (not exported).
const DEBOUNCE_MS = 300

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }))

mockNuxtImport('fetchBookstoreCMSPublicationsBySearchTerm', () => mockFetch)
mockNuxtImport('useImageResize', () => () => ({
  getResizedNormalizedImageURL: (url: string, opts?: { size?: number }) => `resized:${url}:${opts?.size}`,
  getResizedImageURL: (url: string) => url,
}))
mockNuxtImport('normalizeNFTClassId', () => (id?: string) => id ?? '')
mockNuxtImport('getTimestampRoundedToMinute', () => () => 0)

// Let awaited fetch continuations and the Vue watcher scheduler settle.
async function flush() {
  for (let i = 0; i < 3; i++) await Promise.resolve()
  await nextTick()
}

describe('useStoreSearchSuggestions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('debounces the term, then populates suggestions with resized thumbnails', async () => {
    mockFetch.mockResolvedValue({
      records: [
        { classId: 'a', title: 'Book A', imageUrl: 'ipfs://a' },
        { classId: 'b', title: 'Book B', imageUrl: '' },
      ],
    })
    const term = ref('')
    const { suggestions } = useStoreSearchSuggestions(term)

    term.value = 'harry'
    expect(mockFetch).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)

    expect(mockFetch).toHaveBeenCalledOnce()
    expect(suggestions.value).toEqual([
      { classId: 'a', title: 'Book A', thumbnailUrl: 'resized:ipfs://a:100' },
      { classId: 'b', title: 'Book B', thumbnailUrl: undefined },
    ])
  })

  it('does not fetch for terms shorter than the minimum length', async () => {
    const term = ref('')
    const { suggestions } = useStoreSearchSuggestions(term)

    term.value = 'a'
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)

    expect(mockFetch).not.toHaveBeenCalled()
    expect(suggestions.value).toEqual([])
  })

  it('holds off fetching while IME composition is active, then fetches once it ends', async () => {
    mockFetch.mockResolvedValue({ records: [{ classId: 'a', title: 'A', imageUrl: 'ipfs://a' }] })
    const term = ref('')
    const isComposing = ref(true)
    const { suggestions } = useStoreSearchSuggestions(term, { isComposing })

    term.value = 'harry'
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)
    expect(mockFetch).not.toHaveBeenCalled()

    isComposing.value = false
    await flush()

    expect(mockFetch).toHaveBeenCalledOnce()
    expect(suggestions.value).toEqual([{ classId: 'a', title: 'A', thumbnailUrl: 'resized:ipfs://a:100' }])
  })

  it('ignores a stale response so it cannot overwrite a newer term', async () => {
    const resolvers: Array<(value: unknown) => void> = []
    mockFetch.mockImplementation(() => new Promise((resolve) => {
      resolvers.push(resolve)
    }))
    const term = ref('')
    const { suggestions } = useStoreSearchSuggestions(term)

    term.value = 'aa'
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)
    term.value = 'bb'
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(resolvers).toHaveLength(2)

    // Resolve the newer request first, then let the stale earlier one land late.
    resolvers[1]!({ records: [{ classId: 'new', title: 'New', imageUrl: 'ipfs://new' }] })
    await flush()
    resolvers[0]!({ records: [{ classId: 'old', title: 'Old', imageUrl: 'ipfs://old' }] })
    await flush()

    expect(suggestions.value).toEqual([{ classId: 'new', title: 'New', thumbnailUrl: 'resized:ipfs://new:100' }])
  })

  it('serves a repeated term from cache without refetching', async () => {
    mockFetch.mockResolvedValue({ records: [{ classId: 'a', title: 'A', imageUrl: 'ipfs://a' }] })
    const term = ref('')
    const { suggestions } = useStoreSearchSuggestions(term)

    term.value = 'harry'
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)
    expect(mockFetch).toHaveBeenCalledOnce()

    // Clear to a too-short term, then retype the same term: it should hit the cache.
    term.value = 'h'
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)
    term.value = 'harry'
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)

    expect(mockFetch).toHaveBeenCalledOnce()
    expect(suggestions.value).toEqual([{ classId: 'a', title: 'A', thumbnailUrl: 'resized:ipfs://a:100' }])
  })

  it('flags isLoading only while a fetch is in flight', async () => {
    const resolvers: Array<(value: unknown) => void> = []
    mockFetch.mockImplementation(() => new Promise((resolve) => {
      resolvers.push(resolve)
    }))
    const term = ref('')
    const { isLoading } = useStoreSearchSuggestions(term)

    expect(isLoading.value).toBe(false)

    term.value = 'harry'
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)
    expect(isLoading.value).toBe(true)

    resolvers[0]!({ records: [] })
    await flush()
    expect(isLoading.value).toBe(false)
  })
})
