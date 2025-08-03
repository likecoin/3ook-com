<template>
  <AppHeader :is-connect-hidden="false" />
</template>

<script setup lang="ts">
const router = useRouter()
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

const structuredData = computed(() => {
  const pageURL = `${baseURL}/pricing`
  const currentDate = new Date()
  const oneYearLater = new Date(currentDate)
  oneYearLater.setFullYear(currentDate.getFullYear() + 1)
  const priceValidUntil = oneYearLater.toISOString().split('T')[0]

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    'name': $t('pricing_page_title'),
    'description': $t('pricing_page_subscription_description'),
    'url': pageURL,
    'image': `${baseURL}/images/og/plus.jpg`,
    'offers': [
      {
        '@type': 'Offer',
        'price': yearlyPrice.value,
        'priceCurrency': currency.value,
        'availability': 'https://schema.org/InStock',
        'priceValidUntil': priceValidUntil,
        'url': pageURL,
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
        'priceValidUntil': priceValidUntil,
        'url': pageURL,
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
  ],
  link: [
    { rel: 'canonical', href: canonicalURL.value },
  ],
  script: [
    { type: 'application/ld+json', innerHTML: JSON.stringify(structuredData.value) },
  ],
})

onMounted(async () => {
  const isSubscribed = await subscription.redirectIfSubscribed()
  if (isSubscribed) return

  if (!hasOpened.value) {
    hasOpened.value = true
    await subscription.openPaywallModal({
      isFullscreen: true,
      isBackdropDismissible: false,
      hasFreeTrial: getRouteQuery('trial') !== '0',
      utmCampaign: 'pricing_page',
      utmSource: 'website',
      utmMedium: 'web',
    })
    router.back()
  }
})
</script>
