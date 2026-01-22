export function useColorModeSync() {
  const colorMode = useColorMode()
  const { loggedIn: hasLoggedIn } = useUserSession()
  const userSettingsStore = useUserSettingsStore()

  const syncedColorMode = useSyncedUserSettings<ColorMode>({
    key: 'colorMode',
    defaultValue: 'light',
  })

  const hasInitialized = ref(false)

  // Sync color mode preference
  onMounted(async () => {
    if (hasLoggedIn.value) {
      // Wait for user settings to be loaded from API
      if (!userSettingsStore.isInitialized()) {
        await userSettingsStore.ensureInitialized()
      }
      // API overrides localStorage
      if (syncedColorMode.value) {
        colorMode.preference = syncedColorMode.value
      }
    }
    else {
      // If not logged in, sync existing color mode preference to local state
      if (colorMode.preference !== syncedColorMode.value) {
        syncedColorMode.value = colorMode.preference as ColorMode
      }
    }
    hasInitialized.value = true
  })

  // Watch syncedColorMode (single source of truth) and sync to Nuxt's color mode
  watch(syncedColorMode, (newValue) => {
    if (hasInitialized.value && newValue && colorMode.preference !== newValue) {
      colorMode.preference = newValue
    }
  })

  return {
    preference: syncedColorMode,
    value: computed(() => colorMode.value),
  }
}
