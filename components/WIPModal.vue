<template>
  <UModal
    :title="props.title"
    :description="$t('work_in_progress')"
    :close="{
      color: 'neutral',
      variant: 'outline',
      class: 'rounded-full',
    }"
  />
</template>

<script setup lang="ts">
const { t: $t } = useI18n()

const props = defineProps({
  title: String,
})
</script>
