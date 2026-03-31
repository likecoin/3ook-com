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
        'whitespace-pre-wrap',
      ]"
      v-text="title"
    />
    <div
      v-if="description"
      class="text-lg"
      v-text="description"
    />
    <PricingPlanBenefits
      :is-dark-background="props.isDarkBackground"
      :is-compact="props.isCompact || (!!title && !!description)"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  isDarkBackground: {
    type: Boolean,
    default: false,
  },
  isCompact: {
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
</script>
