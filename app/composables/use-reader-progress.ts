import type { ReaderCacheKeySuffix } from '~/utils/reader'

export function useReaderProgress({
  nftClassId,
  bookProgressKeyPrefix,
}: {
  nftClassId: string
  bookProgressKeyPrefix: string
}) {
  const bookshelfStore = useBookshelfStore()

  function getProgressKeyWithSuffix(suffix: ReaderCacheKeySuffix) {
    return getReaderCacheKeyWithSuffix(bookProgressKeyPrefix, suffix)
  }

  const readingProgress = useSyncedBookSettings({
    nftClassId,
    key: 'progress',
    defaultValue: 0,
  })
  const lastOpenedTime = useSyncedBookSettings({
    nftClassId,
    key: 'lastOpenedTime',
    defaultValue: 0,
  })

  onMounted(() => {
    lastOpenedTime.value = Date.now()
  })

  if (import.meta.client) {
    useEventListener(document, 'visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        useBookSettingsStore().flushBatch(nftClassId)
      }
    })
  }

  onBeforeUnmount(() => {
    bookshelfStore.updateProgress(
      nftClassId,
      readingProgress.value,
      lastOpenedTime.value,
    )
  })

  return {
    readingProgress,
    lastOpenedTime,
    getProgressKeyWithSuffix,
  }
}
