import { useDebounceFn } from '@vueuse/core'
import type { BookSettingsData } from '~/types/book-settings'
import type { BookTimestampField } from '~/shared/types/book-settings'
import { FIRESTORE_IN_OPERATOR_LIMIT } from '~/constants/api'

// Local cache keeps the client `Date.now()` so shelf sort updates immediately;
// the wire payload sends a sentinel so the server stamps with its own clock.
const SERVER_TIMESTAMP_KEYS: ReadonlySet<string> = new Set<BookTimestampField>([
  'completedAt',
  'didNotFinishAt',
  'archivedAt',
  'lastOpenedTime',
])

interface BookSettingsEntry {
  data: BookSettingsData
  fetchedAt: number
}

export const useBookSettingsStore = defineStore('book-settings', () => {
  const { loggedIn: hasLoggedIn } = useUserSession()
  const settingsMap = ref<Record<string, BookSettingsEntry>>({})
  const fetchPromisesMap = ref<Record<string, Promise<BookSettingsData>>>({})
  const batchFetchPromise = ref<Promise<void> | null>(null)
  // Bumped on reset() so in-flight fetches can detect they've been superseded
  // and skip repopulating a cleared settingsMap.
  let resetGeneration = 0

  // Batch update queues per nftClassId
  const batchQueuesMap = ref<Record<string, Map<string, unknown>>>({})
  const debouncedFlushFunctionsMap = ref<Record<string, ReturnType<typeof useDebounceFn>>>({})

  function getKey(nftClassId: string): string {
    return nftClassId.toLowerCase()
  }

  function isInitialized(nftClassId: string): boolean {
    const key = getKey(nftClassId)
    return key in settingsMap.value
  }

  async function fetchSettings(nftClassId: string): Promise<BookSettingsData> {
    const key = getKey(nftClassId)

    if (fetchPromisesMap.value[key]) {
      return fetchPromisesMap.value[key]
    }

    const fetchPromise = apiFetch<BookSettingsData>('/books/settings', {
      params: { nftClassId },
    }).then((settings) => {
      settingsMap.value[key] = {
        data: settings,
        fetchedAt: Date.now(),
      }
      return settings
    }).catch((error) => {
      // Don't write an empty entry on network error: settingsMap is persisted,
      // so a transient offline blip would otherwise mark the key initialized
      // permanently and block future refetches across reloads.
      console.warn(`Failed to fetch book settings for ${nftClassId}:`, error)
      throw error
    }).finally(() => {
      const { [key]: _, ...rest } = fetchPromisesMap.value
      fetchPromisesMap.value = rest
    })

    fetchPromisesMap.value[key] = fetchPromise
    return fetchPromise
  }

  async function fetchBatchSettings(nftClassIds: string[], { force = false }: { force?: boolean } = {}): Promise<void> {
    if (!hasLoggedIn.value || nftClassIds.length === 0) {
      return
    }

    if (batchFetchPromise.value) {
      await batchFetchPromise.value
    }

    const nftClassIdsToFetch = force
      ? nftClassIds
      : nftClassIds.filter(id => !isInitialized(id))
    if (nftClassIdsToFetch.length === 0) {
      return
    }

    const generation = resetGeneration
    // True once the user logs out or reset() bumps the generation — in either
    // case the response would repopulate a just-cleared settingsMap.
    const isStale = () => !hasLoggedIn.value || generation !== resetGeneration
    batchFetchPromise.value = (async () => {
      try {
        for (let i = 0; i < nftClassIdsToFetch.length; i += FIRESTORE_IN_OPERATOR_LIMIT) {
          if (isStale()) return
          const chunk = nftClassIdsToFetch.slice(i, i + FIRESTORE_IN_OPERATOR_LIMIT)
          const settings = await apiFetch<Record<string, BookSettingsData>>('/books/settings', {
            params: {
              nftClassIds: chunk,
            },
          })
          if (isStale()) return

          Object.entries(settings).forEach(([nftClassId, data]) => {
            const key = getKey(nftClassId)
            settingsMap.value[key] = {
              data,
              fetchedAt: Date.now(),
            }
          })

          chunk.forEach((nftClassId) => {
            const key = getKey(nftClassId)
            if (!settingsMap.value[key]) {
              settingsMap.value[key] = {
                data: {} as BookSettingsData,
                fetchedAt: Date.now(),
              }
            }
          })
        }
      }
      catch (error) {
        console.warn('Failed to fetch batch book settings:', error)
      }
      finally {
        batchFetchPromise.value = null
      }
    })()

    await batchFetchPromise.value
  }

  async function ensureInitialized(nftClassId: string): Promise<void> {
    if (!hasLoggedIn.value) return
    if (isInitialized(nftClassId)) return

    try {
      await fetchSettings(nftClassId)
    }
    catch {
      // Error already logged in fetchSettings
    }
  }

  function getSettings(nftClassId: string): BookSettingsData | undefined {
    const key = getKey(nftClassId)
    return settingsMap.value[key]?.data
  }

  function clearSettings(nftClassId: string) {
    const key = getKey(nftClassId)
    const { [key]: _, ...settingsRest } = settingsMap.value
    settingsMap.value = settingsRest
    const { [key]: __, ...fetchRest } = fetchPromisesMap.value
    fetchPromisesMap.value = fetchRest
  }

  function addToBatch(nftClassId: string, dbKey: string, value: unknown) {
    const key = getKey(nftClassId)
    if (!batchQueuesMap.value[key]) {
      batchQueuesMap.value[key] = new Map()
    }
    batchQueuesMap.value[key].set(dbKey, value)
  }

  async function flushBatch(nftClassId: string) {
    if (!hasLoggedIn.value) return

    const key = getKey(nftClassId)
    const queue = batchQueuesMap.value[key]
    if (!queue || queue.size === 0) return

    // Copy and clear the queue
    const updates = Object.fromEntries(queue.entries())
    queue.clear()

    try {
      await apiFetch(`/books/${nftClassId}/settings`, {
        method: 'POST',
        retry: API_MAX_RETRIES,
        body: updates,
      })
    }
    catch (error) {
      console.warn(`Failed to sync book settings for ${nftClassId}:`, error)
    }
  }

  function getDebouncedFlush(nftClassId: string) {
    const key = getKey(nftClassId)
    if (!debouncedFlushFunctionsMap.value[key]) {
      debouncedFlushFunctionsMap.value[key] = useDebounceFn(
        () => flushBatch(nftClassId),
        1000,
      )
    }
    return debouncedFlushFunctionsMap.value[key]
  }

  function queueUpdate(nftClassId: string, dbKey: string, value: unknown) {
    if (!hasLoggedIn.value) return

    const isStampNow = SERVER_TIMESTAMP_KEYS.has(dbKey)
      && (value === true || typeof value === 'number')

    const key = getKey(nftClassId)
    const entry = settingsMap.value[key]
    // Skip no-op writes (e.g. repeated `progress` updates landing on the same
    // value during scroll). Stamp-now keys always write — they're signalling
    // intent ("set to now"), not a chosen value. Nullish-coalesce the comparison
    // so clearing an already-absent field (undefined ↔ null) is also a no-op.
    if (!isStampNow && entry?.data) {
      const current = (entry.data as Record<string, unknown>)[dbKey]
      if ((current ?? null) === (value ?? null)) return
    }

    const localValue = isStampNow ? Date.now() : value
    const wireValue = isStampNow ? true : value

    if (entry) {
      ;(entry.data as Record<string, unknown>)[dbKey] = localValue
    }

    addToBatch(nftClassId, dbKey, wireValue)
    const debouncedFlush = getDebouncedFlush(nftClassId)
    debouncedFlush()
  }

  function reset() {
    resetGeneration += 1
    settingsMap.value = {}
    fetchPromisesMap.value = {}
    // Leave batchFetchPromise alone: in-flight fetches detect the generation
    // bump and bail in their own finally.
    batchQueuesMap.value = {}
    debouncedFlushFunctionsMap.value = {}
  }

  watch(hasLoggedIn, (value, oldValue) => {
    if (oldValue && !value) {
      reset()
    }
  })

  return {
    // Must be returned so Pinia exposes it on $state for persist.pick.
    settingsMap,

    fetchSettings,
    fetchBatchSettings,
    getSettings,
    clearSettings,
    ensureInitialized,
    isInitialized,
    queueUpdate,
    flushBatch,
    reset,
  }
}, {
  persist: {
    pick: ['settingsMap'],
  },
})
