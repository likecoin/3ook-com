<template>
  <section class="space-y-3">
    <UCard :ui="{ body: '!p-0 divide-y-1 divide-(--ui-border)' }">
      <AccountSettingsItem
        v-if="hasLoggedIn && !isApp"
        icon="i-material-symbols-account-balance-wallet-outline-rounded"
        :label="$t('account_page_stripe_connect')"
      >
        <div class="flex flex-col gap-1 text-sm text-muted">
          <div v-text="stripeConnectStatusLabel" />
          <div
            v-if="stripeConnectStatus.isReady && stripeConnectStatus.email"
            class="text-xs/5 font-mono"
            v-text="stripeConnectStatus.email"
          />
        </div>

        <template #right>
          <UButton
            :label="stripeConnectButtonLabel"
            variant="outline"
            color="neutral"
            :loading="isStripeConnectLoading"
            @click="handleStripeConnectButtonClick"
          />
        </template>
      </AccountSettingsItem>
      <UButton
        :label="$t('account_page_publish_book')"
        :to="publishBookURL"
        target="_blank"
        variant="link"
        leading-icon="i-material-symbols-book-4-spark-rounded"
        trailing-icon="i-material-symbols-open-in-new-rounded"
        color="neutral"
        size="lg"
        block
        :ui="{ base: 'px-4 py-3' }"
        @click="handlePublishBookButtonClick"
      />
    </UCard>
  </section>
</template>

<script setup lang="ts">
import { useSignMessage } from '@wagmi/vue'

const config = useRuntimeConfig()
const { t: $t } = useI18n()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const accountStore = useAccountStore()
const { isApp } = useAppDetection()
const { signMessageAsync } = useSignMessage()

const {
  stripeConnectStatus,
  isStripeConnectLoading,
  stripeConnectStatusLabel,
  stripeConnectButtonLabel,
  handleStripeConnectButtonClick,
} = useStripeConnectManagement()

const publishBookURL = computed(() => {
  return `${config.public.publishBookEndpoint}?utm_source=3ookcom&utm_medium=referral&utm_campaign=3ookcom_account`
})

async function handlePublishBookButtonClick(event: MouseEvent) {
  useLogEvent('account_page_publish_book_button_click')

  if (!user.value) return

  const {
    loginMethod,
    evmWallet,
  } = user.value
  if (!loginMethod || loginMethod !== 'magic') return

  // Do not open URL first
  event.preventDefault()

  try {
    // Sign authorize message to login publish.3ook.com automatically
    await accountStore.restoreConnection()
    const payload = JSON.stringify({
      action: 'authorize',
      evmWallet,
      permissions: [
        'read:nftbook',
        'write:nftbook',
        'read:iscn',
        'write:iscn',
      ],
      ts: Date.now(),
    })
    const signature = await signMessageAsync({ message: payload })
    const url = new URL(publishBookURL.value)
    url.searchParams.set('auth', JSON.stringify({
      signature,
      message: payload,
      wallet: evmWallet,
      signMethod: 'personal_sign',
      expiresIn: '7d',
    }))
    await navigateTo(url.toString(), { external: true })
  }
  catch (error) {
    console.error(error)
    await navigateTo(publishBookURL.value, { external: true })
  }
}
</script>
