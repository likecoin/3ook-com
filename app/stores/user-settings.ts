import { useDebounceFn } from '@vueuse/core'
import type { UserSettingsData, UserSettingKey } from '~~/shared/types/user-settings'

interface UserSettingsEntry {
  data: UserSettingsData
  fetchedAt: number
}

export const useUserSettingsStore = defineStore('user-settings', () => {
  const { loggedIn: hasLoggedIn } = useUserSession()
  const settingsEntry = ref<UserSettingsEntry | null>(null)
  const fetchPromise = ref<Promise<UserSettingsData> | null>(null)
  const flushPromise = ref<Promise<void> | null>(null)

  const batchQueue = ref<Map<UserSettingKey, UserSettingsData[UserSettingKey]>>(new Map())

  function isInitialized(): boolean {
    return settingsEntry.value !== null
  }

  async function fetchSettings(): Promise<UserSettingsData> {
    if (fetchPromise.value) {
      return fetchPromise.value
    }

    const promise = apiFetch<UserSettingsData>('/user/settings')
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

  async function flushBatch(): Promise<void> {
    if (!hasLoggedIn.value) return

    // One POST at a time: concurrent syncs can land out of order, and a failed one
    // requeuing behind a newer write would resurrect the value that replaced it.
    if (flushPromise.value) {
      await flushPromise.value
      return flushBatch()
    }

    if (batchQueue.value.size === 0) return

    // Clear before awaiting, like the book settings store: leaving a page fires one
    // flush per useSyncedUserSettings instance in the same tick, and a book grid
    // holds dozens of them.
    const entries = [...batchQueue.value.entries()]
    const updates = Object.fromEntries(entries)
    batchQueue.value.clear()

    flushPromise.value = (async () => {
      try {
        await apiFetch('/user/settings', {
          method: 'POST',
          retry: API_MAX_RETRIES,
          body: updates,
        })
      }
      catch (error) {
        console.warn('Failed to sync user settings:', error)
        // Requeue only what no newer write replaced, so a failed sync isn't lost.
        for (const [key, value] of entries) {
          if (!batchQueue.value.has(key)) batchQueue.value.set(key, value)
        }
      }
      finally {
        flushPromise.value = null
      }
    })()

    await flushPromise.value
  }

  const debouncedFlush = useDebounceFn(() => flushBatch(), 1000)

  function queueUpdate<K extends UserSettingKey>(key: K, value: UserSettingsData[K]) {
    if (!hasLoggedIn.value) return

    const currentValue = settingsEntry.value?.data?.[key]
    if (currentValue === value) return

    if (settingsEntry.value?.data) {
      settingsEntry.value.data[key] = value
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
