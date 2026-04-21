<template>
  <div class="flex flex-col items-center justify-center">
    <UButton
      class="rounded-full"
      :label="label"
      :icon="isExhausted ? 'i-material-symbols-lock-outline' : 'i-material-symbols-volume-up-outline-rounded'"
      :color="chipColor"
      variant="soft"
      size="sm"
      @click="emit('click')"
    />
    <span
      v-if="isExhausted"
      class="mt-1 text-xs text-error text-center"
      v-text="$t('tts_trial_chip_upgrade_cta')"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  minutesRemaining: number
  isExhausted: boolean
}>()

const emit = defineEmits<{
  click: []
}>()

const { t: $t } = useI18n()
const colorMode = useColorMode()

const chipColor = computed(() => {
  if (props.isExhausted) return 'error'
  return colorMode.value === 'dark' ? 'primary' : 'secondary'
})

const label = computed(() => {
  if (props.isExhausted) {
    return $t('tts_trial_chip_exhausted_label')
  }
  return $t('tts_trial_chip_progress_label', { minutes: props.minutesRemaining })
})
</script>
