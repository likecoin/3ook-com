<template>
  <UBadge
    class="absolute bottom-2 left-2"
    icon="i-material-symbols-offline-pin-rounded"
    :title="$t('bookshelf_item_offline_badge_label')"
    :aria-label="$t('bookshelf_item_offline_badge_label')"
    color="neutral"
    variant="solid"
    size="sm"
  />
</template>

<script setup lang="ts">
const { t: $t } = useI18n()
</script>
