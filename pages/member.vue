<template>
  <PricingPageContent
    v-model="selectedPlan"
    class="min-h-screen"
    :is-processing-subscription="checkout.isProcessingSubscription.value"
    :trial-period-days="trialPeriodDays"
    :must-collect-payment-method="mustCollectPaymentMethod"
    utm-campaign="pricing_page"
    utm-source="website"
    utm-medium="web"
    :coupon="coupon"
    @open="handleOpen"
    @subscribe="handleSubscribe"
  >
    <template #header-action>
      <UButton
        class="absolute z-10 top-2 phone:top-4 left-2 phone:left-4 text-white cursor-pointer"
        icon="i-material-symbols-arrow-back"
        :to="localeRoute({ name: 'store' })"
        variant="ghost"
        color="neutral"
        size="md"
      />
    </template>

    <template
      v-if="activeAffiliate"
      #affiliate-promo
    >
      <AffiliateAlert class="mt-6" />

      <div
        v-if="isAffiliateGiftRedeemable"
        class="mt-4 p-4 rounded-xl bg-elevated text-center"
      >
        <p
          class="text-sm font-medium text-toned mb-3"
          v-text="$t('pricing_page_affiliate_gift_label')"
        />
        <div class="flex items-center justify-center gap-3">
          <BookCover
            class="w-12 shrink-0"
            :src="giftBookCoverSrc"
            :alt="activeAffiliate.giftBookName || $t('pricing_page_affiliate_gift_label')"
            has-shadow
          />
          <div class="text-left">
            <p
              v-if="activeAffiliate.giftBookName"
              class="text-sm font-bold text-highlighted"
              v-text="activeAffiliate.giftBookName"
            />
            <p
              v-if="affiliateVoiceNames"
              class="text-xs text-muted"
              v-text="$t('pricing_page_affiliate_voice_label', { name: affiliateVoiceNames })"
            />
          </div>
        </div>
      </div>
    </template>

    <template
      v-if="!hasLoggedIn"
      #pricing-mobile
    >
      <div class="flex flex-col items-center gap-3">
        <span
          class="text-sm text-muted"
          v-text="$t('pricing_page_login_cta_description')"
        />
        <UButton
          :label="$t('pricing_page_login_cta_button')"
          icon="i-material-symbols-login-rounded"
          size="xl"
          block
          :loading="accountStore.isLoggingIn"
          :ui="{ base: 'py-2 laptop:py-3 cursor-pointer', label: 'font-bold' }"
          @click="handleRegisterClick"
        />
      </div>
    </template>
  </PricingPageContent>
</template>

<script setup lang="ts">
import type { ResolvableArray, ResolvableLink } from '@unhead/vue'

import type { AffiliatePublicConfig } from '~/shared/types/affiliate'
import { normalizeLikerId } from '~/shared/utils/liker-id'

import { DEFAULT_TRIAL_PERIOD_DAYS } from '~/constants/pricing'

import backdrop from '~/assets/images/paywall/bg-bookstore.jpg'

definePageMeta({ layout: false })

const localeRoute = useLocaleRoute()
const getRouteQuery = useRouteQuery()
const { yearlyPrice, monthlyPrice, currency } = useSubscription()
const checkout = useSubscriptionCheckout()
const { t: $t } = useI18n()
const config = useRuntimeConfig()
const baseURL = config.public.baseURL

const { isApp } = useAppDetection()
const { loggedIn: hasLoggedIn } = useUserSession()
const accountStore = useAccountStore()

const initialPlan: SubscriptionPlan = getRouteQuery('plan') === 'monthly' ? 'monthly' : 'yearly'
const selectedPlan = ref<SubscriptionPlan>(initialPlan)

const { memberProgramData } = useMemberProgramStructuredData()

const affiliateInfo = ref<AffiliatePublicConfig | null>(null)
const activeAffiliate = computed(() =>
  affiliateInfo.value?.active ? affiliateInfo.value : null,
)
const affiliateLikerId = computed(() => {
  const from = getRouteQuery('from')
  return from ? normalizeLikerId(from) : undefined
})
const affiliateVoiceNames = computed(() => {
  const voices = activeAffiliate.value?.customVoices
  if (!voices?.length) return undefined
  return voices.map(v => v.name).join($t('text_separator_comma'))
})

