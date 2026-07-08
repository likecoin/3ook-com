<template>
  <UModal
    :title="$t('account_page_display_name_edit_title')"
    :dismissible="!isUpdatingDisplayName"
    :close="!isUpdatingDisplayName"
    :ui="{
      title: 'text-lg font-bold',
      footer: 'flex justify-end gap-3',
    }"
    @update:open="open => !open && emit('close')"
  >
    <template #body>
      <UInput
        v-model="displayNameInput"
        class="w-full"
        autofocus
        :placeholder="$t('account_page_display_name_edit_placeholder')"
        :disabled="isUpdatingDisplayName"
        @keydown.enter="confirmDisplayNameEdit"
      />
    </template>

    <template #footer>
      <UButton
        :label="$t('common_cancel')"
        variant="outline"
        color="neutral"
        :disabled="isUpdatingDisplayName"
        @click="emit('close')"
      />
      <UButton
        :label="$t('account_page_display_name_edit_save')"
        color="primary"
        :loading="isUpdatingDisplayName"
        :disabled="!isDisplayNameInputValid"
        @click="confirmDisplayNameEdit"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  close: []
}>()

const { t: $t } = useI18n()
const { user } = useUserSession()
const accountStore = useAccountStore()
const userAccountSessionAPI = useUserAccountSessionAPI()
const { handleError } = useErrorHandler()
const toast = useToast()

const displayNameInput = ref(user.value?.displayName ?? '')
const isUpdatingDisplayName = ref(false)
const isDisplayNameInputValid = computed(() => {
  const trimmed = displayNameInput.value.trim()
  return trimmed.length > 0 && trimmed !== user.value?.displayName
})

async function confirmDisplayNameEdit() {
  if (!isDisplayNameInputValid.value || isUpdatingDisplayName.value) return
  const nextDisplayName = displayNameInput.value.trim()
  isUpdatingDisplayName.value = true
  try {
    try {
      await userAccountSessionAPI.updateUserProfile({ displayName: nextDisplayName })
    }
    catch (error) {
      await handleError(error, {
        title: $t('account_page_display_name_update_failed'),
      })
      return
    }
    useLogEvent('account_display_name_update_success')
    toast.add({
      title: $t('account_page_display_name_update_success'),
      color: 'success',
    })
    emit('close')
    try {
      await accountStore.refreshSessionInfo()
    }
    catch (error) {
      console.error('Failed to refresh session info after display name update:', error)
    }
  }
  finally {
    isUpdatingDisplayName.value = false
  }
}
</script>
