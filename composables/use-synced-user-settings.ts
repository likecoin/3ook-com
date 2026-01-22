import type { UserSettingsData } from '~/types/user-settings'

interface UseSyncedUserSettingsOptions<T> {
  key: UserSettingKey
  defaultValue: T
}

export function useSyncedUserSettings<T>({
  key,
  defaultValue,
}: UseSyncedUserSettingsOptions<T>): Ref<T> {
  const { loggedIn: hasLoggedIn } = useUserSession()
  const userSettingsStore = useUserSettingsStore()

  const localState = ref<T>(defaultValue)

  const storeValue = computed(() => {
    const settings = userSettingsStore.getSettings()
    return settings?.[key as keyof UserSettingsData] as T | undefined
  })

  function ensureInitialized() {
    if (hasLoggedIn.value && !userSettingsStore.isInitialized()) {
      userSettingsStore.ensureInitialized()
    }
  }

  function syncFromStore() {
    if (storeValue.value !== undefined) {
      localState.value = storeValue.value
    }
  }

  const state = computed({
    get: () => localState.value,
    set: (newValue) => {
      localState.value = newValue
      if (!hasLoggedIn.value) {
        return
      }
      userSettingsStore.queueUpdate(key, newValue)
    },
  })

  watch(storeValue, (newValue) => {
    if (newValue !== undefined) {
      localState.value = newValue
    }
  })

  watch(hasLoggedIn, (isLoggedIn, wasLoggedIn) => {
    if (!isLoggedIn && wasLoggedIn) {
      userSettingsStore.flushBatch()
      userSettingsStore.$reset()
      localState.value = defaultValue
    }
    else {
      ensureInitialized()
    }
  })

  onMounted(() => {
    if (hasLoggedIn.value) {
      if (!userSettingsStore.isInitialized()) {
        ensureInitialized()
      }
      syncFromStore()
    }
  })

  onBeforeUnmount(() => {
    userSettingsStore.flushBatch()
  })

  return state as Ref<T>
}
