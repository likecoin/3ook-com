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
      <PricingPageContent
        :model-value="props.modelValue"
        :is-processing-subscription="props.isProcessingSubscription"
        :trial-period-days="props.trialPeriodDays"
        :must-collect-payment-method="props.mustCollectPaymentMethod"
        :utm-campaign="props.utmCampaign"
        :utm-medium="props.utmMedium"
        :utm-source="props.utmSource"
        :coupon="props.coupon"
        @subscribe="emit('subscribe', $event)"
        @update:model-value="emit('update:modelValue', $event)"
      >
        <template #header-action>
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
        </template>
      </PricingPageContent>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { PaywallModalProps } from './PaywallModal.props'

// NOTE: When the dialog's modality is set to true, interaction with elements outside the dialog is disabled.
// Therefore, we set modality to false so input in the Magic login UI remains accessible.
const isModalityOn = false

const emit = defineEmits<{
  'open': []
  'close': []
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
</script>
