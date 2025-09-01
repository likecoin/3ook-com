<template>
  <UModal
    :title="$t('pricing_page_subscription')"
    :description="$t('pricing_page_subscription_description')"
    :fullscreen="isFullscreenModal"
    :dismissible="props.isBackdropDismissible"
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
          'top-4',
          'right-4',
          { 'max-laptop:text-white': isShowPlusEarlyBirdBanner },
          'cursor-pointer',
        ]"
        variant="link"
        size="md"
        @click="handleCloseButtonClick"
      />

      <PlusEarlyBirdBanner
        v-if="isShowPlusEarlyBirdBanner"
        class="max-laptop:shrink-0 w-full"
      />
      <aside
        v-else
        class="relative flex items-center max-laptop:shrink-0 w-full bg-white overflow-hidden"
      >
        <img
          class="laptop:absolute top-0 w-full max-h-[320px] object-cover pointer-events-none mix-blend-multiply"
          :src="topBg"
        >
        <img
          class="max-laptop:hidden absolute bottom-0 w-full pointer-events-none mix-blend-multiply"
          :src="bottomBg"
        >

        <div class="absolute max-laptop:bottom-0 laptop:relative flex flex-col items-center justify-center w-full px-10">
          <div
            class="laptop:hidden px-6 py-2 text-white text-center font-bold bg-black rounded-full"
            v-text="$t('pricing_page_subscription')"
          />
          <img
            :src="plusLogo"
            :alt="$t('pricing_page_title')"
            class="w-full max-w-[300px] laptop:max-h-[200px] object-contain"
          >
        </div>
      </aside>

      <div class="flex flex-col justify-center items-start w-full p-5 laptop:p-12">
        <div class="w-full max-w-[420px] max-laptop:mx-auto">
          <!-- Introduction -->
          <div class="flex flex-col items-start gap-5">
            <div
              :class="[
                { 'max-laptop:hidden': !isShowPlusEarlyBirdBanner },
                'px-6',
                'py-2',
                'text-white',
                'text-center',
                'font-bold',
                'bg-black',
                'rounded-full',
              ]"
              v-text="$t('pricing_page_subscription')"
            />
            <ul
              :class="[
                'whitespace-pre-wrap',
                'space-y-4 text-left',
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
                <i18n-t
                  keypath="pricing_page_feature_5"
                  tag="p"
                >
                  <template #highlight>
                    <strong
                      class="font-bold"
                      v-text="$t('pricing_page_feature_5_highlight')"
                    />
                  </template>
                </i18n-t>
              </li>
            </ul>
          </div>

          <!-- Price Select -->
          <div class="flex flex-col w-full mt-12">
            <div class="flex flex-col gap-4">
              <!-- Yearly plan -->
              <label
                :class="[
                  ...planLabelBaseClass,
                  selectedPlan === 'yearly' ? 'border-black' : 'border-gray-200',
                ]"
              >
                <div
                  class="absolute -top-3 left-1/6 -translate-x-1/2 bg-black text-[#A6F5EA] text-xs font-semibold px-3 py-1 rounded-lg"
                  v-text="$t('pricing_page_yearly_discount', { discount: discountPercent })"
                />

                <div class="flex items-center">
                  <div class="w-6 h-6 flex-shrink-0 mr-4">
                    <div
                      :class="[
                        'w-full h-full rounded-full border flex items-center justify-center',
                        selectedPlan === 'yearly' ? 'bg-black' : 'bg-white border-gray-300',
                      ]"
                    >
                      <UIcon
                        v-if="selectedPlan === 'yearly'"
                        name="i-material-symbols-check"
                        class="bg-[#A6F5EA]"
                        size="16"
                      />
                    </div>
                  </div>
                  <div
                    class="text-md font-semibold whitespace-nowrap"
                    v-text="$t('pricing_page_yearly')"
                  />
                </div>
                <div class="text-right">
                  <div class="flex justify-end items-center gap-2 text-sm text-gray-400">
                    <p v-text=" $t('pricing_page_original_price')" />
                    <span
                      class="line-through text-gray-400"
                      v-text="`US$${props.originalYearlyPrice}`"
                    />
                  </div>
                  <i18n-t
                    keypath="pricing_page_price_per_year"
                    tag="div"
                    class="flex items-baseline text-sm whitespace-nowrap"
                  >
                    <template #price>
                      <p
                        class="text-2xl font-bold px-1"
                        v-text="`$${props.discountedYearlyPrice}`"
                      />
                    </template>
                  </i18n-t>
                </div>
                <input
                  v-model="selectedPlan"
                  type="radio"
                  name="plan"
                  value="yearly"
                  class="hidden"
                >
              </label>

              <!-- Monthly plan -->
              <label
                :class="[
                  ...planLabelBaseClass,
                  selectedPlan === 'monthly' ? 'border-black' : 'border-gray-200',
                ]"
              >
                <div class="flex items-center">
                  <div class="w-6 h-6 flex-shrink-0 mr-4">
                    <div
                      class="w-full h-full rounded-full border flex items-center justify-center bg-black"
                      :class="selectedPlan === 'monthly' ? 'bg-black' : 'bg-white border-gray-300'"
                    >
                      <UIcon
                        v-if="selectedPlan === 'monthly'"
                        name="i-material-symbols-check"
                        class="bg-[#A6F5EA]"
                        size="16"
                      />
                    </div>
                  </div>
                  <div
                    class="text-md font-semibold whitespace-nowrap"
                    v-text="$t('pricing_page_monthly')"
                  />
                </div>

                <div class="text-right">
                  <div class="flex justify-end items-center gap-2 text-sm text-gray-400">
                    <p v-text=" $t('pricing_page_original_price')" />
                    <span
                      class="line-through text-gray-400"
                      v-text="`US$${props.originalMonthlyPrice}`"
                    />
                  </div>
                  <i18n-t
                    keypath="pricing_page_price_per_month"
                    tag="div"
                    class="flex items-baseline text-sm whitespace-nowrap"
                  >
                    <template #price>
                      <p
                        class="text-2xl font-bold px-1"
                        v-text="`$${props.discountedMonthlyPrice}`"
                      />
                    </template>
                  </i18n-t>
                </div>

                <input
                  v-model="selectedPlan"
                  type="radio"
                  name="plan"
                  value="monthly"
                  class="hidden"
                >
              </label>
            </div>

            <UButton
              class="mt-4"
              :label="$t('pricing_page_continue_button')"
              block
              size="xl"
              :loading="props.isProcessingSubscription"
              :ui="{ base: 'py-2 laptop:py-3 rounded-2xl cursor-pointer', label: 'font-bold' }"
              @click="handleSubscribeButtonClick"
            />
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { PaywallModalProps } from './PaywallModal.props'

