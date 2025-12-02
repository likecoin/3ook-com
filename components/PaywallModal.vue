<template>
  <UModal
    :title="$t('pricing_page_subscription')"
    :description="$t('pricing_page_subscription_description')"
    :fullscreen="isFullscreenModal"
    :dismissible="props.isBackdropDismissible"
    :transition="props.hasTransition"
    :modal="isModalityOn"
    :ui="{ content: modalContentClass }"
    @update:open="onOpenUpdate"
  >
    <template #content>
      <UButton
        v-if="!props.isCloseButtonHidden"
        icon="i-material-symbols-close"
        :class="[
          'absolute',
          'z-10',
          'top-0 phone:top-4',
          'right-0 phone:right-4',
          'max-phone:scale-75',
          'max-laptop:text-white',
          'cursor-pointer',
        ]"
        variant="link"
        size="md"
        @click="handleCloseButtonClick"
      />
      <template v-if="isDesktopScreen && isShowTTSSamples">
        <aside class="relative flex justify-end w-full bg-theme-cyan min-h-max">
          <div class="flex flex-col justify-center items-center relative w-full max-w-[512px] min-h-max bg-theme-black">
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
              <img
                v-if="!campaignContent"
                :src="plusLogo"
                :alt="$t('pricing_page_title')"
                class="w-full max-w-[300px] laptop:max-h-[200px] mb-12 object-contain"
              >

              <PricingPageIntroSection
                class="w-full max-w-[420px]"
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
          <div class="max-laptop:hidden absolute inset-0 overflow-hidden">
            <PricingPageCampaignMedia
              class="absolute inset-x-0 w-full top-1/2 -translate-y-1/2"
              :campaign-id="campaignContent.id"
              orientation="portrait"
            />
          </div>
          <PricingPageCampaignMedia
            class="laptop:hidden w-full"
            :campaign-id="campaignContent.id"
            orientation="landscape"
          />
        </aside>
        <aside
          v-else
          class="relative flex justify-center items-center max-laptop:shrink-0 w-full p-12 bg-theme-black overflow-hidden"
        >
          <img
            :src="plusLogo"
            :alt="$t('pricing_page_title')"
            class="w-full max-w-[300px] laptop:max-h-[200px] object-contain"
          >
        </aside>
      </template>

      <div
        :class="[
          'flex',
          'w-full',
          { 'items-center': !isShowTTSSamples || campaignContent },
          'min-h-max',
        ]"
      >
        <div
          :class="[
            'w-full',
            'max-w-[512px]',
            'max-laptop:mx-auto',
            'p-5 laptop:p-12',
            campaignContent ? 'max-laptop:pt-8' : 'laptop:pt-30',
          ]"
        >
          <PricingPageIntroSection
            v-if="!(isShowTTSSamples && isDesktopScreen)"
            class="mb-8"
            :title="campaignContent?.title"
            :description="campaignContent?.description"
          />
          <TTSSamplesSection v-if="isShowTTSSamples" />

          <!-- Price Select -->
          <div class="flex flex-col w-full mt-12">
            <PricingLimitedOfferAlert
              class="laptop:pt-5 rounded-xl"
              :is-hidden="!isTrialFor30Days"
              :trial-period-days="trialPeriodDays"
            >
              <PricingPlanSelect
                v-model="selectedPlan"
                :trial-period-days="trialPeriodDays"
              />

              <UButton
                class="mt-4"
                :label="subscribeButtonLabel"
                block
                size="xl"
                :loading="props.isProcessingSubscription"
                :ui="{ base: 'py-2 laptop:py-3 cursor-pointer', label: 'font-bold' }"
                @click="handleSubscribeButtonClick"
              />
            </PricingLimitedOfferAlert>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { PaywallModalProps } from './PaywallModal.props'

import plusLogo from '~/assets/images/paywall/plus-logo.png'

const isDesktopScreen = useDesktopScreen()

// NOTE: When the dialog's modality is set to true, interaction with elements outside the dialog is disabled.
// Therefore, we set modality to false so input in the Magic login UI remains accessible.
const isModalityOn = false

const emit = defineEmits<{
  'open': []
  'close': []
  'subscribe': [payload: {
    trialPeriodDays?: number
    mustCollectPaymentMethod?: boolean
    selectedPlan: SubscriptionPlan
    utmCampaign?: string
    utmMedium?: string
    utmSource?: string
  }]
  'update:modelValue': [value: SubscriptionPlan]
}>()

const props = withDefaults(
  defineProps<PaywallModalProps>(),
  {
    isFullscreen: false,
    isBackdropDismissible: true,
    hasTransition: true,
    isCloseButtonHidden: false,
    isProcessingSubscription: false,
  },
)

const { t: $t } = useI18n()
const isScreenSmall = useMediaQuery('(max-width: 1023px)')
const getRouteQuery = useRouteQuery()

const shouldShowTTSSamples = computed(() => {
  return getRouteQuery('samples') === '1'
})

const abTest = shouldShowTTSSamples.value
  ? undefined
  : useABTest({
      experimentKey: 'pricing-page-tts-sample',
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

const isFullscreenModal = computed(() => props.isFullscreen || isScreenSmall.value)

const modalContentClass = computed(() => {
  const classes = [
    'flex',
    'flex-col',
    'laptop:flex-row',
    'items-stretch',
    'w-full',
    'divide-y-0',
    'rounded-none',
    '!overflow-x-hidden',
    '!overflow-y-auto',
  ]
  if (!isFullscreenModal.value) {
    classes.push(
      'max-w-md laptop:max-w-5xl',
      'laptop:rounded-2xl',
    )
  }
  return classes.join(' ')
})

// NOTE: This could be simplified by computed, but props not updated after `open()` in `useOverlay()`
const selectedPlan = ref(props.modelValue || 'yearly')
watch(
  selectedPlan,
  value => emit('update:modelValue', value),
)

const isTrialFor30Days = computed(() => props.trialPeriodDays === 30)

const subscribeButtonLabel = computed(() => {
  if (props.trialPeriodDays) {
    if (isTrialFor30Days.value) {
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

const onOpenUpdate = (open: boolean) => {
  if (open) {
    emit('open')
  }
  else {
    emit('close')
  }
}

const handleCloseButtonClick = () => {
  emit('close')
}

function handleSubscribeButtonClick() {
  emit('subscribe', {
    selectedPlan: selectedPlan.value,
    mustCollectPaymentMethod: props.mustCollectPaymentMethod,
    trialPeriodDays: props.trialPeriodDays,
    utmCampaign: utmCampaign.value,
    utmMedium: props.utmMedium,
    utmSource: props.utmSource,
  })
}
</script>
