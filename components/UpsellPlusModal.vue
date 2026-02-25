<template>
  <UModal
    :ui="{
      title: 'text-sm laptop:text-base font-bold text-center',
      footer: 'flex flex-col-reverse laptop:flex-row items-center gap-3',
      body: 'flex flex-col items-start gap-1 laptop:gap-2 max-laptop:text-sm px-6',
    }"
    @update:open="onOpenUpdate"
  >
    <template #header>
      <span
        class="text-lg font-bold"
        v-text="$t('upsell_plus_modal_title')"
      />
      <UButton
        icon="i-material-symbols-close-rounded"
        class="cursor-pointer ml-auto -mr-2"
        variant="link"
        size="xl"
        @click="handleClose"
      />
    </template>
    <template #body>
      <PricingPlanBenefits
        class="self-center"
        :selected-plan="selectedPlan"
        :title="$t('upsell_plus_benefits_title')"
        :is-title-center="true"
        :is-compact="false"
        :is-audio-hidden="isAudioHidden"
      />

      <PricingPlanSelect
        v-model="selectedPlan"
        class="w-full mt-4 laptop:mt-6"
        :is-monthly-hidden="!shouldShowMonthlyPlan"
        :is-yearly-hidden="!shouldShowYearlyPlan"
        :is-allow-yearly-trial="isAllowYearlyTrial"
        :trial-period-days="trialPeriodDays"
        :yearly-description="yearlyDescription"
        :monthly-description="monthlyDescription"
        :is-limited-offer-badge-hidden="true"
      />
    </template>
    <template #footer>
      <UButton
        :label="$t('plus_subscribe_cta_upsell_skip')"
        variant="outline"
        size="xl"
        block
        :ui="{ base: 'cursor-pointer' }"
        @click="handleClose"
      />
      <UButton
        :label="subscribeButtonLabel"
        size="xl"
        block
        :ui="{ base: 'cursor-pointer' }"
        @click="handleSubscribe"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { UpsellPlusModalProps, UpsellPlusModalSubscribeEventPayload } from './UpsellPlusModal.props'
import { DEFAULT_TRIAL_PERIOD_DAYS, PAID_TRIAL_PRICE, PAID_TRIAL_PERIOD_DAYS_THRESHOLD } from '~/constants/pricing'

const props = withDefaults(defineProps<UpsellPlusModalProps>(), {
  isLikerPlus: false,
  likerPlusPeriod: undefined,
  isProcessingSubscription: false,
  trialPeriodDays: DEFAULT_TRIAL_PERIOD_DAYS,
  trialPrice: PAID_TRIAL_PRICE,
  mustCollectPaymentMethod: false,
  selectedPricingItemIndex: 0,
  from: undefined,
  isAudioHidden: false,
  utmCampaign: undefined,
  utmMedium: undefined,
  utmSource: undefined,
})

const emit = defineEmits<{
  open: []
  close: [isSuccess: boolean]
  subscribe: [payload: UpsellPlusModalSubscribeEventPayload]
}>()

const { t: $t } = useI18n()
const route = useRoute()
const { currency } = useSubscriptionPricing()

const selectedPlan = ref<SubscriptionPlan>('yearly')

const shouldShowMonthlyPlan = computed(() => !props.isLikerPlus && !props.from)
const shouldShowYearlyPlan = computed(() => (!props.isLikerPlus || props.likerPlusPeriod === 'month') && (!props.from || props.nftClassId))

const isAllowYearlyTrial = computed(() => !props.nftClassId)

const isPaidTrial = computed(() => props.trialPeriodDays && props.trialPeriodDays >= PAID_TRIAL_PERIOD_DAYS_THRESHOLD)

const canGiftBook = computed(() => !!props.bookPrice && !!props.nftClassId)
const isFreeBook = computed(() => !props.bookPrice)

const yearlyDescription = computed(() => {
  if (canGiftBook.value) return $t('upsell_plus_plan_yearly_gift_book')
  return undefined
})

const monthlyDescription = computed(() => {
  if (!isFreeBook.value) return $t('upsell_plus_plan_monthly_discount_book')
  return undefined
})

const subscribeButtonLabel = computed(() => {
  if (selectedPlan.value === 'yearly') {
    if (props.nftClassId) {
      return $t('plus_subscribe_cta_yearly_gift')
    }
    if (props.trialPeriodDays && isAllowYearlyTrial.value) {
      if (isPaidTrial.value) {
        return $t('plus_subscribe_cta_trial_for_price', {
          days: props.trialPeriodDays,
          price: props.trialPrice,
          currency: currency.value,
        })
      }
      return $t('plus_subscribe_cta_trial_for_free', { days: props.trialPeriodDays })
    }
    return $t('plus_subscribe_cta_yearly')
  }
  if (props.trialPeriodDays) {
    if (isPaidTrial.value) {
      return $t('plus_subscribe_cta_trial_for_price', {
        days: props.trialPeriodDays,
        price: props.trialPrice,
        currency: currency.value,
      })
    }
    return $t('plus_subscribe_cta_trial_for_free', { days: props.trialPeriodDays })
  }
  return $t('plus_subscribe_cta_monthly')
})

function handleSubscribe() {
  const shouldApplyTrial = selectedPlan.value === 'monthly' || isAllowYearlyTrial.value
  emit('subscribe', {
    plan: selectedPlan.value,
    trialPeriodDays: shouldApplyTrial ? props.trialPeriodDays : undefined,
    utmCampaign: props.utmCampaign,
    utmMedium: props.utmMedium,
    utmSource: props.utmSource,
    nftClassId: selectedPlan.value === 'yearly' ? props.nftClassId : undefined,
    redirectRoute: {
      name: route.name,
      params: route.params,
      query: {
        ...route.query,
        edition: String(props.selectedPricingItemIndex),
        upsell: '1',
      },
      hash: route.hash,
    },
  })
  emit('close', true)
}

function handleClose() {
  emit('close', false)
}

onMounted(() => {
  emit('open')
})

const onOpenUpdate = (open: boolean) => {
  if (open) {
    emit('open')
  }
  else {
    emit('close', false)
  }
}
</script>
