import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { User } from '#auth-utils'
import { usePlusEligibility } from '~/composables/use-plus-eligibility'

const {
  mockUser,
  mockIsApp,
  mockIsIOS,
  mockIsAndroid,
  mockIsIAPSupported,
  mockIsCivicIAPSupported,
  mockIsCivicMember,
  mockIsLikerPlus,
  mockCanStartCivicSubscribeFlow,
} = vi.hoisted(() => ({
  // Typed against the session user so a renamed or misspelled Plus field fails
  // the build instead of silently reading undefined.
  mockUser: { value: {} as Partial<User> | null },
  mockIsApp: { value: false },
  mockIsIOS: { value: false },
  mockIsAndroid: { value: false },
  mockIsIAPSupported: { value: false },
  mockIsCivicIAPSupported: { value: false },
  mockIsCivicMember: { value: false },
  mockIsLikerPlus: { value: false },
  mockCanStartCivicSubscribeFlow: { value: false },
}))

mockNuxtImport('useUserSession', () => () => ({ user: mockUser }))
mockNuxtImport('useAppDetection', () => () => ({
  isApp: mockIsApp, isIOS: mockIsIOS, isAndroid: mockIsAndroid,
}))
mockNuxtImport('useNativeIAP', () => () => ({
  isIAPSupported: mockIsIAPSupported,
  isCivicIAPSupported: mockIsCivicIAPSupported,
  canStartCivicSubscribeFlow: mockCanStartCivicSubscribeFlow,
}))
mockNuxtImport('useSubscription', () => () => ({
  isCivicMember: mockIsCivicMember,
  isLikerPlus: mockIsLikerPlus,
}))

// A store-billed Plus subscriber inside a Civic-capable app shell.
function setupStoreSubscriberInApp(overrides: Partial<User> = {}) {
  mockUser.value = {
    isLikerPlus: true,
    isLikerPlusTrial: false,
    likerPlusProvider: 'revenuecat',
    ...overrides,
  }
  mockIsLikerPlus.value = mockUser.value.isLikerPlus ?? false
  mockIsApp.value = true
  mockIsIAPSupported.value = true
  mockIsCivicIAPSupported.value = true
}

beforeEach(() => {
  mockUser.value = {}
  mockIsApp.value = false
  mockIsIOS.value = false
  mockIsAndroid.value = false
  mockIsIAPSupported.value = false
  mockIsCivicIAPSupported.value = false
  mockIsCivicMember.value = false
  mockIsLikerPlus.value = false
  mockCanStartCivicSubscribeFlow.value = false
})

describe('canUpgradeToCivic — app version support', () => {
  it('allows the upgrade on a shell whose store offers Civic IAP', () => {
    setupStoreSubscriberInApp()
    mockIsIOS.value = true
    expect(usePlusEligibility().canUpgradeToCivic.value).toBe(true)
  })

  it('blocks the upgrade on an app shell that predates Civic IAP', () => {
    setupStoreSubscriberInApp()
    mockIsIOS.value = true
    mockIsCivicIAPSupported.value = false
    expect(usePlusEligibility().canUpgradeToCivic.value).toBe(false)
  })

  it('blocks the upgrade on an app shell with no IAP at all', () => {
    setupStoreSubscriberInApp()
    mockIsIOS.value = true
    mockIsIAPSupported.value = false
    mockIsCivicIAPSupported.value = false
    expect(usePlusEligibility().canUpgradeToCivic.value).toBe(false)
  })
})

describe('canUpgradeToCivic — billing source vs current surface', () => {
  it('blocks a Stripe subscriber browsing in the app', () => {
    setupStoreSubscriberInApp({ likerPlusProvider: 'stripe' })
    mockIsIOS.value = true
    expect(usePlusEligibility().canUpgradeToCivic.value).toBe(false)
  })

  it('blocks a legacy subscriber with no provider recorded in the app', () => {
    setupStoreSubscriberInApp({ likerPlusProvider: undefined })
    mockIsIOS.value = true
    expect(usePlusEligibility().canUpgradeToCivic.value).toBe(false)
  })

  it('blocks a store-billed subscriber browsing on web', () => {
    mockUser.value = { isLikerPlus: true, likerPlusProvider: 'revenuecat' }
    expect(usePlusEligibility().canUpgradeToCivic.value).toBe(false)
  })

  it('allows a Stripe subscriber on web', () => {
    mockUser.value = { isLikerPlus: true, likerPlusProvider: 'stripe' }
    expect(usePlusEligibility().canUpgradeToCivic.value).toBe(true)
  })

  it('blocks a shared-seat member everywhere', () => {
    setupStoreSubscriberInApp({ likerPlusProvider: 'shared' })
    mockIsIOS.value = true
    expect(usePlusEligibility().canUpgradeToCivic.value).toBe(false)

    mockIsApp.value = false
    expect(usePlusEligibility().canUpgradeToCivic.value).toBe(false)
  })
})

