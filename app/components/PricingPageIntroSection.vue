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
        'text-2xl laptop:text-3xl',
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
      v-model:tier="selectedTier"
      :is-dark-background="props.isDarkBackground"
      :prepended-features="props.prependedFeatures"
      :is-tier-selector-visible="props.isTierSelectorVisible"
      :current-tier="props.currentTier"
      :is-voice-sample-enabled="props.isVoiceSampleEnabled"
      :benefits-copy-variant="props.benefitsCopyVariant"
      @show-voices="emit('showVoices')"
      @show-voice-sample="emit('showVoiceSample')"
    />
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
  prependedFeatures: {
    type: Array as PropType<string[]>,
    default: () => [],
  },
  isTierSelectorVisible: {
    type: Boolean,
    default: false,
  },
  // The viewer's active tier, so the toggle can mark their current plan.
  currentTier: {
    type: String as PropType<LikerPlusTier>,
    default: undefined,
  },
  isVoiceSampleEnabled: {
    type: Boolean,
    default: false,
  },
  // Copy variant from the pricing page experiment, forwarded to the benefits list.
  benefitsCopyVariant: {
    type: String,
    default: undefined,
  },
})

const emit = defineEmits<{ showVoices: [], showVoiceSample: [] }>()

const selectedTier = defineModel<LikerPlusTier>('tier', { default: 'plus' })
</script>
