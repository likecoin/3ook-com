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
  // Bumped on clearSettings() so a request still in flight can tell its session
  // ended, and stop writing state the next account now owns.
  let sessionGeneration = 0

  function isStale(generation: number): boolean {
    return generation !== sessionGeneration
  }

  function isInitialized(): boolean {
    return settingsEntry.value !== null
  }

  async function fetchSettings(): Promise<UserSettingsData> {
    if (fetchPromise.value) {
      return fetchPromise.value
    }

    const generation = sessionGeneration
    const promise = apiFetch<UserSettingsData>('/user/settings')
      .then((settings) => {
        // Caching the previous account's settings would also mark the store
        // initialized, so the next one would never fetch its own.
        if (isStale(generation)) return settings
        settingsEntry.value = {
          data: settings,
          fetchedAt: Date.now(),
        }
        return settings
      })
      .catch((error) => {
        console.warn('Failed to fetch user settings:', error)
        if (!isStale(generation)) {
          settingsEntry.value = {
            data: {} as UserSettingsData,
            fetchedAt: Date.now(),
          }
        }
        throw error
      })
      .finally(() => {
        // clearSettings() already dropped it, and a newer fetch may own it now.
        if (!isStale(generation)) fetchPromise.value = null
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

  // Queued writes go with the session that made them: the next account must not
  // inherit them, nor wait on a request the previous one left in flight.
  function clearSettings() {
    sessionGeneration += 1
    settingsEntry.value = null
    fetchPromise.value = null
    flushPromise.value = null
    batchQueue.value.clear()
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

    const generation = sessionGeneration
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
        // Requeuing a dead session's entries would let the next account's flush
        // POST the previous account's values.
        if (isStale(generation)) return
        // Requeue only what no newer write replaced, so a failed sync isn't lost.
        for (const [key, value] of entries) {
          if (!batchQueue.value.has(key)) batchQueue.value.set(key, value)
        }
      }
      finally {
        // clearSettings() already dropped it, and a newer flush may own it now.
        if (!isStale(generation)) flushPromise.value = null
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
