import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useRuntimeConfig } from '#imports'
import type { FetchLikerPlusCheckoutLinkPayload } from '~/composables/use-plus-session-api'
import { useSubscriptionCheckout } from '~/composables/use-subscription-checkout'

const {
  mockAnalyticsParams,
  mockEmbeddedVariant,
  mockFetchCheckoutLink,
  mockIsApp,
  mockIsIAPSupported,
  mockIsLikerPlus,
  mockLogEvent,
  mockPurchase,
  mockRefreshSessionInfo,
  mockSetSession,
} = vi.hoisted(() => ({
  mockAnalyticsParams: { value: {} as Record<string, string | undefined> },
  mockEmbeddedVariant: { value: null as string | null },
  mockFetchCheckoutLink: vi.fn(async (_payload: FetchLikerPlusCheckoutLinkPayload): Promise<{
    url?: string
    clientSecret?: string
    paymentId: string
  }> => ({ paymentId: '' })),
  mockIsApp: { value: true },
  mockIsIAPSupported: { value: true },
  mockIsLikerPlus: { value: false },
  mockLogEvent: vi.fn(),
  mockPurchase: vi.fn(async (_options: { attributes: Record<string, string> }) => (
    { status: 'success' as const, message: '' }
  )),
  mockRefreshSessionInfo: vi.fn(),
  mockSetSession: vi.fn(),
}))

vi.mock('~/stores/plus-checkout', () => ({
  usePlusCheckoutStore: () => ({ setSession: mockSetSession }),
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
  fetchLikerPlusCheckoutLink: mockFetchCheckoutLink,
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
mockNuxtImport('useAppDetection', () => () => ({ isApp: mockIsApp }))
mockNuxtImport('useNativeIAP', () => () => ({
  isIAPSupported: mockIsIAPSupported,
  purchase: mockPurchase,
}))
mockNuxtImport('usePlusEligibility', () => () => ({ isCivicOfferable: { value: true } }))
mockNuxtImport('useABTest', () => () => ({ captureExposure: () => mockEmbeddedVariant.value }))
mockNuxtImport('useErrorHandler', () => () => ({ handleError: vi.fn() }))
mockNuxtImport('useLogEvent', () => mockLogEvent)
mockNuxtImport('requestNativeStoreReview', () => () => {})
mockNuxtImport('navigateTo', () => async () => {})

function getPurchasedAttributes() {
  return mockPurchase.mock.calls[0]![0].attributes
}

function getCheckoutRequest() {
  return mockFetchCheckoutLink.mock.calls[0]![0]
}

function getLoggedEvent(eventName: string) {
  return mockLogEvent.mock.calls.find(([name]) => name === eventName)?.[1]
}

beforeEach(() => {
  mockAnalyticsParams.value = {}
  mockIsLikerPlus.value = false
  mockLogEvent.mockClear()
  mockIsApp.value = true
  mockIsIAPSupported.value = true
  mockEmbeddedVariant.value = null
  mockPurchase.mockClear()
  mockSetSession.mockClear()
  mockFetchCheckoutLink.mockReset().mockResolvedValue({
    clientSecret: 'cs_test_1',
    paymentId: 'pay_1',
  })
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

  it('carries the resolved acquisition channel for RevenueCat', async () => {
    mockAnalyticsParams.value = {
      utmSource: 'plus-modal',
      mediaSource: 'apple_ads',
      campaign: '1234',
    }
    const { startSubscription } = useSubscriptionCheckout()
    await startSubscription({ plan: 'yearly' })
    const attributes = getPurchasedAttributes()
    expect(attributes.mediaSource).toBe('apple_ads')
    expect(attributes.campaign).toBe('1234')
    expect(attributes.utmSource).toBe('plus-modal')
  })

  it('omits the acquisition channel rather than blanking it', async () => {
    mockAnalyticsParams.value = { utmSource: 'plus-modal' }
    const { startSubscription } = useSubscriptionCheckout()
    await startSubscription({ plan: 'yearly' })
    const attributes = getPurchasedAttributes()
    // $mediaSource is sticky, so a purchase naming no channel must leave whatever
    // an earlier one resolved — unlike attributionSource below, it gets no tombstone.
    expect('mediaSource' in attributes).toBe(false)
    expect('campaign' in attributes).toBe(false)
  })
})

describe('useSubscriptionCheckout embedded checkout replay payload', () => {
  let stripePublishableKey: string

  beforeEach(() => {
    // The embedded variant is web-only and needs a publishable key,
    // so leave the native IAP path and give the config one.
    const { public: publicConfig } = useRuntimeConfig()
    stripePublishableKey = publicConfig.stripePublishableKey
    publicConfig.stripePublishableKey = 'pk_test'
    mockIsApp.value = false
    mockIsIAPSupported.value = false
    mockEmbeddedVariant.value = 'test'
  })

  // The config object is shared with the rest of the file, so put it back.
  afterEach(() => {
    useRuntimeConfig().public.stripePublishableKey = stripePublishableKey
  })

  it('stores the minted request verbatim so the hosted fallback can replay it', async () => {
    mockAnalyticsParams.value = {
      utmSource: 'plus-modal',
      initialUtmSource: 'facebookads',
    }
    const { startSubscription } = useSubscriptionCheckout()
    await startSubscription({
      plan: 'yearly',
      coupon: 'LAUNCH',
      trialPeriodDays: 7,
      mustCollectPaymentMethod: false,
      nftClassId: '0xgift',
      utmCampaign: '120210000000000000',
    })

    const request = getCheckoutRequest()
    expect(request.uiMode).toBe('embedded')
    // The fallback re-mints from this payload alone, so it must carry every field
    // the checkout page never sees.
    expect(mockSetSession).toHaveBeenCalledWith(expect.objectContaining({
      clientSecret: 'cs_test_1',
      paymentId: 'pay_1',
      period: 'yearly',
      tier: 'plus',
      coupon: 'LAUNCH',
      isTrial: true,
      checkoutPayload: request,
    }))
    expect(request).toMatchObject({
      period: 'yearly',
      tier: 'plus',
      coupon: 'LAUNCH',
      trialPeriodDays: 7,
      mustCollectPaymentMethod: false,
      giftNFTClassId: '0xgift',
      currency: 'usd',
      utmSource: 'plus-modal',
      initialUtmSource: 'facebookads',
      utmCampaign: '120210000000000000',
    })
  })

  it('keeps the hosted variant off the replay store', async () => {
    mockEmbeddedVariant.value = 'control'
    // A clientSecret alongside the url keeps uiMode the only thing that can send
    // this to the store.
    mockFetchCheckoutLink.mockResolvedValue({
      url: 'https://checkout.stripe.com/c/pay_1',
      clientSecret: 'cs_test_1',
      paymentId: 'pay_1',
    })
    const { startSubscription } = useSubscriptionCheckout()
    await startSubscription({ plan: 'yearly' })
    expect(getCheckoutRequest().uiMode).toBe('hosted')
    expect(mockSetSession).not.toHaveBeenCalled()
  })
})

describe('useSubscriptionCheckout checkout event period', () => {
  it.each([
    ['monthly', 'month'],
    ['yearly', 'year'],
  ] as const)('reports a %s plan as period %s', async (plan, period) => {
    const { startSubscription } = useSubscriptionCheckout()
    await startSubscription({ plan })
    expect(getLoggedEvent('add_to_cart')).toMatchObject({ period })
    expect(getLoggedEvent('begin_checkout')).toMatchObject({ period })
  })
})
