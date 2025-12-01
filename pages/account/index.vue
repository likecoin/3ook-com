<template>
  <main class="space-y-4">
    <section
      v-if="hasLoggedIn"
      class="space-y-3"
    >
      <UCard :ui="{ body: '!p-0 divide-y-1 divide-(--ui-border)' }">
        <AccountSettingsItem
          icon="i-material-symbols-diamond-outline-rounded"
          :label="$t('account_page_subscription')"
        >
          <div
            class="text-sm/5"
            v-text="subscriptionStateLabel"
          />

          <template #right>
            <UButton
              :label="user?.isLikerPlus ? $t('account_page_manage_subscription') : $t('account_page_upgrade_to_plus')"
              :variant="user?.isLikerPlus ? 'outline' : 'solid'"
              color="primary"
              :loading="isOpeningBillingPortal"
              @click="handleLikerPlusButtonClick"
            />
          </template>
        </AccountSettingsItem>

        <AccountSettingsItem
          icon="i-material-symbols-featured-seasonal-and-gifts-rounded"
          :label="$t('account_page_gift_plus')"
        >
          <div
            class="text-sm/5"
            v-text="$t('account_page_gift_plus_description')"
          />

          <template #right>
            <UButton
              :label="$t('account_page_gift_plus_button')"
              color="primary"
              variant="outline"
              :to="localeRoute({ name: 'gift-plus' })"
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

          <template #right>
            <UButton
              class="cursor-pointer"
              :to="localeRoute({ name: 'list' })"
              icon="i-material-symbols-favorite-outline-rounded"
              :label="$t('account_page_book_list')"
              variant="outline"
              color="primary"
            />
          </template>
        </AccountSettingsItem>

        <AccountSettingsItem
          v-if="user?.displayName"
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
            class="text-sm font-mono"
            v-text="user?.displayName"
          />
        </AccountSettingsItem>

        <AccountSettingsItem
          v-if="user?.email"
          icon="i-material-symbols-mail-outline-rounded"
          :label="$t('account_page_email')"
        >
          <div
            class="text-sm"
            v-text="user?.email"
          />
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
          :label="$t('account_page_likecoin')"
        >
          <template #label-prepend>
            <img
              class="w-5 h-5"
              :src="likeCoinTokenImage"
              :alt="$t('account_page_likecoin')"
            >
          </template>

          <BalanceLabel
            class="text-sm text-muted"
            :value="formattedLikeBalance"
          />

          <template #right>
            <UButton
              :to="localeRoute({ name: 'account-deposit' })"
              :label="$t('account_page_governance_button')"
              size="lg"
            />
          </template>
        </AccountSettingsItem>

        <AccountSettingsItem
          :label="$t('account_page_staking_reward')"
          icon="i-material-symbols-auto-graph-rounded"
        >
          <BalanceLabel
            class="text-sm text-muted"
            :value="formattedTotalStakingRewards"
          />

          <template #right>
            <UButton
              :label="$t('account_page_staking_reward_claim_button')"
              variant="outline"
              size="lg"
              :disabled="totalUnclaimedRewards <= 0n"
              loading-auto
              @click="handleClaimStakingRewardButtonClick"
            />
          </template>
        </AccountSettingsItem>

        <AccountSettingsItem
          v-if="user?.likeWallet"
          icon="i-material-symbols-key-outline-rounded"
          :label="$t('account_page_cosmos_wallet')"
        >
          <UTooltip :text="user.likeWallet">
            <UButton
              class="-ml-2 text-xs/5 font-mono"
              :label="shortenWalletAddress(user.likeWallet)"
              trailing-icon="i-material-symbols-open-in-new-rounded"
              :to="likeWalletButtonTo"
              external
              target="_blank"
              variant="ghost"
              color="neutral"
              size="xs"
              @click="handleLikeWalletClick"
            />
          </UTooltip>

          <template #right>
            <UButton
              :label="$t('account_page_migrate_legacy_book')"
              trailing-icon="i-material-symbols-open-in-new-rounded"
              :to="config.public.likeCoinV3BookMigrationSiteURL"
              external
              target="_blank"
              variant="outline"
              color="neutral"
              size="xs"
              @click="handleMigrateLegacyBookButtonClick"
            />
          </template>
        </AccountSettingsItem>

        <AccountSettingsItem
          icon="i-material-symbols-language"
          :label="$t('account_page_locale')"
        >
          <template #right>
            <LocaleSwitcher :is-icon-hidden="true" />
          </template>
        </AccountSettingsItem>
      </UCard>
    </section>

    <section class="space-y-3">
      <h2
        class="px-4 pt-4 text-lg font-bold"
        v-text="$t('account_page_settings_and_help_title')"
      />

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
          :label="$t('account_page_contact_support')"
          variant="link"
          class="cursor-pointer"
          leading-icon="i-material-symbols-contact-support"
          trailing-icon="i-material-symbols-chat-bubble-outline-rounded"
          color="neutral"
          size="lg"
          block
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
        />

        <UButton
          :label="$t('account_page_publish_book')"
          to="https://publish.3ook.com?utm_source=3ookcom&utm_medium=referral&utm_campaign=3ookcom_account"
          target="_blank"
          variant="link"
          leading-icon="i-material-symbols-book-4-spark-rounded"
          trailing-icon="i-material-symbols-open-in-new-rounded"
          color="neutral"
          size="lg"
          block
        />
      </UCard>
    </section>

    <UButton
      v-if="hasLoggedIn"
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
      v-if="hasLoggedIn"
      :label="$t('account_page_logout')"
      icon="i-material-symbols-exit-to-app-rounded"
      variant="outline"
      color="error"
      size="lg"
      block
      @click="handleLogout"
    />
  </main>
