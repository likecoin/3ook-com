export default function () {
  const { t: $t } = useI18n()

  function getCurrencySymbol(price: number) {
    return price > 0 ? 'US' : ''
  }

  function formatPrice(price: number) {
    if (price > 0) {
      return `$${new Intl.NumberFormat('en-US').format(price)}`
    }
    return $t('price_free')
  }

  return {
    getCurrencySymbol,
    formatPrice,
  }
}