const { getResizedNormalizedImageURL } = useImageResize()
const giftBookCoverSrc = computed(() => {
  const src = activeAffiliate.value?.giftBookCover
  return src ? getResizedNormalizedImageURL(src, { size: 300 }) : ''
})

async function fetchAffiliateInfo() {
  if (!affiliateLikerId.value) {
    affiliateInfo.value = null
    return
  }
  try {
    affiliateInfo.value = await $fetch<AffiliatePublicConfig>(`/api/affiliate/${encodeURIComponent(affiliateLikerId.value)}`)
  }
  catch { /* ignore */ }
}

watchImmediate(affiliateLikerId, () => {
  fetchAffiliateInfo()
})
const productGroup = 'plus'
const monthlyProductId = 'plus-monthly'

const structuredData = computed(() => {
  return {
    '@context': 'https://schema.org',
    '@type': ['Product', 'MemberProgram'],
    'name': memberProgramData.value.name,
    'brand': {
      '@context': 'https://schema.org',
      '@type': 'Brand',
      'name': '3ook.com',
      'url': baseURL,
    },
    'description': memberProgramData.value.description,
    'url': canonicalURL.value,
    'image': `${baseURL}/images/og/plus.jpg`,
    'productID': productGroup,
    // MemberProgram fields
    'hasTiers': memberProgramData.value.hasTiers,
    // Product offers
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
const canonicalURL = computed(() => `${baseURL}/member`)

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
  link: computed(() => {
    const hasCampaignId = !!(getRouteQuery('utm_term') || getRouteQuery('utm_campaign'))
    const links: ResolvableArray<ResolvableLink> = [
      { rel: 'canonical', href: canonicalURL.value },
    ]
    if (hasCampaignId) {
      links.push({
        rel: 'preload',
        as: 'image',
        href: backdrop,
        key: 'preload-paywall-bookstore-backdrop',
      })
    }
    return links
  }),
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
    case '14d': return 14
    case '30d': return 30
    default:
      if (activeAffiliate.value?.giftOnTrial === false) return 0
      if (coupon.value) return 0
      return DEFAULT_TRIAL_PERIOD_DAYS
  }
})

const isAffiliateGiftRedeemable = computed(() => {
  const info = activeAffiliate.value
  if (!info?.giftClassId) return false
  if (selectedPlan.value !== 'yearly') return false
  if (info.giftOnTrial === false && trialPeriodDays.value !== 0) return false
  return true
})

const coupon = computed(() => getRouteQuery('coupon') as string | undefined)

const mustCollectPaymentMethod = computed(() => {
  const value = getRouteQuery('collect_payment_method')
  if (value === '0') return false
  if (value === '1') return true
  return undefined
})

function handleOpen() {
  useLogEvent('view_item', {
    currency: currency.value,
    value: selectedPlan.value === 'yearly' ? yearlyPrice.value : monthlyPrice.value,
    items: [{
      id: `plus-${selectedPlan.value}`,
      name: `Plus (${selectedPlan.value})`,
      price: selectedPlan.value === 'yearly' ? yearlyPrice.value : monthlyPrice.value,
      currency: currency.value,
      quantity: 1,
    }],
  })
}

async function handleRegisterClick() {
  useLogEvent('pricing_page_register_click')
  await accountStore.login()
}

async function handleSubscribe(payload: {
  trialPeriodDays?: number
  mustCollectPaymentMethod?: boolean
  plan: SubscriptionPlan
  utmCampaign?: string
  utmMedium?: string
  utmSource?: string
}) {
  await checkout.startSubscription({
    ...payload,
    coupon: coupon.value,
  })
}

onMounted(async () => {
  if (isApp.value) {
    await navigateTo(localeRoute({ name: 'store' }))
    return
  }
  await checkout.redirectIfSubscribed()
})
</script>
