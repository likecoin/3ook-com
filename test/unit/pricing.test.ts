import { describe, expect, it } from 'vitest'
import { convertUSDPriceToCurrency, convertCurrencyToUSDPrice } from '~/utils/pricing'
import { USD_PRICE_TIER_LIST, HKD_PRICE_TIER_LIST, TWD_PRICE_TIER_LIST } from '~~/shared/constants/pricing'

describe('price tier lists', () => {
  it('are index-aligned so ladder conversion is well-defined', () => {
    expect(HKD_PRICE_TIER_LIST.length).toBe(USD_PRICE_TIER_LIST.length)
    expect(TWD_PRICE_TIER_LIST.length).toBe(USD_PRICE_TIER_LIST.length)
  })

  it('are strictly increasing so reverse lookup snaps to a unique tier', () => {
    for (const list of [USD_PRICE_TIER_LIST, HKD_PRICE_TIER_LIST, TWD_PRICE_TIER_LIST]) {
      for (let i = 1; i < list.length; i += 1) {
        expect(list[i]!).toBeGreaterThan(list[i - 1]!)
      }
    }
  })
})

describe('convertUSDPriceToCurrency', () => {
  it('returns 0 for zero or negative prices', () => {
    expect(convertUSDPriceToCurrency(0, 'hkd')).toBe(0)
    expect(convertUSDPriceToCurrency(-1, 'twd')).toBe(0)
    expect(convertUSDPriceToCurrency(0, 'usd')).toBe(0)
  })

  it('passes USD through unchanged', () => {
    expect(convertUSDPriceToCurrency(0.99, 'usd')).toBe(0.99)
    expect(convertUSDPriceToCurrency(123.45, 'usd')).toBe(123.45)
  })

  it('maps USD tier prices to the same tier index in HKD/TWD', () => {
    expect(convertUSDPriceToCurrency(0.99, 'hkd')).toBe(8)
    expect(convertUSDPriceToCurrency(1.99, 'hkd')).toBe(16)
    expect(convertUSDPriceToCurrency(4.99, 'hkd')).toBe(40)
    expect(convertUSDPriceToCurrency(99.99, 'hkd')).toBe(780)
    expect(convertUSDPriceToCurrency(0.99, 'twd')).toBe(30)
    expect(convertUSDPriceToCurrency(99.99, 'twd')).toBe(3000)
  })

  it('rounds off-tier prices to the nearest tier index', () => {
    expect(convertUSDPriceToCurrency(1.49, 'hkd')).toBe(8)
    expect(convertUSDPriceToCurrency(1.5, 'hkd')).toBe(16)
  })

  it('scales linearly (floored) above the top USD tier', () => {
    expect(convertUSDPriceToCurrency(1000, 'hkd')).toBe(Math.floor(1000 * 780 / 99.99))
    expect(convertUSDPriceToCurrency(1000, 'twd')).toBe(Math.floor(1000 * 3000 / 99.99))
  })
})

describe('convertCurrencyToUSDPrice', () => {
  it('passes USD through unchanged', () => {
    expect(convertCurrencyToUSDPrice(0.99, 'usd')).toBe(0.99)
  })

  it('maps tier prices back to the same tier index in USD', () => {
    expect(convertCurrencyToUSDPrice(0, 'hkd')).toBe(0)
    expect(convertCurrencyToUSDPrice(8, 'hkd')).toBe(0.99)
    expect(convertCurrencyToUSDPrice(780, 'hkd')).toBe(99.99)
    expect(convertCurrencyToUSDPrice(30, 'twd')).toBe(0.99)
    expect(convertCurrencyToUSDPrice(3000, 'twd')).toBe(99.99)
  })

  it('snaps off-tier prices up to the next tier', () => {
    // First HKD tier >= 9 is 16 (index 2) -> USD tier 1.99
    expect(convertCurrencyToUSDPrice(9, 'hkd')).toBe(1.99)
    expect(convertCurrencyToUSDPrice(31, 'twd')).toBe(1.99)
  })

  it('scales linearly (floored) above the top local tier', () => {
    expect(convertCurrencyToUSDPrice(7800, 'hkd')).toBe(Math.floor(7800 * 99.99 / 780))
    expect(convertCurrencyToUSDPrice(30000, 'twd')).toBe(Math.floor(30000 * 99.99 / 3000))
  })

  it('round-trips every USD tier price through HKD and TWD', () => {
    for (const usdPrice of USD_PRICE_TIER_LIST) {
      if (usdPrice <= 0) continue
      for (const currency of ['hkd', 'twd'] as const) {
        const localPrice = convertUSDPriceToCurrency(usdPrice, currency)
        expect(convertCurrencyToUSDPrice(localPrice, currency)).toBe(usdPrice)
      }
    }
  })
})
