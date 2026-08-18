/**
 * Which books can be read without a network, derived from the live
 * CacheStorage rather than the localStorage index: an entry the browser
 * evicted under quota pressure then disappears from the shelf badge instead
 * of promising access we can no longer deliver.
 */
export function useOfflineBooks() {
  const config = useRuntimeConfig()

  // shallowRef: the Set is only ever replaced, never mutated in place, so deep
  // reactivity would track a per-key dependency for every book on the shelf and
  // throw it away on each refresh.
  const offlineCacheKeys = shallowRef<Set<string>>(new Set())

  const bookFileCachePrefix = computed(() =>
    getBookFileCacheKeyPrefix({ cacheKeyPrefix: config.public.cacheKeyPrefix }),
  )

  async function refreshOfflineBooks() {
    if (!import.meta.client || !window.caches) return
    try {
      const keys = await window.caches.keys()
      offlineCacheKeys.value = new Set(
        keys.filter(key => isBookFileCacheKeyOfPrefix(key, bookFileCachePrefix.value)),
      )
    }
    catch (error) {
      console.error(error)
    }
  }

  /**
   * Drop every cached variant of one book — a book has one cache per file
   * index x custom-message flag, so an exact key would leave the others
   * behind — along with any TTS audio synthesised from it. Used when access
   * ends (a returned borrow, a deleted upload); reader progress keys are left
   * alone so a re-borrow resumes where it stopped.
   */
  async function removeOfflineBook({
    nftClassId,
    isUploadedBook = false,
  }: {
    nftClassId: string
    isUploadedBook?: boolean
  }) {
    if (!import.meta.client || !window.caches) return
    try {
      const prefix = getBookFileCacheKeyPrefix({
        cacheKeyPrefix: config.public.cacheKeyPrefix,
        nftClassId,
        isUploadedBook,
      })
      const keys = (await window.caches.keys())
        .filter(key => isBookFileCacheKeyOfPrefix(key, prefix))
      if (keys.length) {
        await Promise.all(keys.map(key => window.caches.delete(key)))
        removeBookFileCacheEntries({
          cacheKeyPrefix: config.public.cacheKeyPrefix,
          cacheKeys: keys,
        })
        await refreshOfflineBooks()
      }
      // Last, and outside the branch above: a listener can have downloaded
      // audio for a book whose file was never cached, and a failure here must
      // not cost the file deletion that revokes access to the book itself.
      await removeTTSPinsForBook({
        cacheKeyPrefix: config.public.cacheKeyPrefix,
        nftClassId,
      })
    }
    catch (error) {
      console.error(error)
    }
  }

  return {
    offlineCacheKeys,
    refreshOfflineBooks,
    removeOfflineBook,
  }
}
