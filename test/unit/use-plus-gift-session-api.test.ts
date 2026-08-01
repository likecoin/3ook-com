import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { usePlusGiftSessionAPI } from '~/composables/use-plus-gift-session-api'

const { mockFetch, mockIsApp, mockDetectedCountry } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockIsApp: { value: false },
  mockDetectedCountry: { value: 'TW' as string | undefined },
}))

mockNuxtImport('useLikeCoinSessionFetch', () => () => ({ value: mockFetch }))
mockNuxtImport('useAppDetection', () => () => ({ isApp: mockIsApp }))
mockNuxtImport('useDetectedGeolocation', () => () => ({ detectedCountry: mockDetectedCountry }))

const GIFT_INFO = {
  toEmail: 'friend@example.com',
  toName: 'Friend',
  fromName: 'Gifter',
}

beforeEach(() => {
  mockFetch.mockReset()
  mockIsApp.value = false
  mockDetectedCountry.value = 'TW'
})

describe('fetchLikerPlusGiftCheckoutLink', () => {
  it('posts to /plus/gift/new with period and quantity in query', () => {
    const { fetchLikerPlusGiftCheckoutLink } = usePlusGiftSessionAPI()
    fetchLikerPlusGiftCheckoutLink({ period: 'monthly', quantity: 3, giftInfo: GIFT_INFO })
    const [url, options] = mockFetch.mock.calls[0]!
    expect(url).toBe('/plus/gift/new')
    expect(options.method).toBe('POST')
    expect(options.query).toEqual({
      period: 'monthly', quantity: 3, from: undefined, currency: undefined,
    })
    expect(options.body.giftInfo).toEqual(GIFT_INFO)
    expect(options.body.ipCountry).toBe('TW')
  })

  it('defaults to a yearly gift with quantity 1', () => {
    const { fetchLikerPlusGiftCheckoutLink } = usePlusGiftSessionAPI()
    fetchLikerPlusGiftCheckoutLink({ giftInfo: GIFT_INFO })
    const [, options] = mockFetch.mock.calls[0]!
    expect(options.query.period).toBe('yearly')
    expect(options.query.quantity).toBe(1)
  })
})

describe('fetchPlusGiftCartStatusById', () => {
  it('fetches /plus/gift/:cartId/status with the claim token', () => {
    const { fetchPlusGiftCartStatusById } = usePlusGiftSessionAPI()
    fetchPlusGiftCartStatusById({ cartId: 'cart_1', token: 'token_1' })
    const [url, options] = mockFetch.mock.calls[0]!
    expect(url).toBe('/plus/gift/cart_1/status')
    expect(options.query).toEqual({ token: 'token_1' })
  })
})
