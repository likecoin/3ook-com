import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import { useAutoLocale } from '~/composables/use-auto-locale'
import type { LocaleCode } from '~~/shared/types/user-settings'

const {
  mockDetectedCountry,
  mockHasLoggedIn,
  mockRoute,
  mockSetLocale,
  mockSyncedLocale,
} = vi.hoisted(() => ({
  mockDetectedCountry: { value: null as string | null },
  mockHasLoggedIn: { value: false },
  mockRoute: { path: '/', query: {} as Record<string, string> },
  mockSetLocale: vi.fn(),
  mockSyncedLocale: { value: null as LocaleCode | null },
}))

mockNuxtImport('useI18n', () => () => ({
  locale: ref('zh-Hant'),
  locales: ref([{ code: 'en' }, { code: 'zh-Hant' }]),
  setLocale: mockSetLocale,
}))
mockNuxtImport('useRoute', () => () => mockRoute)
mockNuxtImport('useUserSession', () => () => ({ loggedIn: mockHasLoggedIn }))
mockNuxtImport('useUserSettingsStore', () => () => ({
  ensureInitialized: vi.fn(),
}))
mockNuxtImport('useSyncedUserSettings', () => () => mockSyncedLocale)
mockNuxtImport('useDetectedGeolocation', () => () => ({
  detectedCountry: mockDetectedCountry,
  initializeClientGeolocation: vi.fn(),
}))

describe('useAutoLocale', () => {
  beforeEach(() => {
    localStorage.clear()
    mockSetLocale.mockClear()
    mockDetectedCountry.value = 'US'
    mockHasLoggedIn.value = false
    mockRoute.path = '/'
    mockRoute.query = {}
    mockSyncedLocale.value = null
  })

  it('applies the account locale over the environment-detected one after logging in', async () => {
    const { initializeLocale } = useAutoLocale()
    await initializeLocale()
    expect(mockSetLocale.mock.calls).toEqual([['en']])

    // Login is in-page, so app.vue re-runs this once the account settings land
    mockHasLoggedIn.value = true
    mockSyncedLocale.value = 'zh-Hant'
    await initializeLocale()

    expect(mockSetLocale.mock.calls).toEqual([['en'], ['zh-Hant']])
  })

  it('never writes the detected locale back to the account', async () => {
    mockHasLoggedIn.value = true
    const { initializeLocale } = useAutoLocale()
    await initializeLocale()

    expect(mockSetLocale.mock.calls).toEqual([['en']])
    expect(mockSyncedLocale.value).toBeNull()
  })

  it('does not persist the campaign locale override to the account', async () => {
    mockHasLoggedIn.value = true
    mockRoute.query = { utm_campaign: 'summer' }
    const { initializeLocale } = useAutoLocale()
    await initializeLocale()

    expect(mockSetLocale.mock.calls).toEqual([['zh-Hant']])
    expect(mockSyncedLocale.value).toBeNull()
  })

  it('leaves an explicit locale prefix in the URL alone', async () => {
    mockRoute.path = '/en/about'
    const { initializeLocale } = useAutoLocale()
    await initializeLocale()

    expect(mockSetLocale).not.toHaveBeenCalled()
  })

  it('persists an explicit locale choice to the account', () => {
    mockHasLoggedIn.value = true
    const { setLocale } = useAutoLocale()
    setLocale('en')

    expect(mockSyncedLocale.value).toBe('en')
    expect(mockSetLocale.mock.calls).toEqual([['en']])
  })

  it('keeps an explicit locale choice out of the account while logged out', () => {
    const { setLocale } = useAutoLocale()
    setLocale('en')

    expect(mockSyncedLocale.value).toBeNull()
    expect(mockSetLocale.mock.calls).toEqual([['en']])
  })

  it('applies a user-initiated switch exactly once', async () => {
    mockHasLoggedIn.value = true
    const { initializeLocale, setLocale } = useAutoLocale()
    await initializeLocale()
    mockSetLocale.mockClear()

    setLocale('zh-Hant')

    expect(mockSetLocale.mock.calls).toEqual([['zh-Hant']])
  })
})
