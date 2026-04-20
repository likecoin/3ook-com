import type { BookSettingsData, BookSettingKey } from '~/types/book-settings'

interface UseSyncedBookSettingsOptions<T> {
  nftClassId: string
  key: BookSettingKey
  defaultValue: T
  namespace?: string
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
}: UseSyncedBookSettingsOptions<T>): Ref<T> {
  const { loggedIn: hasLoggedIn } = useUserSession()
  const bookSettingsStore = useBookSettingsStore()

  const dbKey = getBookSettingDbKey({ key, namespace })

  const localState = ref<T>(defaultValue)

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
    },
  })

  async function loadFromServer() {
    await bookSettingsStore.ensureInitialized(nftClassId)
    syncFromStore()
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
