import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useBookPurchaseSessionAPI } from '~/composables/use-book-purchase-session-api'
import { API_MAX_RETRIES } from '~~/shared/utils/fetch-retry'

const { mockFetch, mockIsApp, mockDetectedCountry } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockIsApp: { value: false },
  mockDetectedCountry: { value: 'HK' as string | undefined },
}))

mockNuxtImport('useLikeCoinSessionFetch', () => () => ({ value: mockFetch }))
mockNuxtImport('useAppDetection', () => () => ({ isApp: mockIsApp }))
mockNuxtImport('useDetectedGeolocation', () => () => ({ detectedCountry: mockDetectedCountry }))

beforeEach(() => {
  mockFetch.mockReset()
  mockIsApp.value = false
  mockDetectedCountry.value = 'HK'
})

describe('createNFTBookPurchase', () => {
  it('posts to the class checkout endpoint with price index and source in query', () => {
    const { createNFTBookPurchase } = useBookPurchaseSessionAPI()
    createNFTBookPurchase({ nftClassId: '0xABC', priceIndex: 1 })
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]!
    expect(url).toBe('/likernft/book/purchase/0xABC/new')
    expect(options.method).toBe('POST')
    expect(options.query).toEqual({ price_index: 1, from: 'liker_land' })
  })

  it('converts customPrice to integer minor units and stamps site metadata', () => {
    const { createNFTBookPurchase } = useBookPurchaseSessionAPI()
    createNFTBookPurchase({ nftClassId: '0xabc', priceIndex: 0, customPrice: 9.999 })
    const [, options] = mockFetch.mock.calls[0]!
    expect(options.body.customPriceInDecimal).toBe(999)
    expect(options.body.site).toBe('3ook.com')
    expect(options.body.ipCountry).toBe('HK')
    expect(options.body.isApp).toBeUndefined()
  })

  it('omits customPriceInDecimal when no custom price is given and flags app purchases', () => {
    mockIsApp.value = true
    mockDetectedCountry.value = undefined
    const { createNFTBookPurchase } = useBookPurchaseSessionAPI()
    createNFTBookPurchase({ nftClassId: '0xabc', priceIndex: 0 })
    const [, options] = mockFetch.mock.calls[0]!
    expect(options.body.customPriceInDecimal).toBeUndefined()
    expect(options.body.ipCountry).toBeUndefined()
    expect(options.body.isApp).toBe(true)
  })
})

describe('createNFTBookCartPurchase', () => {
  it('lowercases class IDs and maps per-item custom prices to minor units', () => {
    const { createNFTBookCartPurchase } = useBookPurchaseSessionAPI()
    createNFTBookCartPurchase(
      [
        { nftClassId: '0xAbCd', priceIndex: 2, quantity: 1, customPrice: 12.5 },
        { nftClassId: '0xEF01', priceIndex: 0, quantity: 3 },
      ] as CartItem[],
      {},
    )
    const [url, options] = mockFetch.mock.calls[0]!
    expect(url).toBe('/likernft/book/purchase/cart/new')
    expect(options.method).toBe('POST')
    expect(options.query).toEqual({ from: 'liker_land' })
    expect(options.body.items).toEqual([
      { classId: '0xabcd', priceIndex: 2, customPriceInDecimal: 1250, quantity: 1 },
      { classId: '0xef01', priceIndex: 0, customPriceInDecimal: undefined, quantity: 3 },
    ])
    expect(options.body.cancelPage).toBe('list')
  })

  it('does not opt into retries for the cart checkout POST', () => {
    const { createNFTBookCartPurchase } = useBookPurchaseSessionAPI()
    createNFTBookCartPurchase([], {})
    const [, options] = mockFetch.mock.calls[0]!
    expect(options.retry).toBeUndefined()
  })
})

describe('fetchCartStatusById', () => {
  it('queries the cart status endpoint with the claim token', () => {
    const { fetchCartStatusById } = useBookPurchaseSessionAPI()
    fetchCartStatusById({ cartId: 'cart_1', token: 'tok_1' })
    const [url, options] = mockFetch.mock.calls[0]!
    expect(url).toBe('/likernft/book/purchase/cart/cart_1/status')
    expect(options).toEqual({ query: { token: 'tok_1' } })
  })
})

describe('claimCartById', () => {
  it('posts wallet and paymentId and opts into idempotent retries', () => {
    const { claimCartById } = useBookPurchaseSessionAPI()
    claimCartById({ cartId: 'cart_1', token: 'tok_1', paymentId: 'pay_1', wallet: '0xwallet' })
    const [url, options] = mockFetch.mock.calls[0]!
    expect(url).toBe('/likernft/book/purchase/cart/cart_1/claim')
    expect(options.method).toBe('POST')
    expect(options.retry).toBe(API_MAX_RETRIES)
    expect(options.query).toEqual({ token: 'tok_1' })
    expect(options.body).toEqual({ wallet: '0xwallet', paymentId: 'pay_1' })
  })
})

describe('sendCollectorMessage', () => {
  it('posts the message with the claim token as query token', async () => {
    const { sendCollectorMessage } = useBookPurchaseSessionAPI()
    await sendCollectorMessage({
      nftClassId: '0xabc',
      paymentId: 'pay_1',
      message: 'hi',
      wallet: '0xwallet',
      claimToken: 'tok_1',
    })
    const [url, options] = mockFetch.mock.calls[0]!
    expect(url).toBe('/likernft/book/purchase/class/0xabc/message/pay_1')
    expect(options.method).toBe('POST')
    expect(options.query).toEqual({ token: 'tok_1' })
    expect(options.body).toEqual({ message: 'hi', wallet: '0xwallet' })
  })
})