import topBg from '~/assets/images/paywall/bg-top.png'
import bottomBg from '~/assets/images/paywall/bg-bottom.png'
import plusLogo from '~/assets/images/paywall/plus-logo.png'

// NOTE: When the dialog's modality is set to true, interaction with elements outside the dialog is disabled.
// Therefore, we set modality to false so input in the Magic login UI remains accessible.
const isModalityOn = false

const isShowPlusEarlyBirdBanner = false

const emit = defineEmits<{
  'open': []
  'close': []
  'subscribe': [payload: {
    selectedPlan: SubscriptionPlan
    utmCampaign?: string
    utmMedium?: string
    utmSource?: string
  }]
  'update:modelValue': [value: SubscriptionPlan]
}>()
const { t: $t } = useI18n()
const isScreenSmall = useMediaQuery('(max-width: 1023px)')

const props = withDefaults(
  defineProps<PaywallModalProps>(),
  {
    isFullscreen: false,
    isBackdropDismissible: true,
    isCloseButtonHidden: false,
    originalYearlyPrice: '99.99',
    originalMonthlyPrice: '9.99',
    discountedYearlyPrice: '69.99',
    discountedMonthlyPrice: '6.99',
    isProcessingSubscription: false,
  },
)

const isFullscreenModal = computed(() => props.isFullscreen || isScreenSmall.value)

const modalContentClass = computed(() => {
  const classes = [
    'flex',
    'flex-col',
    'laptop:flex-row',
    'gap-y-2',
    'items-stretch',
    'w-full',
    'mx-auto',
    'divide-y-0',
    'laptop:rounded-2xl',
    'overflow-x-hidden',
  ]
  if (!isFullscreenModal.value) {
    classes.push('max-w-[420px] laptop:max-w-[840px]')
  }
  return classes.join(' ')
})

// NOTE: This could be simplified by computed, but props not updated after `open()` in `useOverlay()`
const selectedPlan = ref(props.modelValue || 'yearly')
watch(
  selectedPlan,
  value => emit('update:modelValue', value),
)

const planLabelBaseClass = [
  'relative',
  'flex',
  'justify-between',
  'items-center',
  'px-4',
  'py-4',
  'rounded-2xl',
  'border-2',
  'cursor-pointer',
  'transition-all',
  'duration-200',
  'ease-in-out',
  'hover:shadow-lg',
  'hover:border-gray-400',
]

const discountPercent = computed(() => {
  const originalYearlyCost = Number(props.discountedMonthlyPrice) * 12
  const discountedAmount = originalYearlyCost - Number(props.discountedYearlyPrice)
  return Math.round((discountedAmount / originalYearlyCost) * 100)
})

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

const handleCloseButtonClick = () => {
  emit('close')
}

function handleSubscribeButtonClick() {
  emit('subscribe', {
    selectedPlan: selectedPlan.value,
    utmCampaign: props.utmCampaign,
    utmMedium: props.utmMedium,
    utmSource: props.utmSource,
  })
}
</script>
