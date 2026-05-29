<template>
  <PricingPageContent
    v-model="selectedPlan"
    v-bind="iapOverrides"
    class="min-h-screen"
    :is-processing-subscription="checkout.isProcessingSubscription.value"
    :trial-period-days="trialPeriodDays"
    :must-collect-payment-method="mustCollectPaymentMethod"
    utm-campaign="pricing_page"
    utm-source="website"
    utm-medium="web"
    :coupon="coupon"
    :affiliate-voices="affiliateSampleVoices"
    :affiliate-liker-id="affiliateLikerId"
    :prepended-features="affiliateContent?.prependedFeatures"
    :tts-exclusive-badge-text="affiliateContent?.ttsExclusiveBadgeText"
    :yearly-badge-text="iapOverrides.yearlyBadgeText ?? affiliateContent?.yearlyBadgeText"
    :monthly-badge-text="affiliateContent?.monthlyBadgeText"
    :promo-pricing="promoPricing"
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
      #affiliate-alert
    >
      <AffiliateAlert class="mb-6" />
    </template>

    <template
      v-if="activeAffiliate && isAffiliateGiftRedeemable"
      #affiliate-promo
    >
      <UCard
        class="mt-4"
        variant="subtle"
        :ui="{ body: 'px-0 sm:px-0' }"
      >
        <h3
          id="affiliate-gift-picker-label"
          class="px-4 sm:px-6 text-sm font-medium text-toned mb-3"
          v-text="$t(giftBooks.length > 1
            ? 'pricing_page_affiliate_gift_select_label'
            : 'pricing_page_affiliate_gift_label')"
        />

        <div class="relative">
          <UButton
            v-if="isGiftsListScrollable && hasMoreGiftsLeft"
            class="absolute left-1 top-1/2 -translate-y-1/2 z-10 cursor-pointer rounded-full bg-default/90 shadow-md hover:bg-default"
            icon="i-material-symbols-chevron-left-rounded"
            color="neutral"
            variant="ghost"
            size="sm"
            square
            :aria-label="$t('pricing_page_affiliate_gift_scroll_prev')"
            @click="scrollGiftsList(-1)"
          />

          <div
            ref="giftsListEl"
            class="flex items-end gap-3 px-4 sm:px-6 pt-6 pb-12 scroll-px-4 sm:scroll-px-6 scrollbar-none"
            :class="isGiftsListScrollable
              ? 'overflow-x-auto snap-x'
              : 'justify-center'"
            role="radiogroup"
            aria-labelledby="affiliate-gift-picker-label"
          >
            <button
              v-for="(book, index) in giftBooks"
              :key="book.classId"
              type="button"
              role="radio"
              class="relative block shrink-0 snap-start rounded-lg transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              :class="book.classId === selectedGiftClassId
                ? 'ring-2 ring-primary scale-105'
                : 'opacity-50 hover:opacity-90'"
              :aria-checked="book.classId === selectedGiftClassId"
              :tabindex="(selectedGiftClassId ? book.classId === selectedGiftClassId : index === 0) ? 0 : -1"
              @click="selectedGiftClassId = book.classId"
            >
              <BookCover
                class="w-16 aspect-auto"
                :src="getGiftBookCover(book.cover)"
                :alt="book.name || `${$t('pricing_page_affiliate_gift_label')} ${index + 1}`"
                has-shadow
              />
              <span
                v-if="book.classId === selectedGiftClassId"
                class="absolute top-0 right-0 flex items-center justify-center w-5 h-5 rounded-full bg-primary text-inverted translate-x-1/2 -translate-y-1/2"
              >
                <UIcon
                  name="i-material-symbols-check-rounded"
                  class="w-3.5 h-3.5 text-theme-cyan"
                />
              </span>
            </button>
          </div>

          <UButton
            v-if="isGiftsListScrollable && hasMoreGiftsRight"
            class="absolute right-1 top-1/2 -translate-y-1/2 z-10 cursor-pointer rounded-full bg-default/90 shadow-md hover:bg-default"
            icon="i-material-symbols-chevron-right-rounded"
            color="neutral"
            variant="ghost"
            size="sm"
            square
            :aria-label="$t('pricing_page_affiliate_gift_scroll_next')"
            @click="scrollGiftsList(1)"
          />
        </div>

        <div class="-mt-3 px-4 sm:px-6 text-center">
          <p
            v-if="selectedGiftBook?.name"
            class="text-sm font-bold text-highlighted"
            v-text="selectedGiftBook.name"
          />
          <p
            v-if="affiliateVoiceNames"
            class="text-xs text-muted"
            v-text="$t('pricing_page_affiliate_voice_label', { name: affiliateVoiceNames })"
          />
        </div>
      </UCard>
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

import type { PricingPagePromoPricing } from '~/components/PricingPageContent.props'
import type { AffiliatePublicConfig } from '~~/shared/types/affiliate'
import { getAffiliatePricingPageContent } from '~/composables/use-pricing-page-campaign'
import { normalizeLikerId } from '~~/shared/utils/liker-id'

