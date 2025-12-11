<template>
  <UModal
    :ui="{
      header: isTrialFor30Days ? 'p-0 sm:p-0 min-h-max' : undefined,
      title: 'text-sm laptop:text-base font-bold text-center',
      footer: 'flex flex-col-reverse laptop:flex-row items-center gap-3',
      body: 'flex flex-col items-start gap-1 laptop:gap-2 max-laptop:text-sm px-6',
    }"
    @update:open="onOpenUpdate"
  >
    <template
      v-if="isTrialFor30Days"
      #header
    >
      <PricingLimitedOfferAlert
        class="w-full py-6"
        :trial-period-days="trialPeriodDays"
      />
    </template>
    <template
      v-else
      #header
    >
      <UIcon
        name="i-material-symbols-celebration-outline"
        class="text-theme-cyan"
        size="24"
      />
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
      <i18n-t
        v-if="shouldShowYearlyPlan"
        class="self-center text-theme-black text-center font-bold text-[16px] laptop:text-[20px]"
        keypath="upsell_plus_yearly_notice"
        tag="p"
      >
        <template #year>
          <span
            class="text-theme-400 font-semibold"
            v-text="$t('upsell_plus_yearly_member')"
          />
        </template>
        <template #gift>
          <span
            class="text-theme-400 font-semibold"
            v-text="$t('upsell_plus_yearly_gift')"
          />
        </template>
      </i18n-t>
      <span
        v-if="shouldShowMonthlyPlan"
        class="self-center text-center text-gray-500 text-xs"
        v-text="$t('upsell_plus_or')"
      />
      <i18n-t
        v-if="shouldShowMonthlyPlan"
        class="self-center text-theme-black text-center font-bold text-[16px] laptop:text-[20px]"
        keypath="upsell_plus_monthly_notice"
        tag="p"
      >
        <template #month>
          <span
            class="text-theme-black font-semibold"
            v-text="$t('upsell_plus_monthly_member')"
          />
        </template>
        <template #discount>
          <span
            class="text-theme-black font-semibold"
            v-text="$t('upsell_plus_monthly_discount')"
          />
        </template>
      </i18n-t>

      <PricingPlanBenefits
        class="self-center mt-4 laptop:mt-6"
        :selected-plan="selectedPlan"
        :is-title-center="true"
        :is-compact="true"
      />

      <PricingPlanSelect
        v-model="selectedPlan"
        class="w-full mt-4 laptop:mt-6"
        :is-monthly-hidden="!shouldShowMonthlyPlan"
        :is-yearly-hidden="!shouldShowYearlyPlan"
        :is-allow-yearly-trial="isAllowYearlyTrial"
        :trial-period-days="trialPeriodDays"
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

const props = withDefaults(defineProps<UpsellPlusModalProps>(), {
  isLikerPlus: false,
  likerPlusPeriod: undefined,
  isProcessingSubscription: false,
  trialPeriodDays: 30,
  trialPrice: 1,
  mustCollectPaymentMethod: false,
  selectedPricingItemIndex: 0,
  utmCampaign: undefined,
  utmMedium: undefined,
  utmSource: undefined,
})

const emit = defineEmits<{
  open: []
  close: []
  subscribe: [payload: UpsellPlusModalSubscribeEventPayload]
}>()

const { t: $t } = useI18n()
const route = useRoute()
const { currency } = useSubscriptionPricing()

const selectedPlan = ref<SubscriptionPlan>('yearly')

const shouldShowMonthlyPlan = computed(() => !props.isLikerPlus)
const shouldShowYearlyPlan = computed(() => (
  shouldShowMonthlyPlan.value
  || (props.isLikerPlus && props.likerPlusPeriod === 'month')
))

const isAllowYearlyTrial = computed(() => !props.nftClassId)

const isTrialFor30Days = computed(() => props.trialPeriodDays === 30)

const subscribeButtonLabel = computed(() => {
  if (selectedPlan.value === 'yearly') {
    if (props.nftClassId) {
      return $t('plus_subscribe_cta_yearly_gift')
    }
    if (props.trialPeriodDays && isAllowYearlyTrial.value) {
      if (isTrialFor30Days.value) {
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
    if (isTrialFor30Days.value) {
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
      },
      hash: route.hash,
    },
  })
}

function handleClose() {
  emit('close')
}

onMounted(() => {
  emit('open')
})

const onOpenUpdate = (open: boolean) => {
  if (open) {
    emit('open')
  }
  else {
    emit('close')
  }
}
</script>
