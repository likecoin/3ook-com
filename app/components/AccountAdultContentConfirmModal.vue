<template>
  <UModal
    :title="$t('account_page_adult_content_confirm_title')"
    :description="$t('account_page_adult_content_confirm_description')"
    :ui="{
      title: 'text-lg font-bold',
      footer: 'flex justify-end gap-3',
    }"
    @update:open="open => !open && emit('close')"
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
  // The opener applies the setting: useAdultContentSetting() keeps
  // logged-out state per instance, so setting it here would not reach
  // the instance rendering the switch.
  confirm: []
}>()

const { t: $t } = useI18n()

function confirmAdultContent() {
  emit('confirm')
  emit('close')
}
</script>
