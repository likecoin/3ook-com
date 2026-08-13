import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { usePlusSessionAPI } from '~/composables/use-plus-session-api'

const { mockFetch, mockIsApp, mockDetectedCountry } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockIsApp: { value: false },
  mockDetectedCountry: { value: 'TW' as string | undefined },
}))

mockNuxtImport('useLikeCoinSessionFetch', () => () => ({ value: mockFetch }))
mockNuxtImport('useAppDetection', () => () => ({ isApp: mockIsApp }))
mockNuxtImport('useDetectedGeolocation', () => () => ({ detectedCountry: mockDetectedCountry }))

beforeEach(() => {
  mockFetch.mockReset()
  mockIsApp.value = false
  mockDetectedCountry.value = 'TW'
})

describe('fetchLikerPlusCheckoutLink', () => {
  it('posts to /plus/new with period, tier, source and currency in query', () => {
    const { fetchLikerPlusCheckoutLink } = usePlusSessionAPI()
    fetchLikerPlusCheckoutLink({ period: 'yearly', from: 'pricing_page', currency: 'usd' })
    const [url, options] = mockFetch.mock.calls[0]!
    expect(url).toBe('/plus/new')
    expect(options.method).toBe('POST')
    expect(options.query).toEqual({
      period: 'yearly', tier: 'plus', from: 'pricing_page', currency: 'usd',
    })
  })

  it('passes tier civic through to /plus/new', () => {
    const { fetchLikerPlusCheckoutLink } = usePlusSessionAPI()
    fetchLikerPlusCheckoutLink({ period: 'yearly', tier: 'civic' })
    const [, options] = mockFetch.mock.calls[0]!
    expect(options.query.tier).toBe('civic')
  })

  it('maps giftNFTClassId to giftClassId and stamps geo/app metadata', () => {
    const { fetchLikerPlusCheckoutLink } = usePlusSessionAPI()
    fetchLikerPlusCheckoutLink({
      period: 'monthly',
      giftNFTClassId: '0xgift',
      trialPeriodDays: 7,
      coupon: 'WELCOME',
      uiMode: 'embedded',
    })
    const [, options] = mockFetch.mock.calls[0]!
    expect(options.body.giftClassId).toBe('0xgift')
    expect(options.body.trialPeriodDays).toBe(7)
    expect(options.body.coupon).toBe('WELCOME')
    expect(options.body.uiMode).toBe('embedded')
    expect(options.body.ipCountry).toBe('TW')
    expect(options.body.isApp).toBeUndefined()
  })

  it('defaults the period to monthly', () => {
    const { fetchLikerPlusCheckoutLink } = usePlusSessionAPI()
    fetchLikerPlusCheckoutLink({} as Parameters<typeof fetchLikerPlusCheckoutLink>[0])
    const [, options] = mockFetch.mock.calls[0]!
    expect(options.query.period).toBe('monthly')
  })
})

describe('updateLikerPlusSubscription', () => {
  it('posts the new period and gift class mapping to /plus/price', () => {
    const { updateLikerPlusSubscription } = usePlusSessionAPI()
    updateLikerPlusSubscription({ period: 'yearly', giftNFTClassId: '0xgift', giftPriceIndex: 1 })
    const [url, options] = mockFetch.mock.calls[0]!
    expect(url).toBe('/plus/price')
    expect(options.method).toBe('POST')
    expect(options.body).toEqual({
      period: 'yearly', tier: undefined, giftClassId: '0xgift', giftPriceIndex: 1,
    })
  })

  it('posts a tier switch to /plus/price', () => {
    const { updateLikerPlusSubscription } = usePlusSessionAPI()
    updateLikerPlusSubscription({ period: 'yearly', tier: 'civic' })
    const [, options] = mockFetch.mock.calls[0]!
    expect(options.body.tier).toBe('civic')
  })
})

describe('fetchLikerPlusBillingPortalLink', () => {
  it('posts to /plus/portal', () => {
    const { fetchLikerPlusBillingPortalLink } = usePlusSessionAPI()
    fetchLikerPlusBillingPortalLink()
    expect(mockFetch).toHaveBeenCalledWith('/plus/portal', { method: 'POST' })
  })
})

describe('fetchLikerPlusUpgradePortalLink', () => {
  it('posts the pinned upgrade_confirm flow to /plus/portal', () => {
    const { fetchLikerPlusUpgradePortalLink } = usePlusSessionAPI()
    fetchLikerPlusUpgradePortalLink({ period: 'monthly', tier: 'civic' })
    const [url, options] = mockFetch.mock.calls[0]!
    expect(url).toBe('/plus/portal')
    expect(options.method).toBe('POST')
    expect(options.body).toEqual({
      flow: 'upgrade_confirm', period: 'monthly', tier: 'civic',
    })
  })
})

describe('retryLikerPlusPayment', () => {
  it('posts to /plus/retry', () => {
    const { retryLikerPlusPayment } = usePlusSessionAPI()
    retryLikerPlusPayment()
    expect(mockFetch).toHaveBeenCalledWith('/plus/retry', { method: 'POST' })
  })
})
