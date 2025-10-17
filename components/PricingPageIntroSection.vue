<template>
  <div
    :class="[
      'flex',
      'flex-col',
      'items-start',
      'gap-5',
      { 'text-white': !!props.isDarkBackground },
    ]"
  >
    <h1
      v-if="title"
      :class="[
        'text-3xl',
        'font-bold',
        { 'text-theme-cyan': props.isDarkBackground },
      ]"
      v-text="title"
    />
    <div
      v-if="description"
      class="text-lg"
      v-text="description"
    />
    <div
      :class="[
        props.isDarkBackground ? 'text-theme-cyan' : 'text-theme-black',
        'text-center',
        'font-bold',
        'border-b-2 border-current',
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
        '[&>li>span:first-child]:text-theme-cyan',
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
      <template v-if="!title && !description">
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
      </template>
      <li>
        <UIcon name="i-material-symbols-check" />
        <span v-text="$t('pricing_page_feature_6')" />
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
  title: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
})

const {
  monthlyPrice,
  yearlyPrice,
} = useSubscriptionPricing()
</script>
