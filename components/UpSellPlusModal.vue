<template>
  <UModal
    :ui="{
      content: [
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
      ],
    }"
    @close="handleClose"
  >
    <template #content>
      <UButton
        icon="i-material-symbols-close"
        class="absolute z-10 top-4 right-4 cursor-pointer"
        variant="link"
        size="md"
        @click="handleClose"
      />

      <div
        class="flex flex-col justify-center items-start w-full p-5 laptop:p-12"
      >
        <div class="w-full max-w-[420px] max-laptop:mx-auto">
          <!-- Introduction -->
          <div class="flex flex-col items-start mx-0 laptop:mx-6 gap-2">
            <div
              class="mb-3 px-6 py-2 text-white text-center font-bold bg-black rounded-full"
              v-text="$t('upsell_plus_modal_title')"
            />
            <span
              v-if="showYearlyPlan"
              class="flex items-center gap-2"
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
              class="flex items-center gap-2"
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
                    class="text-theme-400 font-semibold text-lg"
                    v-text="$t('upsell_plus_monthly_member')"
                  />
                </template>
                <template #discount>
                  <span
                    class="text-theme-400 font-semibold text-lg"
                    v-text="$t('upsell_plus_monthly_discount')"
                  />
                </template>
              </i18n-t>
            </span>
            <span
              class="text-sm !text-gray-500 mt-5 mb-1"
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
            </ul>
          </div>

          <!-- Subscription Buttons -->
          <div class="w-full flex items-center gap-2 mt-8">
            <UButton
              v-if="showYearlyPlan"
              class="w-full"
              :label="$t('upsell_plus_yearly_button')"
              block
              size="xl"
              color="primary"
              :ui="{
                base: 'py-2 laptop:py-3 rounded-2xl cursor-pointer',
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
                base: 'py-2 laptop:py-3 rounded-2xl cursor-pointer',
                label: 'font-bold',
              }"
              @click="() => handleSubscribe('monthly')"
            />
          </div>

          <UButton
            class="mt-2"
            :label="$t('upsell_plus_modal_close_button')"
            block
            size="xl"
            variant="outline"
            :ui="{
              base: 'py-2 laptop:py-3 rounded-2xl cursor-pointer',
              label: 'font-bold',
            }"
            @click="handleClose"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { UpSellPlusModalProps } from './UpSellPlusModal.props'

const props = withDefaults(defineProps<UpSellPlusModalProps>(), {
  isNotMember: false,
  isMonthlyMember: false,
  isProcessingSubscription: false,
  hasFreeTrial: false,
  mustCollectPaymentMethod: false,
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
  }]
}>()

const { t: $t } = useI18n()

const showYearlyPlan = computed(() => props.isNotMember || props.isMonthlyMember)
const showMonthlyPlan = computed(() => props.isNotMember)

function handleSubscribe(plan: SubscriptionPlan) {
  emit('subscribe', {
    plan,
    utmCampaign: props.utmCampaign,
    utmMedium: props.utmMedium,
    utmSource: props.utmSource,
  })
}

function handleClose() {
  emit('close')
}

onMounted(() => {
  emit('open')
})
</script>
