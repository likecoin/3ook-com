import type { UserSettingsData, UserSettingKey } from '~~/shared/types/user-settings'

type SettingValue<K extends UserSettingKey> = Exclude<UserSettingsData[K], undefined>

interface UseSyncedUserSettingsOptions<K extends UserSettingKey> {
  key: K
  defaultValue: SettingValue<K>
}

export function useSyncedUserSettings<K extends UserSettingKey>({
  key,
  defaultValue,
}: UseSyncedUserSettingsOptions<K>): Ref<SettingValue<K>> {
  const { loggedIn: hasLoggedIn } = useUserSession()
  const userSettingsStore = useUserSettingsStore()

  const localState = ref(defaultValue) as Ref<SettingValue<K>>

  const storeValue = computed(() => {
    const settings = userSettingsStore.getSettings()
    return settings?.[key] as SettingValue<K> | undefined
  })

  function ensureInitialized() {
    if (hasLoggedIn.value && !userSettingsStore.isInitialized()) {
      userSettingsStore.ensureInitialized()
    }
  }

  const state = computed({
    get: () => {
      if (userSettingsStore.isInitialized() && storeValue.value !== undefined) {
        return storeValue.value
      }
      return localState.value
    },
    set: (newValue) => {
      localState.value = newValue
      if (!hasLoggedIn.value) {
        return
      }
      userSettingsStore.queueUpdate(key, newValue)
    },
  })

  watch(hasLoggedIn, (isLoggedIn, wasLoggedIn) => {
    if (!isLoggedIn && wasLoggedIn) {
      userSettingsStore.flushBatch()
      userSettingsStore.clearSettings()
      localState.value = defaultValue
    }
    else {
      ensureInitialized()
    }
  })

  onMounted(() => {
    ensureInitialized()
  })

  onBeforeUnmount(() => {
    userSettingsStore.flushBatch()
  })

  return state as Ref<SettingValue<K>>
}
