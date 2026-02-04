<template>
  <div
    :class="[
      'flex',
      'flex-col',
      isTitleCenter ? 'items-center' : 'items-start',
      'gap-3 laptop:gap-4',
    ]"
  >
    <div
      :class="[
        isDarkBackground ? 'text-theme-cyan' : 'text-theme-black dark:text-theme-cyan',
        isTitleCenter ? 'text-center' : 'text-left',
        'font-bold',
        'border-b-2 border-current',
      ]"
      v-text="title || $t('pricing_page_subscription')"
    />

    <ul
      :class="[
        '*:flex *:items-start',
        'space-y-3 laptop:space-y-4',
        'text-left',
        'whitespace-pre-wrap',
        '[&>li>span:first-child]:shrink-0',
        '[&>li>span:first-child]:mt-1',
        '[&>li>span:first-child]:mr-2',
        '[&>li>span:first-child]:text-theme-cyan',
        { '[&>li>span:last-child]:text-white': isDarkBackground },
      ]"
    >
      <li v-if="!isAudioHidden">
        <UIcon name="i-material-symbols-check" />
        <span v-text="$t('pricing_page_feature_1')" />
      </li>
      <li>
        <UIcon name="i-material-symbols-check" />
        <NuxtLink
          :to="localeRoute({ name: 'store' })"
          target="_blank"
          class="underline"
          @click="useLogEvent('pricing_benefit_click_store')"
        >
          {{ $t('pricing_page_feature_2') }}
        </NuxtLink>
      </li>
      <template v-if="!isCompact">
        <li>
          <UIcon name="i-material-symbols-check" />
          <NuxtLink
            to="https://review.3ook.com/s/plus?utm_source=3ookcom&utm_medium=plus-benefit"
            target="_blank"
            class="underline"
            @click="useLogEvent('pricing_benefit_click_early_access')"
          >
            {{ $t('pricing_page_feature_3') }}
          </NuxtLink>
        </li>
        <li>
          <UIcon name="i-material-symbols-check" />
          <button
            type="button"
            class="underline cursor-pointer"
            @click="handleOpenIntercom"
            v-text="$t('pricing_page_feature_4')"
          />
        </li>
        <li>
          <UIcon name="i-material-symbols-check" />
          <span
            v-text="$t('pricing_page_feature_5', {
              currency,
              monthlyPrice,
              yearlyPrice,
            })"
          />
        </li>
      </template>
      <li v-if="selectedPlan === undefined || isYearlyPlan">
        <UIcon name="i-material-symbols-check" />
        <span
          v-if="isYearlyPlan"
          v-text="$t('pricing_page_feature_6_yearly')"
        />
        <span
          v-else
          v-text="$t('pricing_page_feature_6')"
        />
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
const localeRoute = useLocaleRoute()

const props = withDefaults(defineProps<{
  selectedPlan?: SubscriptionPlan
  title?: string
  isTitleCenter?: boolean
  isDarkBackground?: boolean
  isCompact?: boolean
  isAudioHidden?: boolean
}>(), {
  isTitleCenter: false,
  isDarkBackground: false,
  isCompact: false,
  isAudioHidden: false,
})

const {
  monthlyPrice,
  yearlyPrice,
  currency,
} = useSubscriptionPricing()

const isYearlyPlan = computed(() => {
  return props.selectedPlan === 'yearly'
})

const { t: $t } = useI18n()

function handleOpenIntercom() {
  useLogEvent('pricing_benefit_click_intercom')
  if (window?.Intercom) {
    window.Intercom('showNewMessage', $t('pricing_page_intercom_prefill'))
  }
}
</script>
