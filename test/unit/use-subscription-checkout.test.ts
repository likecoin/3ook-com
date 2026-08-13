import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useSubscriptionCheckout } from '~/composables/use-subscription-checkout'

const {
  mockUser,
  mockHasLoggedIn,
  mockIsLikerPlus,
  mockIsCivicMember,
  mockIsPlanPeriodUpgrade,
  mockIsApp,
  mockIsIAPSupported,
  mockIsCivicOfferable,
  mockPurchaseViaIAP,
  mockFetchUpgradePortalLink,
  mockUpdateSubscription,
  mockFetchCheckoutLink,
  mockLogEvent,
  mockToastAdd,
  mockNavigateTo,
} = vi.hoisted(() => ({
  mockUser: { value: { likerId: 'liker-1' } as Record<string, unknown> | null },
  mockHasLoggedIn: { value: true },
  mockIsLikerPlus: { value: false },
  mockIsCivicMember: { value: false },
  mockIsPlanPeriodUpgrade: vi.fn(() => false),
  mockIsApp: { value: false },
  mockIsIAPSupported: { value: false },
  mockIsCivicOfferable: { value: true },
  mockPurchaseViaIAP: vi.fn(() => Promise.resolve({ status: 'cancelled' })),
  mockFetchUpgradePortalLink: vi.fn(() => Promise.resolve({ url: 'https://billing.stripe.com/upgrade' })),
  mockUpdateSubscription: vi.fn(() => Promise.resolve({})),
  mockFetchCheckoutLink: vi.fn(() => Promise.resolve({ url: 'https://checkout.stripe.com/new' })),
  mockLogEvent: vi.fn(),
  mockToastAdd: vi.fn(),
  mockNavigateTo: vi.fn(),
}))

vi.mock('~/stores/plus-checkout', () => ({
  usePlusCheckoutStore: () => ({ setSession: vi.fn() }),
}))

mockNuxtImport('useUserSession', () => () => ({ user: mockUser, loggedIn: mockHasLoggedIn }))
mockNuxtImport('useSubscription', () => () => ({
  currency: { value: 'HKD' },
  getTierPrice: () => 99.99,
  isLikerPlus: mockIsLikerPlus,
  isCivicMember: mockIsCivicMember,
  isPlanPeriodUpgrade: mockIsPlanPeriodUpgrade,
  hasLoggedIn: mockHasLoggedIn,
  getCheckoutCurrency: () => 'hkd',
}))
mockNuxtImport('usePlusSessionAPI', () => () => ({
  fetchLikerPlusCheckoutLink: mockFetchCheckoutLink,
  updateLikerPlusSubscription: mockUpdateSubscription,
  fetchLikerPlusUpgradePortalLink: mockFetchUpgradePortalLink,
}))
mockNuxtImport('useAppDetection', () => () => ({ isApp: mockIsApp }))
mockNuxtImport('useNativeIAP', () => () => ({
  isIAPSupported: mockIsIAPSupported,
  purchase: mockPurchaseViaIAP,
}))
mockNuxtImport('usePlusEligibility', () => () => ({ isCivicOfferable: mockIsCivicOfferable }))
mockNuxtImport('useAccountStore', () => () => ({
  login: vi.fn(),
  refreshSessionInfo: vi.fn(),
  savePlusRedirectRoute: vi.fn(),
}))
mockNuxtImport('useAnalytics', () => () => ({ getAnalyticsParameters: () => ({}) }))
mockNuxtImport('useABTest', () => () => ({ captureExposure: () => 'control' }))
mockNuxtImport('useRouteQuery', () => () => () => undefined)
mockNuxtImport('useLocaleRoute', () => () => (route: unknown) => route)
mockNuxtImport('useI18n', () => () => ({ t: (key: string) => key }))
mockNuxtImport('useToast', () => () => ({ add: mockToastAdd }))
mockNuxtImport('useBlockingModal', () => () => ({ open: vi.fn(), close: vi.fn() }))
mockNuxtImport('useErrorHandler', () => () => ({ handleError: vi.fn() }))
mockNuxtImport('useLogEvent', () => mockLogEvent)
mockNuxtImport('navigateTo', () => mockNavigateTo)

// A Stripe-billed Plus member on the web, the one state cleared to upgrade in place.
function setupWebPlusMember() {
  mockIsLikerPlus.value = true
  mockIsCivicMember.value = false
  mockIsIAPSupported.value = false
  mockIsCivicOfferable.value = true
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUser.value = { likerId: 'liker-1' }
  mockHasLoggedIn.value = true
  mockIsLikerPlus.value = false
  mockIsCivicMember.value = false
  mockIsPlanPeriodUpgrade.mockReturnValue(false)
  mockIsApp.value = false
  mockIsIAPSupported.value = false
  mockIsCivicOfferable.value = true
  mockPurchaseViaIAP.mockResolvedValue({ status: 'cancelled' })
  mockFetchUpgradePortalLink.mockResolvedValue({ url: 'https://billing.stripe.com/upgrade' })
})

describe('startSubscription — Civic eligibility backstop', () => {
  it('opens the upgrade-confirm portal for an eligible member', async () => {
    setupWebPlusMember()
    await useSubscriptionCheckout().startSubscription({ plan: 'monthly', tier: 'civic' })
    expect(mockFetchUpgradePortalLink).toHaveBeenCalledWith({ period: 'monthly', tier: 'civic' })
    expect(mockNavigateTo).toHaveBeenCalledWith('https://billing.stripe.com/upgrade', { external: true })
  })

  it('blocks the Stripe upgrade when Civic is not offerable on this surface', async () => {
    setupWebPlusMember()
    mockIsCivicOfferable.value = false
    await useSubscriptionCheckout().startSubscription({ plan: 'monthly', tier: 'civic' })
    // No Stripe portal for a member billed elsewhere: it has no subscription to
    // upgrade, and the confirm page would start a second one alongside the first.
    expect(mockFetchUpgradePortalLink).not.toHaveBeenCalled()
    expect(mockUpdateSubscription).not.toHaveBeenCalled()
    expect(mockNavigateTo).not.toHaveBeenCalled()
    expect(mockLogEvent).toHaveBeenCalledWith('subscription_civic_wrong_billing_source')
    expect(mockToastAdd).toHaveBeenCalled()
  })

  it('blocks the store purchase when Civic is not offerable in this shell', async () => {
    mockIsIAPSupported.value = true
    mockIsApp.value = true
    mockIsCivicOfferable.value = false
    await useSubscriptionCheckout().startSubscription({ plan: 'monthly', tier: 'civic' })
    expect(mockPurchaseViaIAP).not.toHaveBeenCalled()
    expect(mockLogEvent).toHaveBeenCalledWith('subscription_iap_civic_unsupported')
  })

  it('leaves a period-only change ungated', async () => {
    setupWebPlusMember()
    mockIsCivicOfferable.value = false
    mockIsPlanPeriodUpgrade.mockReturnValue(true)
    await useSubscriptionCheckout().startSubscription({ plan: 'yearly', tier: 'plus' })
    expect(mockUpdateSubscription).toHaveBeenCalled()
    expect(mockToastAdd).not.toHaveBeenCalled()
  })

  it('leaves a new web subscriber ungated', async () => {
    await useSubscriptionCheckout().startSubscription({ plan: 'yearly', tier: 'civic' })
    expect(mockFetchCheckoutLink).toHaveBeenCalled()
    expect(mockToastAdd).not.toHaveBeenCalled()
  })
})
