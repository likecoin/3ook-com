<template>
  <UModal
    :title="$t('upsell_plus_modal_title')"
    :ui="{
      title: 'text-sm laptop:text-base font-bold text-center',
      footer: 'flex flex-col items-center w-full',
      body: 'flex flex-col items-start gap-2 max-laptop:text-sm',
    }"
    @update:open="onOpenUpdate"
  >
    <template #body>
      <span
        v-if="showYearlyPlan"
        class="flex items-center gap-2 laptop:text-lg"
      >
        <UIcon
          name="i-material-symbols-celebration-outline"
          class="text-theme-400"
        />
        <i18n-t
          class="text-theme-500 text-center font-bold"
          keypath="upsell_plus_yearly_notice"
          tag="span"
        >
          <template #year>
            <span
              class="text-theme-400 font-semibold text-lg"
              v-text="$t('upsell_plus_yearly_member')"
            />
          </template>
          <template #gift>
            <span
              class="text-theme-400 font-semibold text-lg"
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
        class="w-full py-[12px] flex justify-center items-center gap-2 text-[16px] laptop:text-[20px]"
      >
        <UIcon
          name="i-material-symbols-celebration-outline"
          class="text-theme-400"
        />
        <i18n-t
          class="text-theme-500 text-center font-bold"
          keypath="upsell_plus_monthly_notice"
          tag="span"
        >
          <template #month>
            <span
              class="text-theme-400 font-semibold"
              v-text="$t('upsell_plus_monthly_member')"
            />
          </template>
          <template #discount>
            <span
              class="text-theme-400 font-semibold"
              v-text="$t('upsell_plus_monthly_discount')"
            />
          </template>
        </i18n-t>
      </span>
      <div class=" self-center border-t border-gray-200 my-2 h-1 w-[24px]" />
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
      <div class="w-full flex items-center gap-2">
        <UButton
          v-if="showYearlyPlan"
          class="w-full"
          :label="$t('upsell_plus_yearly_button')"
          block
          size="xl"
          color="primary"
          :ui="{
            base: 'py-2 laptop:py-3 cursor-pointer',
            label: 'font-bold',
          }"
          @click="() => handleSubscribe('yearly')"
        />
        <UButton
          v-if="showMonthlyPlan"
          class="w-full"
          :label="$t('upsell_plus_monthly_button')"
          block
          size="xl"
          color="primary"
          :ui="{
            base: 'py-2 laptop:py-3 cursor-pointer',
            label: 'font-bold',
          }"
          @click="() => handleSubscribe('monthly')"
        />
      </div>

      <UButton
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
import type { RouteParamsGeneric } from 'vue-router'
import type { UpsellPlusModalProps } from './UpsellPlusModal.props'

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

const emit = defineEmits<{
  open: []
  close: []
  subscribe: [payload: {
    plan: SubscriptionPlan
    utmCampaign?: string
    utmMedium?: string
    utmSource?: string
    redirectRoute?: {
      name: string
      params: RouteParamsGeneric
      query: Record<string, string>
      hash: string
    }
  }]
}>()

const { t: $t } = useI18n()
const route = useRoute()
const showYearlyPlan = ref(false)
const showMonthlyPlan = computed(() => !props.isLikerPlus)

function handleSubscribe(plan: SubscriptionPlan) {
  emit('subscribe', {
    plan,
    utmCampaign: props.utmCampaign,
    utmMedium: props.utmMedium,
    utmSource: props.utmSource,
    redirectRoute: {
      name: route.name as string,
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
