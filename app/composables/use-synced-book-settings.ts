import type { BookSettingsData, BookSettingKey } from '~~/shared/types/book-settings'

interface UseSyncedBookSettingsOptions<T> {
  nftClassId: string
  key: BookSettingKey
  defaultValue: T
  namespace?: string
  // Keeps the value in memory only, for a book with no server record to sync to.
  isLocalOnly?: boolean
}

export function getBookSettingDbKey<
  K extends BookSettingKey,
  N extends string | undefined = undefined,
>({
  key,
  namespace,
}: {
  key: K
  namespace?: N
}): N extends string ? `${N}-${K}` : K {
  const namespacePrefix = namespace ? `${namespace}-` : ''
  return `${namespacePrefix}${String(key)}` as N extends string ? `${N}-${K}` : K
}

export function useSyncedBookSettings<T>({
  nftClassId,
  key,
  defaultValue,
  namespace,
  isLocalOnly = false,
}: UseSyncedBookSettingsOptions<T>): Ref<T> {
  if (isLocalOnly) return ref(defaultValue) as Ref<T>

  const { loggedIn: hasLoggedIn } = useUserSession()
  const bookSettingsStore = useBookSettingsStore()

  const dbKey = getBookSettingDbKey({ key, namespace })

  const localState = ref<T>(defaultValue)

  // Settings load lazily via the shelf batch-fetch. When the reader is opened
  // directly (a bookstore link, bypassing the shelf) a write can land before
  // init resolves; without deferring it `queueUpdate` is skipped and the value
  // (e.g. the `lastOpenedTime` stamp) is silently lost, never syncing.
  let pendingWrite: { value: T } | null = null

  const storeValue = computed(() => {
    const settings = bookSettingsStore.getSettings(nftClassId)
    return settings?.[dbKey as keyof BookSettingsData] as T | undefined
  })

  function syncFromStore() {
    if (storeValue.value !== undefined) {
      localState.value = storeValue.value
    }
  }

  const state = computed({
    get: () => localState.value,
    set: (newValue) => {
      localState.value = newValue
      if (bookSettingsStore.isInitialized(nftClassId)) {
        bookSettingsStore.queueUpdate(nftClassId, dbKey, newValue)
      }
      else if (hasLoggedIn.value) {
        pendingWrite = { value: newValue }
      }
    },
  })

  async function loadFromServer() {
    await bookSettingsStore.ensureInitialized(nftClassId)
    if (pendingWrite) {
      // A local write raced ahead of init — it wins over the fetched value
      // (the user just acted on this book) and must still reach the server.
      const { value } = pendingWrite
      pendingWrite = null
      bookSettingsStore.queueUpdate(nftClassId, dbKey, value)
    }
    else {
      syncFromStore()
    }
  }

  watch(storeValue, (newValue) => {
    if (newValue !== undefined) {
      localState.value = newValue
    }
  })

  watch(hasLoggedIn, (isLoggedIn) => {
    if (isLoggedIn && !bookSettingsStore.isInitialized(nftClassId)) {
      loadFromServer()
    }
  })

  onMounted(() => {
    if (hasLoggedIn.value && !bookSettingsStore.isInitialized(nftClassId)) {
      loadFromServer()
    }
    else {
      syncFromStore()
    }
  })

  onBeforeUnmount(() => {
    if (bookSettingsStore.isInitialized(nftClassId)) {
      bookSettingsStore.flushBatch(nftClassId)
    }
  })

  return state as Ref<T>
}