</template>

<script setup lang="ts">
import { formatUnits } from 'viem'
import { waitForTransactionReceipt } from '@wagmi/core'

import likeCoinTokenImage from '~/assets/images/likecoin-token.png'

const config = useRuntimeConfig()
const { $wagmiConfig } = useNuxtApp()
const likeCoinSessionAPI = useLikeCoinSessionAPI()
const { t: $t, locale } = useI18n()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const accountStore = useAccountStore()
const stakingStore = useStakingStore()
const bookshelfStore = useBookshelfStore()
const localeRoute = useLocaleRoute()
const { handleError } = useErrorHandler()
const toast = useToast()
const isWindowFocused = useDocumentVisibility()
const { copy: copyToClipboard } = useClipboard()

const { formattedLikeBalance, refetch: refetchLikeBalance } = useLikeCoinBalance(user.value?.evmWallet)
const { claimWalletRewards } = useLikeCollectiveContract()

useHead({
  title: $t('account_page_title'),
})

const subscriptionStateLabel = computed(() => {
  if (!user.value) return undefined
  if (user.value.isLikerPlus) {
    // TODO: Support Trial
    return $t('account_page_subscription_plus')
  }
  return $t('account_page_subscription_free')
})

const likeWalletButtonTo = computed(() => {
  if (!user.value?.likeWallet) return undefined
  return `${config.public.likerLandSiteURL}/${locale.value}/${user.value.likeWallet}?tab=collected`
})

const formattedTotalStakingRewards = computed(() => {
  return user.value ? stakingStore.getFormattedTotalRewards(user.value.evmWallet) : '0'
})

const stakingData = computed(() => {
  return user.value
    ? stakingStore.getUserStakingData(user.value.evmWallet)
    : {
        items: [],
        totalUnclaimedRewards: 0n,
        isFetching: false,
        hasFetched: false,
      }
})

const totalUnclaimedRewards = computed(() => stakingData.value.totalUnclaimedRewards)

async function handleLogout() {
  await accountStore.logout()
}

async function handleMagicButtonClick() {
  useLogEvent('export_private_key')
  await accountStore.exportPrivateKey()
}

const isOpeningBillingPortal = ref(false)

async function handleLikerPlusButtonClick() {
  useLogEvent('account_liker_plus_button_click')

  if (!user.value?.isLikerPlus) {
    await navigateTo(localeRoute({ name: 'member' }))
    return
  }

  if (isOpeningBillingPortal.value) return
  try {
    isOpeningBillingPortal.value = true
    const { url } = await likeCoinSessionAPI.fetchLikerPlusBillingPortalLink()
    // NOTE: Not using _blank here as some browsers block popups
    await navigateTo(url, { external: true })
    // NOTE: Keep `isOpeningBillingPortal` true while navigating to the billing portal
    do {
      await sleep(3000)
    } while (!isWindowFocused.value)
    isOpeningBillingPortal.value = false
  }
  catch (error) {
    isOpeningBillingPortal.value = false
    await handleError(error, {
      title: $t('error_billing_portal_failed'),
    })
  }
}

async function handleCustomerServiceLinkButtonClick() {
  if (!window?.Intercom) {
    window.open('mailto:cs@3ook.com', '_blank')
    useLogEvent('customer_service', { method: 'link' })
    return
  }
  window.Intercom('show')
  useLogEvent('customer_service', { method: 'chat' })
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

function handleLikeWalletClick() {
  useLogEvent('account_like_wallet_click')
}

function handleMigrateLegacyBookButtonClick() {
  useLogEvent('migrate_legacy_book_button_click')
}

async function handleClaimStakingRewardButtonClick() {
  useLogEvent('account_claim_reward_button_click')

  if (!user.value?.evmWallet || totalUnclaimedRewards.value <= 0n) return

  try {
    await accountStore.restoreConnection()

    const hash = await claimWalletRewards(user.value.evmWallet)
    await waitForTransactionReceipt($wagmiConfig, {
      hash,
      confirmations: 2,
    })

    toast.add({
      title: $t('staking_claim_all_rewards_success'),
      color: 'success',
      icon: 'i-material-symbols-check-circle',
    })

    useLogEvent('staking_claim_all_rewards_success', {
      total_amount: formatUnits(totalUnclaimedRewards.value, config.public.likeCoinTokenDecimals),
      book_count: bookshelfStore.items.length,
    })

    // Reload data to refresh rewards
    if (user.value?.evmWallet) {
      await Promise.all([
        stakingStore.fetchUserStakingData(user.value.evmWallet),
        bookshelfStore.fetchItems({ walletAddress: user.value.evmWallet, isRefresh: true }),
        refetchLikeBalance(),
      ])
    }
  }
  catch (error) {
    await handleError(error, {
      title: $t('staking_claim_all_rewards_error'),
    })
  }
}
</script>
