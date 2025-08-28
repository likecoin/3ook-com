export default function () {
  const { t: $t } = useI18n()

  function getCurrencySymbol(price: number) {
    return price > 0 ? 'US' : ''
  }

  function formatPrice(price: number) {
    if (price > 0) {
      return `$${new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(price)}`
    }
    return $t('price_free')
  }

  return {
    getCurrencySymbol,
    formatPrice,
  }
}
