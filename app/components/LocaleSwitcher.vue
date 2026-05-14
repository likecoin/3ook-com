<template>
  <UDropdownMenu
    :items="menuItems"
    :content="{ align: 'end' }"
  >
    <UButton
      :label="$t('account_page_locale_button')"
      variant="outline"
      color="neutral"
      trailing-icon="i-material-symbols-keyboard-arrow-down-rounded"
    />
  </UDropdownMenu>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const { t: $t } = useI18n()
const { locales, setLocale } = useAutoLocale()

const menuItems = computed<DropdownMenuItem[]>(() =>
  locales.value.map((l) => {
    const code = typeof l === 'string' ? l : l.code
    const name = typeof l === 'string' ? l : l.name
    return {
      label: name,
      onSelect: () => setLocale(code as LocaleCode),
    }
  }),
)
</script>
