import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { nextTick, ref, type Ref } from 'vue'
import type { RegionCode, UserSettingsData } from '~~/shared/types/user-settings'

type UseRegion = typeof import('~/composables/use-region').useRegion
type UseBookRegionGate = typeof import('~/composables/use-region').useBookRegionGate

const {
  mockAccountSettings,
  mockDetectedCountry,
  mockHasLoggedIn,
  mockIPCountry,
  mockStates,
  mockSyncedRegion,
} = vi.hoisted(() => ({
  mockAccountSettings: { value: {} as UserSettingsData },
  mockDetectedCountry: { value: null as string | null },
  mockHasLoggedIn: { value: false },
  mockIPCountry: { value: null as string | null },
  mockStates: new Map<string, Ref<RegionCode | undefined>>(),
  mockSyncedRegion: { value: 'HK' as RegionCode },
}))

// Keyed like the real useState, so instances share state as app.vue relies on
mockNuxtImport('useState', () => (key: string, init: () => RegionCode | undefined) => {
  const existing = mockStates.get(key)
  if (existing) return existing
  const state = ref(init())
  mockStates.set(key, state)
  return state
})
mockNuxtImport('useUserSession', () => () => ({ loggedIn: mockHasLoggedIn }))
mockNuxtImport('useUserSettingsStore', () => () => ({
  ensureInitialized: vi.fn(),
  getSettings: () => mockAccountSettings.value,
}))
mockNuxtImport('useSyncedUserSettings', () => () => mockSyncedRegion)
mockNuxtImport('useDetectedGeolocation', () => () => ({
  detectedCountry: mockDetectedCountry,
  ipCountry: mockIPCountry,
  initializeClientGeolocation: vi.fn(),
}))
mockNuxtImport('useIPCountryState', () => () => mockIPCountry)
mockNuxtImport('useLogEvent', () => vi.fn())
mockNuxtImport('useSetLogPersonProperties', () => vi.fn())

describe('useRegion', () => {
  let useRegion: UseRegion

  beforeEach(async () => {
    localStorage.clear()
    mockAccountSettings.value = {}
    mockDetectedCountry.value = 'US'
    mockHasLoggedIn.value = false
    mockIPCountry.value = null
    mockStates.clear()
    mockSyncedRegion.value = 'HK'
    // The localStorage ref is module-scoped and shared, so re-evaluate the module
    // to hand each test a fresh one reading the storage cleared above.
    vi.resetModules()
    ;({ useRegion } = await import('~/composables/use-region'))
  })

  it('applies the account region over a device leftover after logging in', async () => {
    localStorage.setItem('user_region', 'TW')
    mockAccountSettings.value = { region: 'JP' }
    mockHasLoggedIn.value = true

    const { region, initializeRegion } = useRegion()
    await initializeRegion()

    expect(region.value).toBe('JP')
  })

  it('keeps a guest pick through a login into an account with no saved region', async () => {
    const { setRegion } = useRegion()
    setRegion('TW')
    await nextTick()

    // app.vue re-resolves on login; the account has nothing saved
    mockHasLoggedIn.value = true
    const { region, initializeRegion } = useRegion()
    await initializeRegion()

    expect(region.value).toBe('TW')
    expect(mockSyncedRegion.value).toBe('HK')
  })

  it('shares one localStorage ref across instances', async () => {
    const { setRegion } = useRegion()
    const { region, initializeRegion } = useRegion()

    setRegion('TW')
    await initializeRegion()

    // useStorage's write-back lands a tick later, so a per-instance copy would
    // still read '' here and resolve the shared state down to the detected region
    expect(region.value).toBe('TW')
  })

  it('drops the device copy on logout so the next account starts clean', async () => {
    const { setRegion, resetRegionForGuest } = useRegion()
    setRegion('TW')
    await nextTick()

    const { region, initializeRegion } = useRegion()
    resetRegionForGuest()
    await nextTick()

    expect(region.value).toBe('US')
    expect(localStorage.getItem('user_region')).toBe('')

    await initializeRegion()
    expect(region.value).toBe('US')
  })
})

describe('useBookRegionGate', () => {
  let useRegion: UseRegion
  let useBookRegionGate: UseBookRegionGate

  beforeEach(async () => {
    localStorage.clear()
    mockAccountSettings.value = {}
    mockDetectedCountry.value = 'US'
    mockHasLoggedIn.value = false
    mockIPCountry.value = null
    mockStates.clear()
    mockSyncedRegion.value = 'HK'
    vi.resetModules()
    ;({ useRegion, useBookRegionGate } = await import('~/composables/use-region'))
  })

  it('restricts on the IP country even when the setting says elsewhere', async () => {
    mockIPCountry.value = 'HK'
    useRegion().setRegion('TW')
    await nextTick()

    const { getIsRegionRestricted } = useBookRegionGate()

    expect(getIsRegionRestricted(['HK'])).toBe(true)
    expect(getIsRegionRestricted(['JP'])).toBe(false)
  })

  it('restricts on the chosen region with no IP country resolved', async () => {
    useRegion().setRegion('TW')
    await nextTick()

    const { getIsRegionRestricted } = useBookRegionGate()

    expect(getIsRegionRestricted(['TW'])).toBe(true)
    expect(getIsRegionRestricted(['HK'])).toBe(false)
  })

  it('ignores an IP country that is not a real region code', async () => {
    // 'HANT' from a zh-Hant-HK style value, 'T1' from cf-ipcountry's Tor code
    mockIPCountry.value = 'HANT'
    const { getIsRegionRestricted } = useBookRegionGate()

    expect(getIsRegionRestricted(['HANT'])).toBe(false)
  })
})
