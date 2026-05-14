import { USD_PRICE_TIER_LIST, HKD_PRICE_TIER_LIST, TWD_PRICE_TIER_LIST } from '~~/shared/constants/pricing'

export type PricingCurrency = 'hkd' | 'twd' | 'usd'

const MAX_USD = USD_PRICE_TIER_LIST[USD_PRICE_TIER_LIST.length - 1]!
const MAX_HKD = HKD_PRICE_TIER_LIST[HKD_PRICE_TIER_LIST.length - 1]!
const MAX_TWD = TWD_PRICE_TIER_LIST[TWD_PRICE_TIER_LIST.length - 1]!

export function convertUSDPriceToCurrency(price: number, currency: PricingCurrency): number {
  if (price <= 0) {
    return 0
  }
  switch (currency) {
    case 'hkd': {
      if (price > MAX_USD) {
        return Math.floor(price * (MAX_HKD / MAX_USD))
      }
      const index = Math.min(Math.round(price), HKD_PRICE_TIER_LIST.length - 1)
      return HKD_PRICE_TIER_LIST[index] ?? 0
    }
    case 'twd': {
      if (price > MAX_USD) {
        return Math.floor(price * (MAX_TWD / MAX_USD))
      }
      const index = Math.min(Math.round(price), TWD_PRICE_TIER_LIST.length - 1)
      return TWD_PRICE_TIER_LIST[index] ?? 0
    }
    case 'usd':
    default:
      return price
  }
}

export function convertCurrencyToUSDPrice(price: number, currency: PricingCurrency): number {
  switch (currency) {
    case 'hkd': {
      if (price > MAX_HKD) {
        return Math.floor(price * (MAX_USD / MAX_HKD))
      }
      const index = HKD_PRICE_TIER_LIST.findIndex(tierPrice => tierPrice >= price)
      return index >= 0 ? (USD_PRICE_TIER_LIST[index] ?? MAX_USD) : MAX_USD
    }
    case 'twd': {
      if (price > MAX_TWD) {
        return Math.floor(price * (MAX_USD / MAX_TWD))
      }
      const index = TWD_PRICE_TIER_LIST.findIndex(tierPrice => tierPrice >= price)
      return index >= 0 ? (USD_PRICE_TIER_LIST[index] ?? MAX_USD) : MAX_USD
    }
    case 'usd':
    default:
      return price
  }
}
