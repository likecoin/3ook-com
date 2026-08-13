import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useSubscriptionCheckout } from '~/composables/use-subscription-checkout'

const {
  mockAnalyticsParams,
  mockIsLikerPlus,
  mockPurchase,
  mockRefreshSessionInfo,
} = vi.hoisted(() => ({
  mockAnalyticsParams: { value: {} as Record<string, string | undefined> },
  mockIsLikerPlus: { value: false },
  mockPurchase: vi.fn(async (_options: { attributes: Record<string, string> }) => (
    { status: 'success' as const, message: '' }
  )),
  mockRefreshSessionInfo: vi.fn(),
}))

vi.mock('~/stores/plus-checkout', () => ({
  usePlusCheckoutStore: () => ({ setSession: vi.fn() }),
}))

mockNuxtImport('useSubscription', () => () => ({
  currency: { value: 'usd' },
  getTierPrice: () => 39.99,
  isLikerPlus: mockIsLikerPlus,
  isCivicMember: { value: false },
  isPlanPeriodUpgrade: () => false,
  hasLoggedIn: { value: true },
  getCheckoutCurrency: () => 'usd',
}))
mockNuxtImport('usePlusSessionAPI', () => () => ({
  fetchLikerPlusCheckoutLink: vi.fn(),
  updateLikerPlusSubscription: vi.fn(),
}))
mockNuxtImport('useI18n', () => () => ({ t: (key: string) => key }))
mockNuxtImport('useAccountStore', () => () => ({
  refreshSessionInfo: mockRefreshSessionInfo,
  login: vi.fn(),
  savePlusRedirectRoute: vi.fn(),
}))
mockNuxtImport('useUserSession', () => () => ({ user: { value: { likerId: 'liker1' } } }))
mockNuxtImport('useLocaleRoute', () => () => (route: unknown) => route)
mockNuxtImport('useRouteQuery', () => () => () => '')
mockNuxtImport('useToast', () => () => ({ add: vi.fn() }))
mockNuxtImport('useBlockingModal', () => () => ({ open: vi.fn(), close: vi.fn() }))
mockNuxtImport('useAnalytics', () => () => ({
  getAnalyticsParameters: () => mockAnalyticsParams.value,
}))
mockNuxtImport('useAppDetection', () => () => ({ isApp: { value: true } }))
mockNuxtImport('useNativeIAP', () => () => ({
  isIAPSupported: { value: true },
  purchase: mockPurchase,
}))
mockNuxtImport('usePlusEligibility', () => () => ({ isCivicOfferable: { value: true } }))
mockNuxtImport('useABTest', () => () => ({ captureExposure: () => null }))
mockNuxtImport('useErrorHandler', () => () => ({ handleError: vi.fn() }))
mockNuxtImport('useLogEvent', () => () => {})
mockNuxtImport('requestNativeStoreReview', () => () => {})
mockNuxtImport('navigateTo', () => async () => {})

function getPurchasedAttributes() {
  return mockPurchase.mock.calls[0]![0].attributes
}

beforeEach(() => {
  mockAnalyticsParams.value = {}
  mockIsLikerPlus.value = false
  mockPurchase.mockClear()
  // The purchase flow polls the session until the webhook grants Plus; flip it on
  // the first refresh so the test doesn't sit through the retry backoff.
  mockRefreshSessionInfo.mockReset().mockImplementation(() => {
    mockIsLikerPlus.value = true
  })
})

describe('useSubscriptionCheckout IAP first-touch attributes', () => {
  it('carries first-touch attribution as RevenueCat subscriber attributes', async () => {
    mockAnalyticsParams.value = {
      utmSource: 'plus-modal',
      initialUtmSource: 'facebookads',
      initialUtmMedium: 'paid_Instagram_Feed',
      initialUtmCampaign: '120210000000000000',
    }
    const { startSubscription } = useSubscriptionCheckout()
    await startSubscription({ plan: 'yearly' })
    const attributes = getPurchasedAttributes()
    expect(attributes.initialUtmSource).toBe('facebookads')
    expect(attributes.initialUtmMedium).toBe('paid_Instagram_Feed')
    expect(attributes.initialUtmCampaign).toBe('120210000000000000')
  })

  it('omits first-touch rather than blanking a sticky attribute', async () => {
    mockAnalyticsParams.value = { utmSource: 'plus-modal', initialUtmSource: '' }
    const { startSubscription } = useSubscriptionCheckout()
    await startSubscription({ plan: 'yearly' })
    const attributes = getPurchasedAttributes()
    // RevenueCat attributes are sticky and cannot be retracted, so a session with
    // no first-touch must leave whatever an earlier session already recorded.
    expect('initialUtmSource' in attributes).toBe(false)
    expect('initialUtmMedium' in attributes).toBe(false)
    expect('initialUtmCampaign' in attributes).toBe(false)
    // The tombstoned attributes keep their existing clear-on-every-purchase shape.
    expect(attributes.attributionSource).toBe('')
    expect(attributes.plusGiftClassId).toBe('')
  })
})
