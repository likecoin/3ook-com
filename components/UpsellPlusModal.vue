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
      <span
        v-if="showYearlyPlan"
        class="w-full flex justify-center items-center gap-1 text-[16px] laptop:text-[20px]"
      >
        <i18n-t
          class="text-theme-500 text-center font-bold whitespace-nowrap"
          keypath="upsell_plus_yearly_notice"
          tag="span"
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
        <UTooltip
          :delay-duration="0"
          :text="$t('upsell_plus_yearly_tooltip')"
        >
          <UIcon
            name="i-material-symbols-info-outline"
            class="text-gray-500 cursor-pointer"
          />
        </UTooltip>
      </span>
      <span
        v-if="showMonthlyPlan"
        class=" w-full text-center text-gray-500 text-xs"
        v-text="$t('upsell_plus_or')"
      />
      <i18n-t
        v-if="showMonthlyPlan"
        class="text-theme-500 text-center font-bold whitespace-nowrap text-[16px] laptop:text-[20px] pb-[12px] w-full"
        keypath="upsell_plus_monthly_notice"
        tag="span"
      >
        <template #month>
          <span
            class="text-theme-500 font-semibold"
            v-text="$t('upsell_plus_monthly_member')"
          />
        </template>
        <template #discount>
          <span
            class="text-theme-500 font-semibold"
            v-text="$t('upsell_plus_monthly_discount')"
          />
        </template>
      </i18n-t>
      <div class="hidden laptop:block self-center border-t border-gray-200 h-1 w-[24px]" />
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
          <span v-text="$t('pricing_page_feature_5')" />
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
            v-text="$t('upsell_plus_yearly_button')"
          />
          <div class="flex items-center justify-center gap-1">
            <span
              class="text-gray-500 line-through"
              v-text="`$${subscriptionPrices.yearly.originalPrice}`"
            />
            <span
              class="text-theme-50 font-bold"
              v-text="`$${subscriptionPrices.yearly.discountedPrice}`"
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
          <span
            v-text="$t('upsell_plus_monthly_button')"
          />
          <div class="flex items-center justify-center gap-1">
            <span
              class="text-gray-500 line-through"
              v-text="`$${subscriptionPrices.monthly.originalPrice}`"
            />
            <span
              class="text-theme-500"
              v-text="`$${subscriptionPrices.monthly.discountedPrice}`"
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
  hasFreeTrial: false,
  mustCollectPaymentMethod: false,
  selectedPricingItemIndex: 0,
  utmCampaign: undefined,
  utmMedium: undefined,
  utmSource: undefined,
})

const subscriptionPrices = {
  yearly: {
    originalPrice: 99.99,
    discountedPrice: 69.99,
  },
  monthly: {
    originalPrice: 9.99,
    discountedPrice: 6.99,
  },
}

const emit = defineEmits<{
  open: []
  close: []
  subscribe: [payload: UpsellPlusModalSubscribeEventPayload]
}>()

const { t: $t } = useI18n()
const route = useRoute()
const showMonthlyPlan = computed(() => !props.isLikerPlus)
const showYearlyPlan = computed(() => (
  showMonthlyPlan.value
  || (props.isLikerPlus && props.likerPlusPeriod === 'month')
))

function handleSubscribe(plan: SubscriptionPlan) {
  emit('subscribe', {
    plan,
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
