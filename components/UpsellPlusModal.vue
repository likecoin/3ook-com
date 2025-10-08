<template>
  <UModal
    :ui="{
      title: 'text-sm laptop:text-base font-bold text-center',
      footer: 'flex flex-col items-center w-full',
      body: 'flex flex-col items-start gap-1 laptop:gap-2 max-laptop:text-sm px-6',
    }"
    @update:open="onOpenUpdate"
  >
    <template #header>
      <UIcon
        name="i-material-symbols-celebration-outline"
        class="text-theme-400"
        size="24"
      />
      <span
        class="text-lg font-bold"
        v-text="$t('upsell_plus_modal_title')"
      />
      <UIcon
        name="i-material-symbols-close"
        class="text-gray-500 cursor-pointer ml-auto hover:text-gray-700"
        size="24"
        @click="handleClose"
      />
    </template>
    <template #body>
      <i18n-t
        v-if="showYearlyPlan"
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
        v-if="showMonthlyPlan"
        class="self-center text-center text-gray-500 text-xs"
        v-text="$t('upsell_plus_or')"
      />
      <i18n-t
        v-if="showMonthlyPlan"
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
      <div class="self-center border-t border-gray-200 h-1 w-[24px] my-[12px]" />
      <span
        class="text-sm !text-gray-500 mb-1"
        v-text="$t('upsell_plus_modal_other_benefits')"
      />
      <ul
        :class="[
          'whitespace-pre-wrap',
          'space-y-3 text-left',
          '*:flex *:items-start',
          '[&>li>span:first-child]:shrink-0',
          '[&>li>span:first-child]:mt-1',
          '[&>li>span:first-child]:mr-2',
          '[&>li>span:first-child]:text-green-500',
        ]"
      >
        <li>
          <UIcon name="i-material-symbols-check" />
          <span v-text="$t('pricing_page_feature_1')" />
        </li>
        <li>
          <UIcon name="i-material-symbols-check" />
          <span v-text="$t('pricing_page_feature_2')" />
        </li>
        <li>
          <UIcon name="i-material-symbols-check" />
          <span v-text="$t('pricing_page_feature_3')" />
        </li>
        <li>
          <UIcon name="i-material-symbols-check" />
          <span v-text="$t('pricing_page_feature_4')" />
        </li>
        <li>
          <UIcon name="i-material-symbols-check" />
          <span
            v-text="$t('pricing_page_feature_5', {
              monthlyPrice,
              yearlyPrice,
            })"
          />
        </li>
      </ul>
    </template>
    <template #footer>
      <div class="w-full flex flex-col laptop:flex-row items-center gap-3">
        <UButton
          v-if="showYearlyPlan"
          class="w-full flex flex-col"
          :label="$t('upsell_plus_yearly_button')"
          block
          size="xl"
          color="primary"
          :ui="{
            base: '!gap-1',
            label: 'font-bold',
          }"
          @click="() => handleSubscribe('yearly')"
        >
          <span
            class="font-bold"
            v-text="yearlyButtonCTA"
          />
          <div class="flex items-center justify-center gap-1">
            <span
              v-if="hasYearlyDiscount"
              class="text-gray-500 line-through"
              v-text="$t('upsell_plus_yearly_price_full', { price: originalYearlyPrice })"
            />
            <span
              class="text-theme-50 font-bold"
              v-text="$t('upsell_plus_yearly_price_full', { price: yearlyPrice })"
            />
          </div>
        </UButton>
        <UButton
          v-if="showMonthlyPlan"
          class="w-full flex flex-col"
          block
          size="xl"
          variant="outline"
          color="primary"
          :ui="{
            base: '!gap-1',
          }"
          @click="() => handleSubscribe('monthly')"
        >
          <span v-text="monthlyButtonCTA" />
          <div class="flex items-center justify-center gap-1">
            <span
              v-if="hasMonthlyDiscount"
              class="text-gray-500 line-through"
              v-text="$t('upsell_plus_monthly_price_full', { price: originalMonthlyPrice })"
            />
            <span
              class="text-theme-black"
              v-text="$t('upsell_plus_monthly_price_full', { price: monthlyPrice })"
            />
          </div>
        </UButton>
      </div>

      <UButton
        class="mt-2"
        :label="$t('upsell_plus_modal_close_button')"
        block
        size="xl"
        variant="link"
        :ui="{
          base: 'cursor-pointer',
        }"
        @click="handleClose"
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
  trialPeriodDays: 7,
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
const {
  monthlyPrice,
  originalMonthlyPrice,
  yearlyPrice,
  originalYearlyPrice,
  hasMonthlyDiscount,
  hasYearlyDiscount,
} = useSubscriptionPricing()

const showMonthlyPlan = computed(() => !props.isLikerPlus)
const showYearlyPlan = computed(() => (
  showMonthlyPlan.value
  || (props.isLikerPlus && props.likerPlusPeriod === 'month')
))

const allowYearlyTrial = computed(() => !props.nftClassId)

const yearlyButtonCTA = computed(() => {
  if (props.nftClassId) {
    return $t('upsell_plus_yearly_gift_cta')
  }
  if (props.trialPeriodDays && allowYearlyTrial.value) {
    return $t('upsell_plus_yearly_trial_cta', { days: props.trialPeriodDays })
  }
  return $t('upsell_plus_yearly_button')
})

const monthlyButtonCTA = computed(() => {
  if (props.trialPeriodDays) {
    return $t('upsell_plus_monthly_trial_cta', { days: props.trialPeriodDays })
  }
  return $t('upsell_plus_monthly_button')
})

function handleSubscribe(plan: SubscriptionPlan) {
  const shouldApplyTrial = plan === 'monthly' || allowYearlyTrial.value
  emit('subscribe', {
    plan,
    trialPeriodDays: shouldApplyTrial ? props.trialPeriodDays : undefined,
    utmCampaign: props.utmCampaign,
    utmMedium: props.utmMedium,
    utmSource: props.utmSource,
    nftClassId: plan === 'yearly' ? props.nftClassId : undefined,
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
