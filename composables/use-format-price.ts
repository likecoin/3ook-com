export function useFormatPrice() {
  const { t: $t } = useI18n()
  return (price: number) => {
    if (price > 0) {
      return `$${new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(price)}`
    }
    return $t('price_free')
  }
}
