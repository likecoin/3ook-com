import { useDebounceFn } from '@vueuse/core'
import type { UserSettingsData } from '~/types/user-settings'

interface UserSettingsEntry {
  data: UserSettingsData
  fetchedAt: number
}

export const useUserSettingsStore = defineStore('user-settings', () => {
  const { loggedIn: hasLoggedIn } = useUserSession()
  const settingsEntry = ref<UserSettingsEntry | null>(null)
  const fetchPromise = ref<Promise<UserSettingsData> | null>(null)

  const batchQueue = ref<Map<string, unknown>>(new Map())

  function isInitialized(): boolean {
    return settingsEntry.value !== null
  }

  async function fetchSettings(): Promise<UserSettingsData> {
    if (fetchPromise.value) {
      return fetchPromise.value
    }

    const promise = $fetch<UserSettingsData>('/api/user/settings')
      .then((settings) => {
        settingsEntry.value = {
          data: settings,
          fetchedAt: Date.now(),
        }
        return settings
      })
      .catch((error) => {
        console.warn('Failed to fetch user settings:', error)
        settingsEntry.value = {
          data: {} as UserSettingsData,
          fetchedAt: Date.now(),
        }
        throw error
      })
      .finally(() => {
        fetchPromise.value = null
      })

    fetchPromise.value = promise
    return promise
  }

  async function ensureInitialized(): Promise<void> {
    if (!hasLoggedIn.value) return
    if (isInitialized()) return

    try {
      await fetchSettings()
    }
    catch {
      // Error already logged in fetchSettings
    }
  }

  function getSettings(): UserSettingsData | undefined {
    return settingsEntry.value?.data
  }

  function clearSettings() {
    settingsEntry.value = null
    fetchPromise.value = null
  }

  async function flushBatch() {
    if (!hasLoggedIn.value) return
    if (batchQueue.value.size === 0) return

    const updates = Object.fromEntries(batchQueue.value.entries())

    try {
      await $fetch('/api/user/settings', {
        method: 'POST',
        body: updates,
      })
      batchQueue.value.clear()
    }
    catch (error) {
      console.warn('Failed to sync user settings:', error)
    }
  }

  const debouncedFlush = useDebounceFn(() => flushBatch(), 1000)

  function queueUpdate(key: string, value: unknown) {
    if (!hasLoggedIn.value) return

    if (settingsEntry.value?.data) {
      (settingsEntry.value.data as Record<string, unknown>)[key] = value
    }

    batchQueue.value.set(key, value)
    debouncedFlush()
  }

  watch(hasLoggedIn, (value, oldValue) => {
    if (oldValue && !value) {
      clearSettings()
      batchQueue.value.clear()
    }
  })

  return {
    fetchSettings,
    getSettings,
    clearSettings,
    ensureInitialized,
    isInitialized,
    queueUpdate,
    flushBatch,
  }
})
