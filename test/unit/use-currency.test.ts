import { describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import useCurrency from '~/composables/use-currency'

const { mockDisplayCurrency } = vi.hoisted(() => ({
  mockDisplayCurrency: { value: 'usd' as 'usd' | 'hkd' | 'twd' },
}))

mockNuxtImport('useI18n', () => () => ({ t: (key: string) => key }))
mockNuxtImport('usePaymentCurrency', () => () => ({ displayCurrency: mockDisplayCurrency }))

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
})
