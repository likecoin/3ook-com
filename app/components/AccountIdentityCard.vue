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
        v-if="publicLikerId"
        icon="i-material-symbols-3p-outline-rounded"
        :label="$t('account_page_account_id')"
      >
        <UButton
          class="-ml-2 text-sm font-mono"
          :label="publicLikerId"
          trailing-icon="i-material-symbols-content-copy-outline-rounded"
          variant="ghost"
          color="neutral"
          size="xs"
          @click="handleLikerIdClick"
        />

        <template
          v-if="!hasLikerIdChanged"
          #right
        >
          <UButton
            :label="$t('account_page_liker_id_edit_button')"
            icon="i-material-symbols-edit-outline-rounded"
            variant="outline"
            color="neutral"
            @click="handleLikerIdEditButtonClick"
          />
        </template>
      </AccountSettingsItem>
    </UCard>
  </section>
</template>

<script setup lang="ts">
import { AccountDisplayNameModal, AccountEmailModal, AccountLikerIdModal } from '#components'

const { t: $t } = useI18n()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const accountStore = useAccountStore()
const toast = useToast()

const overlay = useOverlay()
const displayNameModal = overlay.create(AccountDisplayNameModal)
const emailModal = overlay.create(AccountEmailModal)
const likerIdModal = overlay.create(AccountLikerIdModal)

const { publicLikerId, hasLikerIdChanged } = usePublicLikerId()

function handleDisplayNameEditButtonClick() {
  useLogEvent('account_display_name_edit_click')
  displayNameModal.open()
}

function handleEmailEditButtonClick() {
  useLogEvent('account_email_edit_click')
  emailModal.open()
}

function handleLikerIdEditButtonClick() {
  useLogEvent('account_liker_id_edit_click')
  likerIdModal.open()
}

async function handleMagicButtonClick() {
  useLogEvent('export_private_key')
  await accountStore.exportPrivateKey()
}

async function handleLikerIdClick() {
  useLogEvent('liker_id_wallet_click')
  const isCopied = await copyTextToClipboard(publicLikerId.value)
  toast.add({
    title: $t(isCopied ? 'copy_liker_id_success' : 'copy_liker_id_failed'),
    icon: isCopied ? 'i-material-symbols-3p-outline-rounded' : 'i-material-symbols-error-circle-rounded',
    duration: 3000,
    color: isCopied ? 'success' : 'error',
  })
  if (isCopied) {
    useLogEvent('account_liker_id_copy')
  }
}

async function handleEVMWalletClick() {
  useLogEvent('account_evm_wallet_click')
  const isCopied = await copyTextToClipboard(user.value?.evmWallet || '')
  toast.add({
    title: $t(isCopied ? 'copy_evm_wallet_success' : 'copy_evm_wallet_failed'),
    icon: isCopied ? 'i-material-symbols-key-outline-rounded' : 'i-material-symbols-error-circle-rounded',
    duration: 3000,
    color: isCopied ? 'success' : 'error',
  })
  if (isCopied) {
    useLogEvent('account_evm_wallet_copy')
  }
}
</script>