import { DEFAULT_TRIAL_PERIOD_DAYS } from '~~/shared/constants/pricing'

import backdrop from '~/assets/images/paywall/bg-bookstore.jpg'

definePageMeta({ layout: false })

const localeRoute = useLocaleRoute()
const getRouteQuery = useRouteQuery()
const { yearlyPrice, monthlyPrice, currency } = useSubscription()
const checkout = useSubscriptionCheckout()
const { t: $t } = useI18n()
const config = useRuntimeConfig()
const baseURL = config.public.baseURL

const { canStartSubscribeFlow } = useNativeIAP()
const { isIAPSupported, getIAPOverrides } = useIAPPricingOverrides()
const { loggedIn: hasLoggedIn } = useUserSession()
const accountStore = useAccountStore()
const { displayCurrency } = usePaymentCurrency()

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
const affiliateSampleVoices = computed(() => activeAffiliate.value?.customVoices ?? [])

const { getResizedNormalizedImageURL } = useImageResize()
const giftBooks = computed(() => activeAffiliate.value?.giftBooks ?? [])
const selectedGiftClassId = ref<string | undefined>(undefined)
// Default to the first book and keep the pick valid as the list changes
// (e.g. when the affiliate link / config loads asynchronously).
watch(giftBooks, (books) => {
  if (!books.some(b => b.classId === selectedGiftClassId.value)) {
    selectedGiftClassId.value = books[0]?.classId
  }
}, { immediate: true })
const selectedGiftBook = computed(() =>
  giftBooks.value.find(b => b.classId === selectedGiftClassId.value),
)
function getGiftBookCover(src?: string) {
  return src ? getResizedNormalizedImageURL(src, { size: 300 }) : ''
}

const isGiftsListScrollable = computed(() => giftBooks.value.length > 2)
const giftsListEl = useTemplateRef<HTMLElement>('giftsListEl')
const { arrivedState: giftsListArrivedState, measure: measureGiftsListScroll } = useScroll(giftsListEl)
const hasMoreGiftsLeft = computed(() => !giftsListArrivedState.left)
const hasMoreGiftsRight = computed(() => !giftsListArrivedState.right)

useResizeObserver(giftsListEl, () => measureGiftsListScroll())
watch(giftBooks, async () => {
  await nextTick()
  measureGiftsListScroll()
})

function scrollGiftsList(direction: -1 | 1) {
  const el = giftsListEl.value
  if (!el) return
  el.scrollBy({ left: el.clientWidth * 0.7 * direction, behavior: 'smooth' })
}

async function fetchAffiliateInfo() {
  if (!affiliateLikerId.value) {
    affiliateInfo.value = null
    return
  }
  try {
    affiliateInfo.value = await apiFetch<AffiliatePublicConfig>(`/affiliate/${encodeURIComponent(affiliateLikerId.value)}`)
  }
  catch { /* ignore */ }
}

watchImmediate(affiliateLikerId, () => {
  fetchAffiliateInfo()
})

const affiliateContent = computed(() => getAffiliatePricingPageContent(affiliateLikerId.value))

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

// On IAP the store is the source of truth for the trial — the web's route-
// query overrides and Stripe defaults don't apply because no Stripe trial
// will ensue regardless.
const iapOverrides = computed(() => getIAPOverrides(selectedPlan.value))
const trialPeriodDays = computed(() => {
  if (isIAPSupported.value) return iapOverrides.value.trialPeriodDays
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
  if (!info?.giftBooks?.length) return false
  if (selectedPlan.value !== 'yearly') return false
  if (info.giftOnTrial === false && trialPeriodDays.value !== 0) return false
  return true
})

const coupon = computed(() => getRouteQuery('coupon') as string | undefined)

const promoPricing = computed<PricingPagePromoPricing | undefined>(() => {
  if (!coupon.value) return undefined
  const effect = affiliateContent.value?.couponEffect
  if (!effect) return undefined

  if (effect.type === 'percent') {
    const factor = 1 - effect.value / 100
    return {
      yearly: { price: Math.max(0, Math.round(yearlyPrice.value * factor)) },
      monthly: { price: Math.max(0, Math.round(monthlyPrice.value * factor)) },
    }
  }

  const off = effect.amount[displayCurrency.value]
  if (typeof off !== 'number') return undefined
  return {
    yearly: { price: Math.max(0, yearlyPrice.value - off) },
    monthly: { price: Math.max(0, monthlyPrice.value - off) },
  }
})

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
    // Carry the subscriber's chosen gift book; the API validates it against
    // the affiliate's gift list and resolves the (free) price index itself.
    nftClassId: isAffiliateGiftRedeemable.value
      ? selectedGiftClassId.value
      : undefined,
  })
}

onMounted(async () => {
  if (!canStartSubscribeFlow.value) {
    await navigateTo(localeRoute({ name: 'store' }))
    return
  }
  await checkout.redirectIfSubscribed()
})
</script>
