<template>
  <UDropdownMenu
    :items="menuItems"
    :content="{ align: 'end' }"
  >
    <UButton
      :label="$t('account_page_color_mode_button')"
      variant="outline"
      color="neutral"
      trailing-icon="i-material-symbols-keyboard-arrow-down-rounded"
    />
  </UDropdownMenu>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const { t: $t } = useI18n()
const { preference } = useColorModeSync()

const menuItems = computed<DropdownMenuItem[]>(() =>
  getColorModeOptions($t).map(option => ({
    label: option.label,
    onSelect: () => {
      preference.value = option.value
      useLogEvent('color_mode_switch', { colorMode: option.value })
    },
  })),
)
</script>
