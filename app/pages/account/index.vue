<template>
  <main class="flex flex-col space-y-4">
    <section
      v-if="hasLoggedIn"
      class="flex flex-col items-center gap-3"
    >
      <div class="relative">
        <UAvatar
          class="bg-white border border-muted size-24"
          :src="user?.avatar"
          :alt="user?.displayName || ''"
          icon="i-material-symbols-person-2-rounded"
          size="3xl"
        />
        <UserAvatarPlusBadge
          v-if="user?.isLikerPlus"
          class="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/4"
          color="primary"
        />
        <div class="absolute -bottom-1 -right-1 rounded-full bg-(--app-bg)">
          <UButton
            class="rounded-[inherit]"
            icon="i-material-symbols-edit-outline-rounded"
            variant="outline"
            color="neutral"
            :loading="isUploadingAvatar"
            :aria-label="$t('account_page_avatar_change_avatar')"
            @click="handleAvatarEditButtonClick"
          />
        </div>
        <input
          ref="avatarFileInput"
          class="hidden"
          type="file"
          accept="image/*"
          @change="handleAvatarFileChange"
        >
      </div>
    </section>

    <section
      v-if="hasLoggedIn"
      class="space-y-3"
    >
      <UCard :ui="{ body: '!p-0 divide-y-1 divide-(--ui-border)' }">
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
              color="neutral"
            />
          </template>
        </AccountSettingsItem>

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
      </UCard>
    </section>

    <section
      v-if="hasLoggedIn && isPlusFeatureVisible"
      class="space-y-3"
    >
      <UCard :ui="{ body: '!p-0 divide-y-1 divide-(--ui-border)' }">
        <AccountSettingsItem
          v-if="hasLoggedIn"
          icon="i-material-symbols-diamond-outline-rounded"
          :label="$t('account_page_subscription')"
        >
          <div
            class="text-sm/5"
            v-text="subscriptionStateLabel"
          />

          <template
            v-if="likerPlusManageMode !== 'none'"
            #right
          >
            <div
              v-if="likerPlusManageMode === 'store-info'"
              class="text-sm text-muted text-right"
              v-text="$t('account_page_manage_on_device')"
            />
            <UButton
              v-else
              :label="likerPlusButtonLabel"
              :variant="user?.isLikerPlus ? 'outline' : 'solid'"
              :color="user?.isLikerPlus ? 'neutral' : 'primary'"
              :loading="isOpeningBillingPortal || isManagingSubscription"
              @click="handleLikerPlusButtonClick"
            />
          </template>
        </AccountSettingsItem>

        <AccountSettingsItem
          v-if="hasLoggedIn && !isApp"
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
              :to="localeRoute({ name: 'gift-plus' })"
            />
          </template>
        </AccountSettingsItem>

        <AccountSettingsItem
          v-if="hasLoggedIn"
          icon="i-material-symbols-record-voice-over-outline"
          :label="$t('tts_custom_voice_section_title')"
        >
          <div
            v-if="hasCustomVoice"
            class="text-sm text-muted"
            v-text="customVoice?.voiceName"
          />

          <template #right>
            <UButton
              v-if="user?.isLikerPlus"
              :label="hasCustomVoice ? $t('tts_custom_voice_change_button') : $t('account_page_create_custom_voice_button')"
              variant="outline"
              color="neutral"
              @click="handleOpenCustomVoiceModal"
            />
            <UButton
              v-else
              :label="$t('account_page_upgrade_to_plus')"
              icon="i-material-symbols-lock-outline"
              variant="solid"
              color="primary"
              :to="localeRoute({ name: 'member', query: { ll_medium: 'custom-voice' } })"
            />
          </template>
        </AccountSettingsItem>
      </UCard>
    </section>

    <section
      v-if="hasLoggedIn && isIAPSupported && !user?.isLikerPlus"
      class="space-y-3"
    >
      <UCard :ui="{ body: '!p-0 divide-y-1 divide-(--ui-border)' }">
        <AccountSettingsItem
          icon="i-material-symbols-sync-rounded"
          :label="$t('account_restore_purchases_label')"
        >
          <div
            class="text-sm/5"
            v-text="$t('account_restore_purchases_description')"
          />

          <template #right>
            <UButton
              :label="$t('account_restore_purchases_button')"
              variant="outline"
              color="neutral"
              :loading="isRestoringPurchases"
              @click="handleRestorePurchases"
            />
          </template>
        </AccountSettingsItem>
      </UCard>
    </section>

    <section
      v-if="hasLoggedIn && (likeBalance > 0n || !!user?.likeWallet)"
      class="space-y-3"
    >
      <UCard :ui="{ body: '!p-0 divide-y-1 divide-(--ui-border)' }">
        <AccountSettingsItem
          v-if="!isApp || likeBalance > 0n"
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
              color="neutral"
              variant="outline"
              size="lg"
            />
          </template>
        </AccountSettingsItem>

        <AccountSettingsItem
          v-if="!isApp || likeBalance > 0n"
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
              color="neutral"
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
      </UCard>
    </section>

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

    <section class="space-y-3">
      <UCard :ui="{ body: '!p-0 divide-y-1 divide-(--ui-border)' }">
        <AccountSettingsItem
          icon="i-material-symbols-language"
          :label="$t('account_page_locale')"
        >
          <div
            class="text-sm text-muted"
            v-text="localeLabel"
          />

          <template #right>
            <LocaleSwitcher />
          </template>
        </AccountSettingsItem>

        <AccountSettingsItem
          v-if="!isApp"
          icon="i-material-symbols-payments-outline-rounded"
          :label="$t('account_page_payment_currency')"
        >
          <div
            class="text-sm text-muted"
            v-text="currencyLabel"
          />

          <template #right>
            <CurrencySwitcher />
          </template>
        </AccountSettingsItem>

        <AccountSettingsItem
          v-if="isPlusFeatureVisible"
          icon="i-material-symbols-dark-mode-outline-rounded"
          :label="$t('account_page_color_mode')"
        >
          <div
            v-if="user?.isLikerPlus"
            class="text-sm text-muted"
            v-text="colorModeLabel"
          />

          <template #right>
            <ColorModeSwitcher v-if="user?.isLikerPlus" />
            <UButton
              v-else
              :label="$t('account_page_upgrade_to_plus')"
              icon="i-material-symbols-lock-outline"
              variant="solid"
              color="primary"
              :to="localeRoute({ name: 'member', query: { ll_medium: 'color-mode' } })"
            />
          </template>
        </AccountSettingsItem>

        <AccountSettingsItem
          v-if="!isApp"
          icon="i-material-symbols-18-up-rating-outline-rounded"
          :label="$t('account_page_adult_content')"
        >
          <div
            class="text-sm text-muted"
            v-text="$t('account_page_adult_content_description')"
          />

          <template #right>
            <USwitch
              :model-value="isAdultContentEnabled"
              @update:model-value="handleAdultContentToggle"
            />
          </template>
        </AccountSettingsItem>
      </UCard>
    </section>

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
import { formatUnits } from 'viem'
import { useSignMessage } from '@wagmi/vue'
import {
  AccountAdultContentConfirmModal,
  AccountDeleteConfirmModal,
  AccountDisplayNameModal,
  AccountEmailModal,
  CustomVoiceUploadModal,
} from '#components'
import likeCoinTokenImage from '~/assets/images/likecoin-token.png'

