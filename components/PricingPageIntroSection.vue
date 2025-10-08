<template>
  <div class="flex flex-col items-start gap-5">
    <div
      :class="[
        'max-laptop:mx-auto',
        'px-6',
        'py-2',
        props.isDarkBackground ? 'text-theme-black' : 'text-white',
        'text-center',
        'font-bold',
        props.isDarkBackground ? 'bg-theme-cyan' : 'bg-theme-black',
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
        props.isDarkBackground
          ? '[&>li>span:first-child]:text-theme-cyan'
          : '[&>li>span:first-child]:text-green-500',
        { 'text-white': !!props.isDarkBackground },
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
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  isDarkBackground: {
    type: Boolean,
    default: false,
  },
})

const {
  monthlyPrice,
  yearlyPrice,
} = useSubscriptionPricing()
</script>
