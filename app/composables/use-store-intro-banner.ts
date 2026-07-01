import { createSharedComposable, useStorage } from '@vueuse/core'

const STORE_INTRO_BANNER_DISMISSED_KEY = '3ook_store_intro_banner_dismissed'

// Shared so the banner and the store page (which dismisses on tag click) hold the
// same reactive ref — useStorage alone only syncs across tabs, not within one.
export const useStoreIntroBanner = createSharedComposable(() => {
  const isDismissed = useStorage(STORE_INTRO_BANNER_DISMISSED_KEY, false)

  function dismissStoreIntroBanner() {
    // Guard the no-op so repeat tag clicks don't re-write storage / refire watchers.
    if (!isDismissed.value) isDismissed.value = true
  }

  return { isDismissed, dismissStoreIntroBanner }
})
