<template>
  <USelectMenu
    :model-value="region"
    :items="options"
    value-key="value"
    :filter-fields="['label', 'name', 'value']"
    :search-input="{ placeholder: $t('account_page_region_search_placeholder') }"
    trailing-icon="i-material-symbols-keyboard-arrow-down-rounded"
    variant="outline"
    color="neutral"
    :ui="{ content: 'w-auto min-w-52 max-w-xs' }"
    @update:model-value="setRegion"
  >
    <span v-text="$t('account_page_region_button')" />
  </USelectMenu>
</template>

<script setup lang="ts">
const { t: $t } = useI18n()
const { region, setRegion } = useRegion()
const { options } = useRegionOptions()
</script>
