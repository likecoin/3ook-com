<template>
  <UModal
    :title="$t('error_modal_title')"
    :description="props.description"
    :close="{
      color: 'neutral',
      variant: 'outline',
      class: 'rounded-full',
      onClick: () => emit('close'),
    }"
  />
</template>

<script setup lang="ts">
const emit = defineEmits(['close'])

const props = defineProps({
  description: String,
})

const { t: $t } = useI18n()
</script>
