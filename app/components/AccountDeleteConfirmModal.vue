<template>
  <UModal
    :dismissible="!isDeletingAccount"
    :close="!isDeletingAccount"
    :ui="{
      title: 'text-lg font-bold',
      footer: 'flex justify-end gap-3',
    }"
    @update:open="open => !open && emit('close')"
  >
    <template #title>
      <span v-text="$t('account_page_delete_account_confirm_title')" />
    </template>

    <template #body>
      <div class="space-y-4">
        <p
          class="text-sm"
          v-text="$t('account_page_delete_account_confirm_description')"
        />

        <UAlert
          icon="i-material-symbols-warning-outline-rounded"
          color="error"
          variant="subtle"
          :title="$t('account_page_delete_account_confirm_warning')"
        />
      </div>
    </template>

    <template #footer>
      <UButton
        :label="$t('common_cancel')"
        variant="outline"
        color="neutral"
        :disabled="isDeletingAccount"
        @click="emit('close')"
      />
      <UButton
        :label="$t('account_page_delete_account_confirm_button')"
        color="error"
        :loading="isDeletingAccount"
        @click="confirmDeleteAccount"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { useSignMessage } from '@wagmi/vue'

const emit = defineEmits<{
  close: []
}>()

const { t: $t } = useI18n()
const { user } = useUserSession()
const accountStore = useAccountStore()
const { handleError } = useErrorHandler()
const toast = useToast()
const { signMessageAsync } = useSignMessage()

const isDeletingAccount = ref(false)

async function confirmDeleteAccount() {
  if (!user.value?.likerId || !user.value?.evmWallet) return

  const { evmWallet } = user.value
  isDeletingAccount.value = true

  try {
    await accountStore.restoreConnection()

    // Sign authorize message
    const authorizePayload = JSON.stringify({
      action: 'authorize',
      permissions: ['write'],
      ts: Date.now(),
      evmWallet,
    })
    const authorizeSignature = await signMessageAsync({ message: authorizePayload })

    // Sign delete message
    const deletePayload = JSON.stringify({
      action: 'user_delete',
      ts: Date.now(),
      evmWallet,
    })
    const deleteSignature = await signMessageAsync({ message: deletePayload })

    await $fetch('/api/account/delete', {
      method: 'POST',
      body: {
        wallet: evmWallet,
        signMethod: 'personal_sign',
        authorizeSignature,
        authorizeMessage: authorizePayload,
        deleteSignature,
        deleteMessage: deletePayload,
      },
    })

    useLogEvent('account_delete_account_success')

    await accountStore.logout()
    emit('close')

    toast.add({
      title: $t('account_page_delete_account_success'),
      color: 'success',
    })
  }
  catch (error) {
    await handleError(error, {
      title: $t('account_page_delete_account_error'),
    })
  }
  finally {
    isDeletingAccount.value = false
  }
}
</script>
