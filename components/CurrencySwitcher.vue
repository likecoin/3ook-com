<template>
  <UDropdownMenu
    :items="menuItems"
    :content="{ align: 'end' }"
  >
    <UButton
      :label="$t('account_page_payment_currency_button')"
      variant="outline"
      color="neutral"
      trailing-icon="i-material-symbols-keyboard-arrow-down-rounded"
    />
  </UDropdownMenu>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const { t: $t } = useI18n()
const { setCurrency } = usePaymentCurrency()

const menuItems = computed<DropdownMenuItem[]>(() =>
  getCurrencyOptions($t).map(option => ({
    label: option.label,
    onSelect: () => {
      setCurrency(option.value)
      useLogEvent('currency_switch', { currency: option.value })
    },
  })),
)
</script>
