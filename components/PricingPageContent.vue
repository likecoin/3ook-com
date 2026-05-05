<template>
  <div
    :class="[
      'flex',
      'flex-col',
      'laptop:flex-row',
      'items-stretch',
      'w-full',
    ]"
  >
    <div class="relative">
      <slot name="header-action" />
    </div>

    <template v-if="isDesktopScreen && isShowTTSSamples">
      <aside class="relative flex justify-end w-full bg-theme-black min-h-max overflow-hidden">
        <PaywallBookstoreBackdrop class="!opacity-20" />
        <div class="flex flex-col justify-center items-center relative w-full max-w-[512px] min-h-max">
          <PlusBlocktrendBundleBanner
            v-if="isBlocktrendCampaign"
            class="w-full shrink-0"
            :is-force-landscape="true"
            :is-dark-background="true"
          />
          <PricingPageCampaignMedia
            v-else-if="campaignContent"
            class="w-full shrink-0"
            :campaign-id="campaignContent.id"
            orientation="landscape"
          />
          <div :class="['p-12', { 'pt-30': !campaignContent }]">
            <div
              v-if="!campaignContent"
              class="relative flex items-center mb-12"
            >
              <NuxtLink :to="localeRoute({ name: 'store', query: { ll_medium: 'plus-logo', ll_source: 'plus-modal' } })">
                <AppLogo
                  height="48"
                  :is-icon="false"
                  :is-padded="false"
                />
              </NuxtLink>
            </div>

            <PricingPageIntroSection
              class="relative w-full max-w-[420px]"
              :is-dark-background="true"
              :title="campaignContent?.title"
              :description="campaignContent?.description"
            />
          </div>
        </div>
      </aside>
    </template>
    <template v-else>
      <PlusBlocktrendBundleBanner
        v-if="isBlocktrendCampaign"
        class="max-laptop:shrink-0 w-full min-h-max"
      />
      <aside
        v-else-if="campaignContent"
        class="relative max-laptop:shrink-0 w-full min-h-max bg-theme-black"
      >
        <ClientOnly>
          <div
            v-if="isDesktopScreen"
            class="absolute inset-0 overflow-hidden"
          >
            <PricingPageCampaignMedia
              class="absolute inset-x-0 w-full top-1/2 -translate-y-1/2"
              :campaign-id="campaignContent.id"
              orientation="portrait"
            />
          </div>
          <PricingPageCampaignMedia
            v-else
            class="w-full"
            :campaign-id="campaignContent.id"
            orientation="landscape"
          />
        </ClientOnly>
      </aside>
      <aside
        v-else
        class="relative flex justify-center items-center max-laptop:shrink-0 w-full p-12 bg-theme-black overflow-hidden"
      >
        <PaywallBookstoreBackdrop />
        <NuxtLink
          class="relative flex justify-center items-center"
          :to="localeRoute({ name: 'store', query: { ll_medium: 'plus-logo', ll_source: 'plus-modal' } })"
        >
          <AppLogo
            class="max-w-2/3"
            height="128"
            :is-icon="false"
            :is-padded="false"
          />
        </NuxtLink>
      </aside>
    </template>

    <div class="flex w-full items-center min-h-max">
      <div
        :class="[
          'w-full',
          'max-w-[512px]',
          'max-laptop:mx-auto',
          'p-5 laptop:p-12',
          'pt-12',
          // NOTE: Prevent content from being covered by the Intercom banner at the top
          { 'laptop:pt-16': !campaignContent },
        ]"
      >
        <PricingPageIntroSection
          v-if="!(isShowTTSSamples && isDesktopScreen)"
          class="mb-4 laptop:mb-6"
          :title="campaignContent?.title"
          :description="campaignContent?.description"
          :is-compact="isShowTTSSamples || !!$slots['affiliate-promo']"
        />
        <TTSSamplesSection v-if="isShowTTSSamples" />

        <slot name="affiliate-promo" />

        <div class="flex flex-col w-full mt-6 laptop:mt-8">
          <div
            v-if="$slots['pricing-mobile']"
            class="contents laptop:hidden"
          >
            <slot name="pricing-mobile" />
          </div>

          <div :class="$slots['pricing-mobile'] ? 'hidden laptop:contents' : undefined">
            <slot name="pricing">
              <div
                v-if="!isApp"
                :class="{ 'bg-theme-cyan p-3 rounded-xl': isPaidTrial }"
              >
                <header
                  v-if="isPaidTrial"
                  class="hidden laptop:flex items-center gap-2 mb-3 text-theme-black"
                >
                  <UIcon
                    name="i-material-symbols-celebration-outline-rounded"
                    :size="24"
                  />
                  <span
                    class="font-bold"
                    v-text="$t('subscribe_plus_alert_limited_offer')"
                  />
                </header>

                <PricingPlanSelect
                  v-model="selectedPlan"
                  :trial-period-days="trialPeriodDays"
                >
                  <template #header-left>
                    <div
                      v-if="isPaidTrial"
                      class="flex items-center gap-1.5 text-theme-black"
                    >
                      <UIcon
                        name="i-material-symbols-celebration-outline-rounded"
                        :size="20"
                      />
                      <span
                        class="text-sm font-bold"
                        v-text="$t('subscribe_plus_alert_limited_offer')"
                      />
                    </div>
                  </template>
                </PricingPlanSelect>

                <UButton
                  class="mt-4"
                  :label="subscribeButtonLabel"
                  block
                  size="xl"
                  :loading="props.isProcessingSubscription"
                  :ui="{ base: 'py-2 laptop:py-3 cursor-pointer', label: 'font-bold' }"
                  @click="handleSubscribeButtonClick"
                />
              </div>

              <UButton
                class="mt-2 self-center"
                :label="$t('pricing_page_learn_more')"
                :to="learnMoreRoute"
                variant="link"
                color="neutral"
                block
                size="sm"
              />

              <UAlert
                v-if="!isApp && coupon"
                class="mt-4"
                color="secondary"
                variant="soft"
                icon="i-material-symbols-percent-discount-outline-rounded"
                :description="$t('pricing_page_coupon_applied_description')"
                :ui="{
                  root: 'rounded-xl',
                  title: 'font-bold',
                }"
              >
                <template #title>
                  <i18n-t keypath="pricing_page_coupon_applied_title">
                    <template #code>
                      <UBadge
                        class="font-bold font-mono"
                        :label="coupon"
                        color="primary"
                        variant="soft"
                      />
                    </template>
                  </i18n-t>
                </template>
              </UAlert>
            </slot>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PricingPageContentProps } from './PricingPageContent.props'
