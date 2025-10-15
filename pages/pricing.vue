<template>
  <AppHeader :is-connect-hidden="false" />
</template>

<script setup lang="ts">
const localeRoute = useLocaleRoute()
const getRouteQuery = useRouteQuery()
const subscription = useSubscription()
const { t: $t } = useI18n()
const config = useRuntimeConfig()
const baseURL = config.public.baseURL

const hasOpened = ref(false)
const {
  yearlyPrice,
  monthlyPrice,
  currency,
} = subscription

const productGroup = 'plus'
const monthlyProductId = 'plus-monthly'

const structuredData = computed(() => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    'name': $t('pricing_page_title'),
    'brand': {
      '@context': 'https://schema.org',
      '@type': 'Brand',
      'name': '3ook.com Plus',
      'url': canonicalURL.value,
    },
    'description': $t('pricing_page_subscription_description'),
    'url': canonicalURL.value,
    'image': `${baseURL}/images/og/plus.jpg`,
    'productID': productGroup,
    'offers': [
      {
        '@type': 'Offer',
        'price': yearlyPrice.value,
        'priceCurrency': currency.value,
        'availability': 'https://schema.org/InStock',
        'itemCondition': 'https://schema.org/NewCondition',
        'url': canonicalURL.value,
        'offeredBy': {
          '@type': 'Organization',
          'name': '3ook.com',
          'url': baseURL,
        },
        'description': $t('pricing_page_yearly'),
        'priceSpecification': {
          '@type': 'PriceSpecification',
          'price': yearlyPrice.value,
          'priceCurrency': currency.value,
          'billingIncrement': 1,
          'billingDuration': 'P1Y',
          'unitText': 'year',
        },
      },
      {
        '@type': 'Offer',
        'price': monthlyPrice.value,
        'priceCurrency': currency.value,
        'availability': 'https://schema.org/InStock',
        'itemCondition': 'https://schema.org/NewCondition',
        'url': canonicalURL.value,
        'offeredBy': {
          '@type': 'Organization',
          'name': '3ook.com',
          'url': baseURL,
        },
        'description': $t('pricing_page_monthly'),
        'priceSpecification': {
          '@type': 'PriceSpecification',
          'price': monthlyPrice.value,
          'priceCurrency': currency.value,
          'billingIncrement': 1,
          'billingDuration': 'P1M',
          'unitText': 'month',
        },
      },
    ],
  }
})

const pageTitle = computed(() => $t('pricing_page_title'))
const pageDescription = computed(() => $t('pricing_page_description'))
const canonicalURL = computed(() => `${baseURL}/pricing`)

useHead({
  title: pageTitle.value,
  meta: [
    { name: 'description', content: pageDescription.value },
    { property: 'og:title', content: pageTitle.value },
    { property: 'og:description', content: pageDescription.value },
    { property: 'og:image', content: `${baseURL}/images/og/plus.jpg` },
    { property: 'og:url', content: canonicalURL.value },
    { property: 'og:type', content: 'product' },
    { property: 'og:price:amount', content: monthlyPrice.value },
    { property: 'og:price:currency', content: currency.value },
    { property: 'product:price:amount', content: monthlyPrice.value },
    { property: 'product:price:currency', content: currency.value },
    { property: 'product:brand', content: '3ook.com Plus' },
    { property: 'product:availability', content: 'in stock' },
    { property: 'product:condition', content: 'new' },
    { property: 'product:catalog_id', content: monthlyProductId },
    { property: 'product:retailer_item_id', content: monthlyProductId },
    { property: 'product:item_group_id', content: productGroup },
    { property: 'product:category', content: 6028 }, // Media Viewing Software
  ],
  link: [
    { rel: 'canonical', href: canonicalURL.value },
  ],
  script: [
    { type: 'application/ld+json', innerHTML: JSON.stringify(structuredData.value) },
  ],
})

const trialPeriodDays = computed(() => {
  switch (getRouteQuery('trial')) {
    case '0':
    case '0d': return 0
    case '1d': return 1
    case '3d': return 3
    case '5d': return 5
    case '7d': return 7
    default: return 7
  }
})

const mustCollectPaymentMethod = computed(() => {
  const value = getRouteQuery('collect_payment_method')
  if (value === '0') return false
  if (value === '1') return true
  return undefined
})

onMounted(async () => {
  const isSubscribed = await subscription.redirectIfSubscribed()
  if (isSubscribed) return

  if (!hasOpened.value) {
    hasOpened.value = true
    await subscription.openPaywallModal({
      isFullscreen: true,
      isBackdropDismissible: false,
      hasTransition: false,
      trialPeriodDays: trialPeriodDays.value,
      mustCollectPaymentMethod: mustCollectPaymentMethod.value,
      utmCampaign: 'pricing_page',
      utmSource: 'website',
      utmMedium: 'web',
      coupon: getRouteQuery('coupon') as string | undefined,
    })
    navigateTo(localeRoute({ name: 'store' }))
  }
})
</script>