const config = useRuntimeConfig()
const userAccountSessionAPI = useUserAccountSessionAPI()
const plusSessionAPI = usePlusSessionAPI()
const { t: $t, locale } = useI18n()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const accountStore = useAccountStore()
const stakingStore = useStakingStore()
const bookshelfStore = useBookshelfStore()
const localeRoute = useLocaleRoute()
const { handleError } = useErrorHandler()
const toast = useToast()
const { copy: copyToClipboard } = useClipboard()
const { isApp } = useAppDetection()
const { isIAPSupported, canStartSubscribeFlow, restore: restorePurchases } = useNativeIAP()
const intercom = useIntercom()

const isRestoringPurchases = ref(false)

// App Store / Play account-based restore: re-sync entitlements from the store,
// then refresh the backend session so `isLikerPlus` reflects the result.
async function handleRestorePurchases() {
  if (isRestoringPurchases.value) return
  // RevenueCat is keyed by likerId (the backend internal user id), so a missing
  // likerId can't attribute the restore to the right user — gate it like checkout.
  if (!user.value?.likerId) {
    toast.add({
      title: $t('pricing_page_liker_id_required'),
      description: $t('pricing_page_liker_id_required_description'),
      color: 'warning',
    })
    return
  }
  try {
    isRestoringPurchases.value = true
    const result = await restorePurchases(user.value.likerId)
    if (result.status !== 'success') {
      // Route through a recognized handler so the modal shows only the localized
      // copy; otherwise handleError surfaces the raw native/English message
      // (e.g. "Restore timed out") in its debug code block.
      await handleError(new Error('RESTORE_PURCHASES_FAILED'), {
        customHandlerMap: {
          RESTORE_PURCHASES_FAILED: { description: $t('error_restore_purchases_failed') },
        },
      })
      return
    }
    // result.isPlus is RevenueCat's device-side truth for whether this store
    // account holds the entitlement — trust it for the toast so a lagging
    // backend webhook doesn't show a false "nothing to restore". The session
    // refresh syncs isLikerPlus (which gates features) once the webhook lands.
    await accountStore.refreshSessionInfo()
    const restored = result.isPlus ?? user.value?.isLikerPlus ?? false
    toast.add({
      title: restored
        ? $t('account_restore_purchases_success')
        : $t('account_restore_purchases_none'),
      color: restored ? 'success' : 'info',
    })
  }
  catch (error) {
    handleError(error)
  }
  finally {
    isRestoringPurchases.value = false
  }
}