describe('canUpgradeToCivic — cross-store', () => {
  it('blocks an App Store subscription opened in the Android app', () => {
    setupStoreSubscriberInApp({ likerPlusStore: 'app_store' })
    mockIsAndroid.value = true
    expect(usePlusEligibility().canUpgradeToCivic.value).toBe(false)
  })

  it('blocks a Play Store subscription opened in the iOS app', () => {
    setupStoreSubscriberInApp({ likerPlusStore: 'play_store' })
    mockIsIOS.value = true
    expect(usePlusEligibility().canUpgradeToCivic.value).toBe(false)
  })

  it('allows an App Store subscription in the iOS app', () => {
    setupStoreSubscriberInApp({ likerPlusStore: 'app_store' })
    mockIsIOS.value = true
    expect(usePlusEligibility().canUpgradeToCivic.value).toBe(true)
  })

  it('allows a Play Store subscription in the Android app', () => {
    setupStoreSubscriberInApp({ likerPlusStore: 'play_store' })
    mockIsAndroid.value = true
    expect(usePlusEligibility().canUpgradeToCivic.value).toBe(true)
  })

  it('allows an unknown store rather than blocking legacy sessions', () => {
    setupStoreSubscriberInApp({ likerPlusStore: undefined })
    mockIsIOS.value = true
    expect(usePlusEligibility().canUpgradeToCivic.value).toBe(true)
  })
})

describe('likerPlusManageMode — cross-store', () => {
  it('opens the native sheet for an App Store subscription in the iOS app', () => {
    setupStoreSubscriberInApp({ likerPlusStore: 'app_store' })
    mockIsIOS.value = true
    expect(usePlusEligibility().likerPlusManageMode.value).toBe('native-store')
  })

  it('falls back to manage-on-device for an App Store subscription in the Android app', () => {
    setupStoreSubscriberInApp({ likerPlusStore: 'app_store' })
    mockIsAndroid.value = true
    expect(usePlusEligibility().likerPlusManageMode.value).toBe('store-info')
  })

  it('falls back to manage-on-device for a Play subscription in the iOS app', () => {
    setupStoreSubscriberInApp({ likerPlusStore: 'play_store' })
    mockIsIOS.value = true
    expect(usePlusEligibility().likerPlusManageMode.value).toBe('store-info')
  })

  it('opens the native sheet for an unknown store rather than blocking', () => {
    setupStoreSubscriberInApp({ likerPlusStore: undefined })
    mockIsIOS.value = true
    expect(usePlusEligibility().likerPlusManageMode.value).toBe('native-store')
  })

  it('still guards an expired store subscriber on the wrong platform', () => {
    mockUser.value = {
      isLikerPlus: false,
      isExpiredLikerPlus: true,
      likerPlusProvider: 'revenuecat',
      likerPlusStore: 'play_store',
    }
    mockIsApp.value = true
    mockIsIOS.value = true
    mockIsIAPSupported.value = true
    expect(usePlusEligibility().likerPlusManageMode.value).toBe('store-info')
  })
})

describe('isCivicOfferable', () => {
  it('pitches Civic to a non-member wherever it is sellable', () => {
    mockCanStartCivicSubscribeFlow.value = true
    expect(usePlusEligibility().isCivicOfferable.value).toBe(true)
  })

  it('hides Civic from a non-member on a shell that cannot sell it', () => {
    mockCanStartCivicSubscribeFlow.value = false
    expect(usePlusEligibility().isCivicOfferable.value).toBe(false)
  })

  it('hides Civic from an existing member with no chargeable upgrade path', () => {
    setupStoreSubscriberInApp({ likerPlusStore: 'play_store' })
    mockIsIOS.value = true
    mockCanStartCivicSubscribeFlow.value = true
    expect(usePlusEligibility().isCivicOfferable.value).toBe(false)
  })

  it('hides Civic from someone who already has it', () => {
    setupStoreSubscriberInApp({ likerPlusStore: 'app_store' })
    mockIsIOS.value = true
    mockIsCivicMember.value = true
    mockCanStartCivicSubscribeFlow.value = true
    expect(usePlusEligibility().isCivicOfferable.value).toBe(false)
  })
})

describe('canUpgradeToCivic — subscriber state', () => {
  it('blocks a member already on Civic', () => {
    setupStoreSubscriberInApp()
    mockIsIOS.value = true
    mockIsCivicMember.value = true
    expect(usePlusEligibility().canUpgradeToCivic.value).toBe(false)
  })

  it('blocks a trialling member', () => {
    setupStoreSubscriberInApp({ isLikerPlusTrial: true })
    mockIsIOS.value = true
    expect(usePlusEligibility().canUpgradeToCivic.value).toBe(false)
  })

  it('blocks a non-subscriber', () => {
    mockUser.value = { isLikerPlus: false }
    expect(usePlusEligibility().canUpgradeToCivic.value).toBe(false)
  })
})
