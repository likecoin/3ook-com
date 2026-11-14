import { describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import useCurrency from '~/composables/use-currency'

const { mockDisplayCurrency, mockUser } = vi.hoisted(() => ({
  mockDisplayCurrency: { value: 'usd' as 'usd' | 'hkd' | 'twd' },
  mockUser: { value: null as Record<string, unknown> | null },
}))

mockNuxtImport('useI18n', () => () => ({ t: (key: string) => key }))
mockNuxtImport('usePaymentCurrency', () => () => ({ displayCurrency: mockDisplayCurrency }))
mockNuxtImport('useUserSession', () => () => ({
  user: mockUser,
  loggedIn: computed(() => !!mockUser.value),
}))

const MERCH = {
  price: 249.99,
  priceInDecimalByCurrency: { hkd: 199800 },
  plusPrice: 214.99,
  plusPriceInDecimalByCurrency: { hkd: 169800 },
  isNonNFT: true,
}

describe('useCurrency', () => {
  it('formats USD prices with two fraction digits', () => {
    mockDisplayCurrency.value = 'usd'
    const { formatPrice } = useCurrency()
    expect(formatPrice(0.99)).toBe('US$0.99')
    expect(formatPrice(99.99)).toBe('US$99.99')
  })

  it('shows the free label for zero prices', () => {
    mockDisplayCurrency.value = 'usd'
    const { formatPrice } = useCurrency()
    expect(formatPrice(0)).toBe('price_free')
  })

  it('converts via the tier ladder and formats without decimals for HKD/TWD', () => {
    mockDisplayCurrency.value = 'hkd'
    expect(useCurrency().formatPrice(0.99)).toBe('HK$8')
    mockDisplayCurrency.value = 'twd'
    expect(useCurrency().formatPrice(0.99)).toBe('NT$30')
  })

  it('prefers a per-book minor-unit override over the ladder', () => {
    mockDisplayCurrency.value = 'hkd'
    const { formatPrice, convertPrice } = useCurrency()
    expect(convertPrice(0.99, { hkd: 1200 })).toBe(12)
    expect(formatPrice(0.99, { hkd: 1200 })).toBe('HK$12')
  })

  it('ignores overrides when displaying USD', () => {
    mockDisplayCurrency.value = 'usd'
    const { convertPrice } = useCurrency()
    expect(convertPrice(0.99, { hkd: 1200 })).toBe(0.99)
  })

  it('applies the discount rate to the resolved price', () => {
    mockDisplayCurrency.value = 'usd'
    const { formatDiscountedPrice } = useCurrency()
    expect(formatDiscountedPrice(10, 0.2)).toBe('US$8.00')
  })

  it('formats already-converted amounts with thousands separators', () => {
    mockDisplayCurrency.value = 'hkd'
    const { formatConvertedPrice } = useCurrency()
    expect(formatConvertedPrice(1234)).toBe('HK$1,234')
  })

  it('formats a non-NFT Plus price for anyone', () => {
    mockDisplayCurrency.value = 'hkd'
    mockUser.value = null
    const { formatPlusPrice } = useCurrency()
    expect(formatPlusPrice(MERCH, 0.2)).toBe('HK$1,698')
    expect(formatPlusPrice({ ...MERCH, plusPrice: undefined }, 0.2)).toBeNull()
  })

  it('gives the non-NFT member price only to yearly Plus members', () => {
    mockDisplayCurrency.value = 'hkd'
    mockUser.value = { isLikerPlus: true, likerPlusPeriod: 'month' }
    expect(useCurrency().formatMemberPrice(MERCH, 0.2)).toBeNull()
    mockUser.value = { isLikerPlus: true, likerPlusPeriod: 'year' }
    expect(useCurrency().formatMemberPrice(MERCH, 0.2)).toBe('HK$1,698')
  })
})
