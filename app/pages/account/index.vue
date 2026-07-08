<template>
  <main class="flex flex-col space-y-4">
    <AccountAvatarSection />

    <AccountIdentityCard />

    <AccountPlusCard />

    <AccountRestorePurchasesCard />

    <AccountWalletCard />

    <section
      v-if="!hasLoggedIn"
      class="space-y-3"
    >
      <UCard
        :ui="{
          body: [
            '!p-0',
            'divide-y-1',
            'divide-(--ui-border)',
            '[&>*:not(:first-child)]:rounded-t-none',
            '[&>*:not(:last-child)]:rounded-b-none',
            '[&>*]:p-4',
            '[&>*]:py-4.5',
          ].join(' '),
        }"
      >
        <UButton
          :label="$t('account_page_view_about')"
          :to="localeRoute({ name: 'about' })"
          variant="link"
          leading-icon="i-material-symbols-info-outline-rounded"
          trailing-icon="i-material-symbols-arrow-forward-rounded"
          color="neutral"
          size="lg"
          block
        />

        <UButton
          v-if="!isApp"
          :label="$t('account_page_view_member')"
          :to="localeRoute({ name: 'member' })"
          variant="solid"
          leading-icon="i-material-symbols-diamond-outline-rounded"
          trailing-icon="i-material-symbols-arrow-forward-rounded"
          color="primary"
          size="lg"
          block
        />
      </UCard>
    </section>

    <AccountPreferencesCard />

    <AccountCreatorCard />

    <section class="space-y-3">
      <UCard :ui="{ body: '!p-0 divide-y-1 divide-(--ui-border) *:first:rounded-b-none' }">
        <UButton
          :label="$t('account_page_contact_support')"
          variant="link"
          class="cursor-pointer"
          leading-icon="i-material-symbols-contact-support"
          trailing-icon="i-material-symbols-chat-bubble-outline-rounded"
          color="neutral"
          size="lg"
          block
          :ui="{ base: 'px-4 py-3' }"
          @click="handleCustomerServiceLinkButtonClick"
        />

        <UButton
          :label="$t('account_page_faq')"
          to="https://docs.3ook.com?utm_source=3ookcom&utm_medium=referral&utm_campaign=3ookcom_account"
          target="_blank"
          variant="link"
          leading-icon="i-material-symbols-question-mark-rounded"
          trailing-icon="i-material-symbols-open-in-new-rounded"
          color="neutral"
          size="lg"
          block
          :ui="{ base: 'px-4 py-3' }"
        />
      </UCard>
    </section>

    <template v-if="hasLoggedIn">
      <UButton
        :label="$t('account_page_reader_cache_clear')"
        icon="i-material-symbols-delete-outline-rounded"
        color="neutral"
        variant="outline"
        size="lg"
        block
        :loading="accountStore.isClearingCaches"
        @click="handleClearReaderCacheButtonClick"
      />

      <UButton
        :label="$t('account_page_logout')"
        icon="i-material-symbols-exit-to-app-rounded"
        variant="outline"
        color="error"
        size="lg"
        block
        @click="handleLogout"
      />

      <UButton
        class="self-center mt-2 p-0 border-b leading-5 rounded-none"
        :label="$t('account_page_delete_account')"
        variant="link"
        color="error"
        size="xs"
        @click="handleDeleteAccountButtonClick"
      />
    </template>
  </main>
</template>

<script setup lang="ts">
import {
  AccountDeleteConfirmModal,
  CustomVoiceUploadModal,
} from '#components'

const { t: $t } = useI18n()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const accountStore = useAccountStore()
const localeRoute = useLocaleRoute()
const { handleError } = useErrorHandler()
const toast = useToast()
const { isApp } = useAppDetection()
const { canStartSubscribeFlow } = useNativeIAP()
const intercom = useIntercom()

const { loadStripeConnectStatus, refreshStripeConnectStatus } = useStripeConnectManagement()
const { isPaymentPastDue, retryLikerPlusPayment } = usePlusManagement()

const { customVoice, fetchCustomVoice } = useCustomVoice()
const overlay = useOverlay()
const customVoiceModal = overlay.create(CustomVoiceUploadModal)
const deleteAccountModal = overlay.create(AccountDeleteConfirmModal)
const blockingModal = useBlockingModal()
const subscription = useSubscriptionModal()

const route = useRoute()

watchImmediate(hasLoggedIn, async (loggedIn) => {
  // This handler calls Nuxt-context APIs (navigateTo, accountStore.refreshSessionInfo)
  // after `await` boundaries. On the server the Nuxt instance is lost across
  // awaits, so those throw "nuxt instance unavailable" — surfacing as a 500
  // when the native WebView reloads a return URL fresh from an external portal
  // (e.g. ?action=billing-return from Stripe). The client keeps a singleton
  // nuxtApp, so restrict this resume/return logic to the client; the immediate
  // re-fire on hydration runs it with a valid context.
  if (import.meta.server) return
  if (loggedIn) {
    if (!user.value?.isLikerPlus) {
      try {
        await callOnce('account-refresh-session', () => accountStore.refreshSessionInfo())
      }
      catch (error) {
        console.error('Failed to refresh session info:', error)
      }
    }
    if (route.query.action === 'stripe-connect-return') {
      await refreshStripeConnectStatus()
      const { action: _action, ...nextQuery } = route.query
      await navigateTo({ query: nextQuery }, { replace: true })
    }
    else {
      await loadStripeConnectStatus()
    }
    if (route.query.action === 'billing-return') {
      if (isPaymentPastDue.value) {
        try {
          await retryLikerPlusPayment()
          await accountStore.refreshSessionInfo()
        }
        catch (error) {
          console.error('Failed to retry past_due payment after billing portal:', error)
        }
      }
      const { action: _action, ...nextQuery } = route.query
      await navigateTo({ query: nextQuery }, { replace: true })
    }
    const isCustomVoiceAction = route.query.action === 'custom-voice'
    if (isCustomVoiceAction) {
      if (!user.value?.isLikerPlus) {
        if (canStartSubscribeFlow.value) {
          subscription.openPaywallModal({ utmSource: 'custom_voice' })
        }
        return
      }
      blockingModal.open({ title: $t('common_processing') })
    }
    try {
      await fetchCustomVoice()
    }
    finally {
      if (isCustomVoiceAction) {
        blockingModal.close()
      }
    }
    if (isCustomVoiceAction) {
      handleOpenCustomVoiceModal()
    }
  }
})

useHead({
  title: $t('account_page_title'),
})

async function handleLogout() {
  await accountStore.logout()
}

function handleOpenCustomVoiceModal() {
  customVoiceModal.open({
    existingVoice: customVoice.value,
  })
}

function openIntercomWithEmailFallback(prefillMessage?: string) {
  return (prefillMessage ? intercom.showNewMessage(prefillMessage) : intercom.show()).method
}

function handleCustomerServiceLinkButtonClick() {
  const method = openIntercomWithEmailFallback()
  useLogEvent('customer_service', { method })
}

async function handleClearReaderCacheButtonClick() {
  useLogEvent('clear_reader_cache')

  try {
    accountStore.clearCaches()

    toast.add({
      title: $t('account_page_reader_cache_cleared'),
      color: 'success',
    })
  }
  catch (error) {
    await handleError(error, { title: $t('account_page_reader_cache_clear_failed') })
  }
}

function handleDeleteAccountButtonClick() {
  deleteAccountModal.open()
}
</script>
