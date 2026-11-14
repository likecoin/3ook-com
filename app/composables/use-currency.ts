import { convertUSDPriceToCurrency, type PricingCurrency } from '~/utils/pricing'

// The price fields formatMemberPrice needs, in the shape both a pricing item and
// a grid card's resolved price already have.
interface MemberPricedItem {
  price: number
  priceInDecimalByCurrency?: BookPriceInDecimalByCurrency
  plusPrice?: number
  plusPriceInDecimalByCurrency?: BookPriceInDecimalByCurrency
  isNonNFT?: boolean
}

const CURRENCY_PREFIXES: Record<PricingCurrency, string> = {
  hkd: 'HK$',
  twd: 'NT$',
  usd: 'US$',
}

export default function () {
  const { t: $t } = useI18n()
  const { displayCurrency } = usePaymentCurrency()
  const { user, loggedIn: hasLoggedIn } = useUserSession()
  const isPlusPriceEligible = computed(() => hasLoggedIn.value && getIsEligibleForPlusPrice(user.value))

  function getCurrencyPrefix(currency: PricingCurrency) {
    return CURRENCY_PREFIXES[currency] ?? 'US$'
  }

  function getFractionDigits(currency: PricingCurrency): number {
    return currency === 'usd' ? 2 : 0
  }

  function formatCurrencyAmount(amount: number, displayCurrency: PricingCurrency): string {
    if (amount <= 0) {
      return $t('price_free')
    }

    const prefix = getCurrencyPrefix(displayCurrency)
    const fractionDigits = getFractionDigits(displayCurrency)

    return `${prefix}${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount)}`
  }

  // A per-book override (minor units, e.g. cents) takes precedence over the
  // index-based ladder conversion. USD always uses the ladder/stored price.
  function resolvePrice(
    usdPrice: number,
    priceInDecimalByCurrency?: BookPriceInDecimalByCurrency,
  ): number {
    const currency = displayCurrency.value
    if (currency !== 'usd') {
      const override = priceInDecimalByCurrency?.[currency]
      if (typeof override === 'number' && override > 0) {
        return override / 100
      }
    }
    return convertUSDPriceToCurrency(usdPrice, currency)
  }

  function formatPrice(price: number, priceInDecimalByCurrency?: BookPriceInDecimalByCurrency) {
    return formatCurrencyAmount(resolvePrice(price, priceInDecimalByCurrency), displayCurrency.value)
  }

  function formatDiscountedPrice(
    usdPrice: number,
    discountRate: number,
    priceInDecimalByCurrency?: BookPriceInDecimalByCurrency,
  ): string {
    const discountedPrice = resolvePrice(usdPrice, priceInDecimalByCurrency) * (1 - discountRate)
    return formatCurrencyAmount(discountedPrice, displayCurrency.value)
  }

  // The price a Plus member pays, whether or not this user qualifies for it:
  // books take the flat discount, non-NFT products only their explicit member price.
  function formatPlusPrice(
    { price, priceInDecimalByCurrency, plusPrice, plusPriceInDecimalByCurrency, isNonNFT }: MemberPricedItem,
    discountRate: number,
  ): string | null {
    if (isNonNFT) {
      if (plusPrice === undefined) return null
      return formatCurrencyAmount(resolvePrice(plusPrice, plusPriceInDecimalByCurrency), displayCurrency.value)
    }
    return formatDiscountedPrice(price, discountRate, priceInDecimalByCurrency)
  }

  // Mirrors checkout: a non-NFT member price goes only to eligible members,
  // so it never stacks with the book discount. Callers gate books on Plus themselves.
  function formatMemberPrice(item: MemberPricedItem, discountRate: number): string | null {
    if (item.isNonNFT && !isPlusPriceEligible.value) return null
    return formatPlusPrice(item, discountRate)
  }

  function convertPrice(
    usdPrice: number,
    priceInDecimalByCurrency?: BookPriceInDecimalByCurrency,
  ): number {
    return resolvePrice(usdPrice, priceInDecimalByCurrency)
  }

  // Formats an amount already expressed in the display currency (e.g. a sum of
  // per-line-item resolved prices), without re-applying ladder conversion.
  function formatConvertedPrice(amount: number): string {
    return formatCurrencyAmount(amount, displayCurrency.value)
  }

  return {
    formatPrice,
    formatDiscountedPrice,
    formatPlusPrice,
    formatMemberPrice,
    convertPrice,
    formatConvertedPrice,
  }
}