import { PAID_TRIAL_PERIOD_DAYS_THRESHOLD } from '~/constants/pricing'

const localeRoute = useLocaleRoute()
const isDesktopScreen = useDesktopScreen()
const { t: $t } = useI18n()
const getRouteQuery = useRouteQuery()
const { isApp } = useAppDetection()

const emit = defineEmits<{
  'open': []
  'subscribe': [payload: {
    trialPeriodDays?: number
    mustCollectPaymentMethod?: boolean
    plan: SubscriptionPlan
    utmCampaign?: string
    utmMedium?: string
    utmSource?: string
  }]
  'update:modelValue': [value: SubscriptionPlan]
}>()

const props = withDefaults(
  defineProps<PricingPageContentProps>(),
  {
    isProcessingSubscription: false,
  },
)

const isCustomVoiceCampaign = computed(() => {
  return getRouteQuery('utm_campaign').includes('custom-voice')
})

const shouldShowTTSSamples = computed(() => {
  return getRouteQuery('samples') === '1' || isCustomVoiceCampaign.value
})

const abTest = shouldShowTTSSamples.value
  ? undefined
  : useABTest({
      experimentKey: isDesktopScreen.value
        ? 'pricing-page-tts-sample-desktop'
        : 'pricing-page-tts-sample-mobile',
    })

const isShowTTSSamples = computed(() => shouldShowTTSSamples.value || abTest?.isVariant('tts-sample'))

const utmCampaign = computed(() => {
  return getRouteQuery('utm_campaign') || props.utmCampaign
})
const campaignId = computed(() => {
  return getRouteQuery('utm_term') || getRouteQuery('utm_campaign')
})

const {
  campaignContent,
  isBlocktrendCampaign,
} = usePricingPageCampaign({ campaignId })

// NOTE: This could be simplified by computed, but props not updated after `open()` in `useOverlay()`
const selectedPlan = useVModel(props, 'modelValue', emit, {
  passive: true,
  defaultValue: 'yearly',
})

const isPaidTrial = computed(() => props.trialPeriodDays && props.trialPeriodDays >= PAID_TRIAL_PERIOD_DAYS_THRESHOLD)

const route = useRoute()
const getRouteBaseName = useRouteBaseName()
const learnMoreRoute = computed(() => {
  if (getRouteBaseName(route) === 'about' || getRouteQuery('ll_source') === 'about-page') {
    return localeRoute({ name: 'store' })
  }
  return localeRoute({ name: 'about', query: { ll_medium: 'about-link', ll_source: 'plus-modal' } })
})

const subscribeButtonLabel = computed(() => {
  if (isCustomVoiceCampaign.value) {
    return $t('plus_subscribe_cta_custom_voice_free')
  }
  if (props.trialPeriodDays) {
    if (isPaidTrial.value) {
      return $t('plus_subscribe_cta_enjoy_offer')
    }
    return $t('plus_subscribe_cta_start_free_trial', { days: props.trialPeriodDays })
  }
  return $t('plus_subscribe_cta_continue')
})

onMounted(() => {
  emit('open')

  if (campaignContent.value) {
    useLogEvent(`pricing_page_campaign_${campaignContent.value.id}`)
  }
})

function handleSubscribeButtonClick() {
  emit('subscribe', {
    plan: selectedPlan.value ?? 'yearly',
    mustCollectPaymentMethod: props.mustCollectPaymentMethod,
    trialPeriodDays: props.trialPeriodDays,
    utmCampaign: utmCampaign.value,
    utmMedium: props.utmMedium,
    utmSource: props.utmSource,
  })
}
</script>
