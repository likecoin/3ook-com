export function useColorModeSync() {
  const colorMode = useColorMode()
  const { loggedIn: hasLoggedIn, user } = useUserSession()
  const userSettingsStore = useUserSettingsStore()

  const syncedColorMode = useSyncedUserSettings<ColorMode>({
    key: 'colorMode',
    defaultValue: 'light',
  })

  const hasInitialized = ref(false)

  const isLikerPlus = computed(() => {
    if (!hasLoggedIn.value) return false
    return user.value?.isLikerPlus || false
  })

  // Enforce light mode for non-Plus users
  const enforcedColorMode = computed(() => {
    if (!isLikerPlus.value) {
      return 'light'
    }
    return syncedColorMode.value
  })

  // Sync color mode preference
  onMounted(async () => {
    if (hasLoggedIn.value) {
      // Wait for user settings to be loaded from API
      if (!userSettingsStore.isInitialized()) {
        await userSettingsStore.ensureInitialized()
      }
      // Apply enforced color mode (light for non-Plus, user preference for Plus)
      if (enforcedColorMode.value) {
        colorMode.preference = enforcedColorMode.value
      }
    }
    else {
      // If not logged in, always use light mode
      colorMode.preference = 'light'
    }
    hasInitialized.value = true
  })

  // Watch enforcedColorMode and sync to color mode
  watch(enforcedColorMode, (newValue) => {
    if (hasInitialized.value && newValue && colorMode.preference !== newValue) {
      colorMode.preference = newValue
    }
  })

  watch(isLikerPlus, (newValue) => {
    if (hasInitialized.value && !newValue) {
      // Force light mode when subscription expires
      colorMode.preference = 'light'
      syncedColorMode.value = 'light'
    }
  })

  return {
    preference: syncedColorMode,
    value: computed(() => colorMode.value),
  }
}
