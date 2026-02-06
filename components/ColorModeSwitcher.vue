<template>
  <USelect
    class="min-w-32"
    :model-value="selectedColorMode"
    :items="colorModeOptions"
    trailing-icon="i-material-symbols-keyboard-arrow-down-rounded"
    size="md"
    :disabled="disabled"
    @update:model-value="handleColorModeChange"
  />
</template>

<script setup lang="ts">
const { t: $t } = useI18n()
const { preference } = useColorModeSync()

withDefaults(defineProps<{
  disabled?: boolean
}>(), {
  disabled: false,
})

const colorModeOptions = computed(() => [
  {
    label: $t('color_mode_light'),
    value: 'light',
  },
  {
    label: $t('color_mode_dark'),
    value: 'dark',
  },
  {
    label: $t('color_mode_system'),
    value: 'system',
  },
])

const selectedColorMode = computed(() => preference.value)

function handleColorModeChange(value: string) {
  preference.value = value as ColorMode
  useLogEvent('color_mode_switch', { colorMode: value })
}
</script>
