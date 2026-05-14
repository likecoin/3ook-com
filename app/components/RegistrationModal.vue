<template>
  <UModal
    :close="{ onClick: handleClose }"
    :title="$t('registration_modal_title')"
    :ui="{
      content: 'max-w-[348px]',
      body: 'space-y-4',
      footer: 'flex justify-end',
    }"
  >
    <template #body>
      <UFormField
        v-if="!isAccountIdHidden"
        :label="$t('registration_modal_account_id_label')"
        :error="accountIdError"
        required
      >
        <UInput
          v-model="accountId"
          class="w-full"
        />
      </UFormField>

      <UFormField
        :label="$t('registration_modal_email_label')"
        :error="emailError"
        required
      >
        <UInput
          v-model="email"
          class="w-full"
          placeholder="you@example.com"
          type="email"
        />
      </UFormField>

      <UFormField
        v-if="!props.isDisplayNameHidden"
        :label="$t('registration_modal_display_name_label')"
        :hint="$t('registration_modal_optional_label')"
      >
        <UInput
          v-model="displayName"
          class="w-full"
          placeholder="Display Name"
        />
      </UFormField>
    </template>

    <template #footer>
      <UButton
        :label="$t('registration_modal_register_button_label')"
        size="xl"
        @click="handleRegisterButtonClick"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
const { t: $t } = useI18n()

interface RegistrationModalProps {
  email?: string
  accountId?: string
  isAccountIdHidden?: boolean
  displayName?: string
  isDisplayNameHidden?: boolean
}

const props = withDefaults(defineProps<RegistrationModalProps>(), {
  email: '',
  accountId: '',
  isAccountIdHidden: false,
  displayName: '',
  isDisplayNameHidden: false,
})

const accountId = ref(props.accountId || '')
const isAccountIdHidden = ref(props.isAccountIdHidden || false)
const accountIdError = ref('')
const email = ref(props.email || '')
const emailError = ref('')
const displayName = ref(props.displayName || '')

const emit = defineEmits<{ close: [{ accountId: string, email: string, displayName?: string | undefined }] | [] }>()

watch(accountIdError, (newValue) => {
  // If accountId has an error, show the accountId field if it was hidden
  if (newValue && isAccountIdHidden.value) {
    isAccountIdHidden.value = false
  }
})

function handleRegisterButtonClick() {
  useLogEvent('register_button_click')
  accountIdError.value = ''
  emailError.value = ''

  if (!accountId.value) {
    accountIdError.value = $t('registration_modal_error_account_id_required')
    return
  }

  if (!verifyAccountId(accountId.value)) {
    accountIdError.value = $t('registration_modal_error_account_id_invalid')
    return
  }

  if (!email.value) {
    emailError.value = $t('registration_modal_error_email_required')
    return
  }

  if (!verifyEmail(email.value)) {
    emailError.value = $t('registration_modal_error_email_invalid')
    return
  }

  emit('close', {
    accountId: accountId.value,
    email: email.value,
    displayName: displayName.value,
  })
}

function handleClose() {
  useLogEvent('register_liker_id_close_button_click')
  emit('close')
}
</script>
