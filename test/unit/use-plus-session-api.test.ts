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
  it('posts to /plus/new with period, source and currency in query', () => {
    const { fetchLikerPlusCheckoutLink } = usePlusSessionAPI()
    fetchLikerPlusCheckoutLink({ period: 'yearly', from: 'pricing_page', currency: 'usd' })
    const [url, options] = mockFetch.mock.calls[0]!
    expect(url).toBe('/plus/new')
    expect(options.method).toBe('POST')
    expect(options.query).toEqual({ period: 'yearly', from: 'pricing_page', currency: 'usd' })
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
    expect(options.body).toEqual({ period: 'yearly', giftClassId: '0xgift', giftPriceIndex: 1 })
  })
})

describe('fetchLikerPlusBillingPortalLink', () => {
  it('posts to /plus/portal', () => {
    const { fetchLikerPlusBillingPortalLink } = usePlusSessionAPI()
    fetchLikerPlusBillingPortalLink()
    expect(mockFetch).toHaveBeenCalledWith('/plus/portal', { method: 'POST' })
  })
})

describe('retryLikerPlusPayment', () => {
  it('posts to /plus/retry', () => {
    const { retryLikerPlusPayment } = usePlusSessionAPI()
    retryLikerPlusPayment()
    expect(mockFetch).toHaveBeenCalledWith('/plus/retry', { method: 'POST' })
  })
})
