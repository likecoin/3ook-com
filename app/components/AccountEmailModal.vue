<template>
  <UModal
    :title="$t('account_page_email_edit_title')"
    :dismissible="!isUpdatingEmail"
    :close="!isUpdatingEmail"
    :ui="{
      title: 'text-lg font-bold',
      footer: 'flex justify-end gap-3',
    }"
    @update:open="open => !open && emit('close')"
  >
    <template #body>
      <div class="space-y-3">
        <UInput
          v-model="emailInput"
          class="w-full"
          type="email"
          autofocus
          :placeholder="$t('account_page_email_edit_placeholder')"
          :disabled="isUpdatingEmail"
          @keydown.enter="confirmEmailEdit"
        />
        <p
          class="text-xs text-muted"
          v-text="accountStore.isLoginWithMagic
            ? $t('account_page_email_edit_hint_magic')
            : $t('account_page_email_edit_hint_wallet')"
        />
      </div>
    </template>

    <template #footer>
      <UButton
        :label="$t('common_cancel')"
        variant="outline"
        color="neutral"
        :disabled="isUpdatingEmail"
        @click="emit('close')"
      />
      <UButton
        :label="$t('account_page_email_edit_save')"
        color="primary"
        :loading="isUpdatingEmail"
        :disabled="!isEmailInputValid"
        @click="confirmEmailEdit"
      />
    </template>
  </UModal>
</template>

<script lang="ts">
// Module-scoped so an in-flight update keeps blocking re-submission even if
// the modal instance is recreated — the Magic flow closes this modal before
// opening Magic's OTP UI while the update continues in the background.
const isUpdatingEmail = ref(false)
</script>

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

const emailInput = ref(user.value?.email ?? '')
const isEmailInputValid = computed(() => {
  const normalized = normalizeEmail(emailInput.value)
  return validateEmail(normalized) && normalized !== normalizeEmail(user.value?.email ?? '')
})

async function confirmEmailEdit() {
  if (!isEmailInputValid.value || isUpdatingEmail.value) return
  const nextEmail = normalizeEmail(emailInput.value)
  const isMagic = accountStore.isLoginWithMagic
  isUpdatingEmail.value = true
  try {
    try {
      // Pre-check the email is free in our DB before any Magic OTP round-trip.
      await userAccountSessionAPI.checkEmailAvailability(nextEmail)
      if (isMagic) {
        // Close our modal before Magic opens its own OTP UI; our modal's focus
        // trap and backdrop would otherwise block interaction with Magic's popup.
        emit('close')
        // Magic's OTP-verified change preserves the wallet and returns a fresh
        // DID token, or undefined if the user cancels — abort quietly on cancel.
        const magicDIDToken = await accountStore.updateMagicEmail(nextEmail)
        if (!magicDIDToken) return
        await userAccountSessionAPI.updateUserEmail({ email: nextEmail, magicDIDToken })
      }
      else {
        await userAccountSessionAPI.updateUserEmail({ email: nextEmail })
      }
    }
    catch (error) {
      await handleError(error, { title: $t('account_page_email_update_failed') })
      return
    }

    // Wallet users verify via our own email; non-fatal if the send fails.
    if (!isMagic) {
      try {
        await userAccountSessionAPI.sendEmailVerification()
      }
      catch (error) {
        console.error('Failed to send verification email after email update:', error)
      }
    }

    useLogEvent('account_email_update_success')
    toast.add({
      title: isMagic
        ? $t('account_page_email_update_success')
        : $t('account_page_email_verification_sent'),
      color: 'success',
    })
    emit('close')
    try {
      await accountStore.refreshSessionInfo()
    }
    catch (error) {
      console.error('Failed to refresh session info after email update:', error)
    }
  }
  finally {
    isUpdatingEmail.value = false
  }
}
</script>