const isAdultContentEnabled = useAdultContentSetting()

const AVATAR_MAX_BYTES = 2 * 1024 * 1024

const avatarFileInput = useTemplateRef<HTMLInputElement>('avatarFileInput')
const isUploadingAvatar = ref(false)

const { locales } = useAutoLocale()
const { currency, options: currencyOptions } = usePaymentCurrency()
const { preference: colorModePreference, options: colorModeOptions } = useColorModeSync()

const localeLabel = computed(() => {
  const found = locales.value.find(l => (typeof l === 'string' ? l : l.code) === locale.value)
  if (!found) return ''
  return typeof found === 'string' ? found : found.name
})
const currencyLabel = computed(
  () => currencyOptions.value.find(o => o.value === currency.value)?.label ?? '',
)
const colorModeLabel = computed(
  () => colorModeOptions.value.find(o => o.value === colorModePreference.value)?.label ?? '',
)

const isPlusFeatureVisible = computed(() => canStartSubscribeFlow.value || !!user.value?.isLikerPlus)

const {
  stripeConnectStatus,
  isStripeConnectLoading,
  stripeConnectStatusLabel,
  stripeConnectButtonLabel,
  loadStripeConnectStatus,
  refreshStripeConnectStatus,
  handleStripeConnectButtonClick,
} = useStripeConnectManagement()

const {
  isPaymentPastDue,
  subscriptionStateLabel,
  likerPlusButtonLabel,
  likerPlusManageMode,
  isOpeningBillingPortal,
  isManagingSubscription,
  handleLikerPlusButtonClick,
} = usePlusManagement()

function handleAdultContentToggle(value: boolean) {
  if (value) {
    adultContentConfirmModal.open()
  }
  else {
    isAdultContentEnabled.value = false
  }
}

const { customVoice, hasCustomVoice, fetchCustomVoice } = useCustomVoice()
const overlay = useOverlay()
const customVoiceModal = overlay.create(CustomVoiceUploadModal)
const displayNameModal = overlay.create(AccountDisplayNameModal)
const emailModal = overlay.create(AccountEmailModal)
const adultContentConfirmModal = overlay.create(AccountAdultContentConfirmModal)
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
          await plusSessionAPI.retryLikerPlusPayment()
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

const walletAddress = computed(() => user.value?.evmWallet)
const {
  likeBalance,
  formattedLikeBalance,
  refetch: refetchLikeBalance,
} = useLikeCoinBalance(walletAddress)
const { claimWalletRewards } = useLikeCollectiveContract()
const waitForTransaction = useWaitForTransaction()

useHead({
  title: $t('account_page_title'),
})

const { signMessageAsync } = useSignMessage()

const publishBookURL = computed(() => {
  return `${config.public.publishBookEndpoint}?utm_source=3ookcom&utm_medium=referral&utm_campaign=3ookcom_account`
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

function handleDisplayNameEditButtonClick() {
  useLogEvent('account_display_name_edit_click')
  displayNameModal.open()
}

function handleEmailEditButtonClick() {
  useLogEvent('account_email_edit_click')
  emailModal.open()
}

function handleAvatarEditButtonClick() {
  if (isUploadingAvatar.value) return
  useLogEvent('account_avatar_edit_click')
  avatarFileInput.value?.click()
}

async function handleAvatarFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    toast.add({
      title: $t('account_page_avatar_invalid_file'),
      color: 'error',
    })
    return
  }
  if (file.size > AVATAR_MAX_BYTES) {
    toast.add({
      title: $t('account_page_avatar_too_large'),
      color: 'error',
    })
    return
  }
  isUploadingAvatar.value = true
  try {
    try {
      const resizedFile = await resizeImageFile(file, 256)
      await userAccountSessionAPI.uploadUserAvatar(resizedFile)
    }
    catch (error) {
      await handleError(error, {
        title: $t('account_page_avatar_update_failed'),
      })
      return
    }
    useLogEvent('account_avatar_update_success')
    toast.add({
      title: $t('account_page_avatar_update_success'),
      color: 'success',
    })
    try {
      await accountStore.refreshSessionInfo()
    }
    catch (error) {
      console.error('Failed to refresh session info after avatar update:', error)
    }
  }
  finally {
    isUploadingAvatar.value = false
  }
}

async function handleMagicButtonClick() {
  useLogEvent('export_private_key')
  await accountStore.exportPrivateKey()
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

function handleOpenCustomVoiceModal() {
  customVoiceModal.open({
    existingVoice: customVoice.value,
  })
}

async function handleClaimStakingRewardButtonClick() {
  useLogEvent('account_claim_reward_button_click')

  if (!user.value?.evmWallet || totalUnclaimedRewards.value <= 0n) return

  try {
    await accountStore.restoreConnection()

    const hash = await claimWalletRewards(user.value.evmWallet)
    await waitForTransaction(hash)

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

function handleDeleteAccountButtonClick() {
  deleteAccountModal.open()
}
</script>
