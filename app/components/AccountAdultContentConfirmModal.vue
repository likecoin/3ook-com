<template>
  <UModal
    :title="$t('account_page_adult_content_confirm_title')"
    :description="$t('account_page_adult_content_confirm_description')"
    :ui="{
      title: 'text-lg font-bold',
      footer: 'flex justify-end gap-3',
    }"
    @update:open="handleOpenUpdate"
  >
    <template #footer>
      <UButton
        :label="$t('common_cancel')"
        variant="outline"
        color="neutral"
        @click="emit('close')"
      />
      <UButton
        :label="$t('account_page_adult_content_confirm_button')"
        color="error"
        @click="confirmAdultContent"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  close: []
}>()

const { t: $t } = useI18n()
const isAdultContentEnabled = useAdultContentSetting()

function handleOpenUpdate(open: boolean) {
  if (!open) emit('close')
}

function confirmAdultContent() {
  isAdultContentEnabled.value = true
  emit('close')
}
</script>
