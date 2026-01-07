import { useStorage } from '@vueuse/core'
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

  const readingProgress = useStorage(
    computed(() => getProgressKeyWithSuffix('progress')),
    0,
  )
  const lastOpenedTime = useStorage(
    computed(() => getProgressKeyWithSuffix('last-opened')),
    0,
  )

  onMounted(() => {
    lastOpenedTime.value = Date.now()
  })

  onBeforeUnmount(() => {
    bookshelfStore.updateProgress(nftClassId, readingProgress.value, lastOpenedTime.value)
  })

  return {
    readingProgress,
    lastOpenedTime,
    getProgressKeyWithSuffix,
  }
}
