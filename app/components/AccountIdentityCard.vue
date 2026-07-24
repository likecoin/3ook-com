<template>
  <section
    v-if="hasLoggedIn"
    class="space-y-3"
  >
    <UCard :ui="{ body: '!p-0 divide-y-1 divide-(--ui-border)' }">
      <AccountSettingsItem
        icon="i-material-symbols-account-circle-outline"
        :label="$t('account_page_account_display_name')"
      >
        <template #label-append>
          <UTooltip :text="$t('account_page_display_name_tooltip')">
            <UButton
              class="rounded-full opacity-50"
              icon="i-material-symbols-help-outline-rounded"
              size="xs"
              color="neutral"
              variant="ghost"
            />
          </UTooltip>
        </template>

        <div
          v-if="user?.displayName"
          class="text-sm font-mono"
          v-text="user.displayName"
        />

        <template #right>
          <UButton
            :label="$t('account_page_display_name_edit_button')"
            icon="i-material-symbols-edit-outline-rounded"
            variant="outline"
            color="neutral"
            @click="handleDisplayNameEditButtonClick"
          />
        </template>
      </AccountSettingsItem>

      <AccountSettingsItem
        icon="i-material-symbols-mail-outline-rounded"
        :label="$t('account_page_email')"
      >
        <div
          v-if="user?.email"
          class="text-sm"
          v-text="user.email"
        />
        <div
          v-else
          class="text-sm text-muted"
          v-text="$t('account_page_email_empty')"
        />

        <template #right>
          <UButton
            :label="$t('account_page_email_edit_button')"
            icon="i-material-symbols-edit-outline-rounded"
            variant="outline"
            color="neutral"
            @click="handleEmailEditButtonClick"
          />
        </template>
      </AccountSettingsItem>

      <AccountSettingsItem
        icon="i-material-symbols-key-outline-rounded"
        :label="$t('account_page_evm_wallet')"
      >
        <UTooltip :text="user?.evmWallet">
          <UButton
            class="-ml-2 text-xs/5 font-mono"
            :label="shortenWalletAddress(user?.evmWallet)"
            trailing-icon="i-material-symbols-content-copy-outline-rounded"
            variant="ghost"
            color="neutral"
            size="xs"
            @click="handleEVMWalletClick"
          />
        </UTooltip>

        <template
          v-if="accountStore.isLoginWithMagic"
          #right
        >
          <UButton
            :label="$t('account_page_export_private_key_button_label')"
            variant="outline"
            color="error"
            size="xs"
            @click="handleMagicButtonClick"
          />
        </template>
      </AccountSettingsItem>

      <AccountSettingsItem
        v-if="user?.likerId"
        icon="i-material-symbols-3p-outline-rounded"
        :label="$t('account_page_account_id')"
      >
        <UButton
          class="-ml-2 text-sm font-mono"
          :label="user?.likerId"
          trailing-icon="i-material-symbols-content-copy-outline-rounded"
          variant="ghost"
          color="neutral"
          size="xs"
          @click="handleLikerIdClick"
        />
      </AccountSettingsItem>
    </UCard>
  </section>
</template>

<script setup lang="ts">
import { AccountDisplayNameModal, AccountEmailModal } from '#components'

const { t: $t } = useI18n()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const accountStore = useAccountStore()
const toast = useToast()
const { copy: copyToClipboard } = useClipboard()

const overlay = useOverlay()
const displayNameModal = overlay.create(AccountDisplayNameModal)
const emailModal = overlay.create(AccountEmailModal)

function handleDisplayNameEditButtonClick() {
  useLogEvent('account_display_name_edit_click')
  displayNameModal.open()
}

function handleEmailEditButtonClick() {
  useLogEvent('account_email_edit_click')
  emailModal.open()
}

async function handleMagicButtonClick() {
  useLogEvent('export_private_key')
  await accountStore.exportPrivateKey()
}

async function handleLikerIdClick() {
  useLogEvent('liker_id_wallet_click')
  try {
    await copyToClipboard(user.value?.likerId || '')
    useLogEvent('account_liker_id_copy')
    toast.add({
      title: $t('copy_liker_id_success'),
      duration: 3000,
      icon: 'i-material-symbols-3p-outline-rounded',
      color: 'success',
    })
  }
  catch (error) {
    console.error('Failed to copy wallet address:', error)
    toast.add({
      title: $t('copy_liker_id_failed'),
      icon: 'i-material-symbols-error-circle-rounded',
      duration: 3000,
      color: 'error',
    })
  }
}

async function handleEVMWalletClick() {
  useLogEvent('account_evm_wallet_click')
  try {
    await copyToClipboard(user.value?.evmWallet || '')
    useLogEvent('account_evm_wallet_copy')
    toast.add({
      title: $t('copy_evm_wallet_success'),
      duration: 3000,
      icon: 'i-material-symbols-key-outline-rounded',
      color: 'success',
    })
  }
  catch (error) {
    console.error('Failed to copy wallet address:', error)
    toast.add({
      title: $t('copy_evm_wallet_failed'),
      icon: 'i-material-symbols-error-circle-rounded',
      duration: 3000,
      color: 'error',
    })
  }
}
</script>
