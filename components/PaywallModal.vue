<template>
  <UModal
    :full-screen="props.isFullScreen || isMobileScreen"
    :dismissible="props.isDismissible"
    :ui="{ content: 'phone:rounded-2xl overflow-x-hidden phone:w-[90vw] max-w-[840px]' }"
  >
    <template #content>
      <div class="flex flex-col phone:flex-row w-full h-full">
        <div class="w-full relative bg-[#fbfbfb]">
          <UButton
            v-if="props.isDismissible"
            icon="i-material-symbols-close"
            class="
              phone:hidden absolute top-4 right-4 cursor-pointer
            "
            variant="link"
            size="md"
            @click="handleCloseButtonClick"
          />
          <img
            :src="paywallHeaderImg"
            alt="Paywall Header"
            class="phone:absolute top-0 left-0 w-full object-cover"
          >
          <img
            :src="paywallFooterLogo"
            alt="Paywall Footer"
            class="hidden phone:block absolute bottom-0 left-0 w-full object-cover"
          >

          <div class="absolute bottom-0 phone:inset-0 flex flex-col items-center justify-center px-10 w-full">
            <div class="phone:hidden bg-black rounded-full px-6 py-2">
              <span class="font-bold text-white">{{ $t('pricing_page_subscription') }}</span>
            </div>
            <img
              :src="paywallBodyLogo"
              alt="3ook Logo"
              class="w-full max-w-[300px] phone:max-h-[200px] object-contain"
            >
          </div>
        </div>

        <div class="flex flex-col justify-center items-start p-5 phone:p-12 w-full">
          <div class="flex flex-col items-start mx-6 gap-2">
            <div class="hidden phone:block bg-black rounded-full px-6 py-2 mb-3">
              <span class="font-bold text-white">{{ $t('pricing_page_subscription') }}</span>
            </div>
            <ul
              :class="[
                'space-y-4 text-left',
                '*:flex *:items-start',
                '[&>li>span:first-child]:mt-1',
                '[&>li>span:first-child]:mr-2',
                '[&>li>span:first-child]:text-green-500',
              ]"
            >
              <li>
                <UIcon
                  name="i-material-symbols-check"
                />
                <span>{{ $t('pricing_page_feature_1') }}</span>
              </li>
              <li>
                <UIcon
                  name="i-material-symbols-check"
                />
                <span>{{ $t('pricing_page_feature_2') }}</span>
              </li>
              <li>
                <UIcon
                  name="i-material-symbols-check"
                />
                <span>{{ $t('pricing_page_feature_3') }}</span>
              </li>
              <li>
                <UIcon
                  name="i-material-symbols-check"
                />
                <span>{{ $t('pricing_page_feature_4') }}</span>
              </li>
              <li>
                <UIcon
                  name="i-material-symbols-check"
                />
                <span>{{ $t('pricing_page_feature_5') }}</span>
              </li>
            </ul>
          </div>

          <!-- Price Select -->
          <div class="flex flex-col w-full mt-12">
            <UButton
              v-if="props.isDismissible"
              icon="i-material-symbols-close"
              class="
                hidden phone:block absolute top-4 right-4 cursor-pointer
              "
              variant="link"
              size="md"
              @click="handleCloseButtonClick"
            />
            <div class="flex flex-col gap-4">
              <!-- Yearly plan -->
              <label
                :class="[
                  ...planLabelBaseClass,
                  selectedPlan === 'yearly' ? 'border-black' : 'border-gray-200',
                ]"
              >
                <div
                  v-if="selectedPlan === 'yearly'"
                  class="absolute -top-3 left-1/6 -translate-x-1/2 bg-black text-[#A6F5EA] text-xs font-semibold px-3 py-1 rounded-lg"
                >
                  {{ $t('pricing_page_yearly_discount', { discount: discountPercent }) }}
                </div>

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
                  <div class="text-md font-semibold whitespace-nowrap">
                    {{ $t('pricing_page_yearly') }}
                  </div>
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
                  <div class="text-md font-semibold whitespace-nowrap">
                    {{ $t('pricing_page_monthly') }}
                  </div>
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
              class="
                w-full mt-4 py-2 phone:py-3 text-lg text-[#A6F5EA]
                font-semibold rounded-2xl bg-black
                cursor-pointer hover:bg-[#333333] hover:text-[#A6F5EA]
                transition-colors duration-200
              "
              :label="$t('pricing_page_continue_button')"
              block
              :loading="props.isProcessingSubscription"
              @click="handleSubscribe"
            />
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import paywallHeaderImg from '~/assets/images/paywall/paywall-header-bg.png'
import paywallBodyLogo from '~/assets/images/paywall/paywall-body-logo.png'
import paywallFooterLogo from '~/assets/images/paywall/paywall-footer-bg.png'

const emit = defineEmits(['close'])
const { t: $t } = useI18n()
const selectedPlan = ref('yearly')
const isMobileScreen = useMediaQuery('(min-width: 640px)')

const props = defineProps({
  isFullScreen: {
    type: Boolean,
    default: false,
  },
  isDismissible: {
    type: Boolean,
    default: true,
  },
  originalYearlyPrice: {
    type: [String, Number],
    default: '99.99',
  },
  originalMonthlyPrice: {
    type: [String, Number],
    default: '9.99',
  },
  discountedYearlyPrice: {
    type: [String, Number],
    default: '69.99',
  },
  discountedMonthlyPrice: {
    type: [String, Number],
    default: '6.99',
  },
  isProcessingSubscription: {
    type: Boolean,
    default: false,
  },
  handleSubscribe: {
    type: Function as PropType<() => void>,
    required: true,
  },
  onClose: {
    type: Function as PropType<() => void>,
    required: false,
  },
})

const planLabelBaseClass = [
  'relative flex justify-between items-center',
  'px-4 py-4 rounded-2xl border-2 cursor-pointer',
  'transition-all duration-200 ease-in-out',
  'hover:shadow-lg hover:border-gray-400',
]

const discountPercent = computed(() => {
  const originalYearlyCost = Number(props.discountedMonthlyPrice) * 12
  const savedAmount = originalYearlyCost
    - Number(props.discountedYearlyPrice)
  return Math.round((savedAmount / originalYearlyCost) * 100)
})

const handleCloseButtonClick = () => {
  if (typeof props.onClose === 'function') {
    props.onClose()
  }
  emit('close')
}
</script>
