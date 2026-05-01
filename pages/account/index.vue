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
          vertical-align="top"
          :is-inverted="true"
        />
        <div class="absolute -bottom-1 -right-1 rounded-full bg-(--app-bg)">
          <UButton
            class="rounded-[inherit]"
            icon="i-material-symbols-edit-outline-rounded"
            variant="outline"
            color="primary"
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
              color="primary"
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
              color="primary"
              @click="handleDisplayNameEditButtonClick"
            />
          </template>
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
      </UCard>
    </section>

    <section
      v-if="hasLoggedIn && isPlusFeatureVisible"
      class="space-y-3"
    >
      <h2
        class="px-4 pt-4 text-lg font-bold"
        v-text="$t('account_page_plus_title')"
      />

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
            v-if="!isApp && (user?.isLikerPlus || user?.isExpiredLikerPlus)"
            #right
          >
            <UButton
              :label="likerPlusButtonLabel"
              :variant="user?.isLikerPlus ? 'outline' : 'solid'"
              color="primary"
              :loading="isOpeningBillingPortal"
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
              variant="outline"
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
              :label="hasCustomVoice ? $t('tts_custom_voice_change_button') : $t('tts_custom_voice_upload_button')"
              :variant="hasCustomVoice ? 'outline' : 'solid'"
              color="primary"
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
      v-if="hasLoggedIn && (likeBalance > 0n || !!user?.likeWallet)"
      class="space-y-3"
    >
      <h2
        class="px-4 pt-4 text-lg font-bold"
        v-text="$t('account_page_likecoin_title')"
      />

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
      <h2
        class="px-4 pt-4 text-lg font-bold"
        v-text="$t('account_page_learn_more_title')"
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
          variant="link"
          leading-icon="i-material-symbols-diamond-outline-rounded"
          trailing-icon="i-material-symbols-arrow-forward-rounded"
          color="neutral"
          size="lg"
          block
        />
      </UCard>
    </section>

    <section class="space-y-3">
      <h2
        class="px-4 pt-4 text-lg font-bold"
        v-text="$t('account_page_app_settings_title')"
      />

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
      <h2
        class="px-4 pt-4 text-lg font-bold"
        v-text="$t('account_page_author_title')"
      />

      <UCard
        v-if="hasLoggedIn"
        :ui="{ body: '!p-0 divide-y-1 divide-(--ui-border)' }"
      >
        <AccountSettingsItem
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
              :variant="stripeConnectState === 'ready' ? 'outline' : 'solid'"
              color="primary"
              :loading="isStripeConnectLoading"
              @click="handleStripeConnectButtonClick"
            />
          </template>
        </AccountSettingsItem>
      </UCard>

      <UCard :ui="{ body: '!p-0 divide-y-1 divide-(--ui-border)' }">
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
          @click="handlePublishBookButtonClick"
        />
      </UCard>
    </section>

    <section class="space-y-3">
      <h2
        class="px-4 pt-4 text-lg font-bold"
        v-text="$t('account_page_settings_and_help_title')"
      />

      <UCard :ui="{ body: '!p-0 divide-y-1 divide-(--ui-border)' }">
        <UButton
          :label="$t('account_page_contact_support')"
          variant="link"
          class="cursor-pointer"
          leading-icon="i-material-symbols-contact-support"
          :trailing-icon="isApp ? 'i-material-symbols-mail-outline' : 'i-material-symbols-chat-bubble-outline-rounded'"
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
        @click="isDeleteAccountDialogOpen = true"
      />
    </template>

    <UModal
      v-model:open="isDisplayNameEditModalOpen"
      :title="$t('account_page_display_name_edit_title')"
      :dismissible="!isUpdatingDisplayName"
      :close="!isUpdatingDisplayName"
      :ui="{
        title: 'text-lg font-bold',
        footer: 'flex justify-end gap-3',
      }"
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
          @click="isDisplayNameEditModalOpen = false"
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

    <UModal
      v-model:open="isAdultContentConfirmOpen"
      :title="$t('account_page_adult_content_confirm_title')"
      :description="$t('account_page_adult_content_confirm_description')"
      :ui="{
        title: 'text-lg font-bold',
        footer: 'flex justify-end gap-3',
      }"
    >
      <template #footer>
        <UButton
          :label="$t('common_cancel')"
          variant="outline"
          color="neutral"
          @click="isAdultContentConfirmOpen = false"
        />
        <UButton
          :label="$t('account_page_adult_content_confirm_button')"
          color="error"
          @click="confirmAdultContent"
        />
      </template>
    </UModal>

    <UModal
      v-model:open="isDeleteAccountDialogOpen"
      :dismissible="!isDeletingAccount"
      :close="!isDeletingAccount"
      :ui="{
        title: 'text-lg font-bold',
        footer: 'flex justify-end gap-3',
      }"
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
          @click="isDeleteAccountDialogOpen = false"
        />
        <UButton
          :label="$t('account_page_delete_account_confirm_button')"
          color="error"
          :loading="isDeletingAccount"
          @click="confirmDeleteAccount"
        />
      </template>
    </UModal>
  </main>
</template>

<script setup lang="ts">
import { formatUnits } from 'viem'
import { waitForTransactionReceipt } from '@wagmi/core'
import { useSignMessage } from '@wagmi/vue'
import { CustomVoiceUploadModal } from '#components'
import type { FetchStripeConnectStatusResponseData } from '~/composables/use-likecoin-session-api'
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
const { copy: copyToClipboard } = useClipboard()
const { isApp } = useAppDetection()

const isAdultContentEnabled = useAdultContentSetting()
const isAdultContentConfirmOpen = ref(false)

const AVATAR_MAX_BYTES = 2 * 1024 * 1024

const avatarFileInput = useTemplateRef<HTMLInputElement>('avatarFileInput')
const isUploadingAvatar = ref(false)

const isDisplayNameEditModalOpen = ref(false)
const isUpdatingDisplayName = ref(false)
const displayNameInput = ref('')
const isDisplayNameInputValid = computed(() => {
  const trimmed = displayNameInput.value.trim()
  return trimmed.length > 0 && trimmed !== user.value?.displayName
})

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

const isPlusFeatureVisible = computed(() => !isApp.value || !!user.value?.isLikerPlus)

const stripeConnectStatus = ref<FetchStripeConnectStatusResponseData>({
  hasAccount: false,
  isReady: false,
})
const isStripeConnectLoading = ref(false)

type StripeConnectState = 'ready' | 'pending' | 'none'

const stripeConnectState = computed<StripeConnectState>(() => {
  if (stripeConnectStatus.value.isReady) return 'ready'
  if (stripeConnectStatus.value.hasAccount) return 'pending'
  return 'none'
})

const stripeConnectStatusLabel = computed(() => {
  switch (stripeConnectState.value) {
    case 'ready':
      return $t('account_page_stripe_connect_status_ready')
    case 'pending':
      return $t('account_page_stripe_connect_status_pending')
    case 'none':
      return $t('account_page_stripe_connect_status_none')
  }
  return ''
})

const stripeConnectButtonLabel = computed(() => {
  switch (stripeConnectState.value) {
    case 'ready':
      return $t('account_page_stripe_connect_manage_button')
    case 'pending':
      return $t('account_page_stripe_connect_resume_button')
    case 'none':
      return $t('account_page_stripe_connect_setup_button')
  }
  return ''
})

function resetStripeConnectState() {
  stripeConnectStatus.value = {
    hasAccount: false,
    isReady: false,
  }
  isStripeConnectLoading.value = false
}

watch(() => user.value?.evmWallet, () => {
  resetStripeConnectState()
})

async function loadStripeConnectStatus() {
  if (!user.value?.evmWallet) return
  try {
    stripeConnectStatus.value = await likeCoinSessionAPI.fetchStripeConnectStatus({
      wallet: user.value.evmWallet,
    })
  }
  catch (error) {
    console.error('Failed to fetch Stripe Connect status:', error)
  }
}

async function refreshStripeConnectStatus() {
  try {
    await likeCoinSessionAPI.refreshStripeConnectStatus()
  }
  catch (error) {
    console.error('Failed to refresh Stripe Connect status:', error)
  }
  await loadStripeConnectStatus()
}

async function handleStripeConnectButtonClick() {
  if (isStripeConnectLoading.value) return
  const isManage = stripeConnectState.value === 'ready'
  isStripeConnectLoading.value = true
  try {
    useLogEvent(isManage ? 'stripe_connect_login' : 'stripe_connect_setup_started')
    const { url } = isManage
      ? await likeCoinSessionAPI.fetchStripeConnectLoginLink()
      : await likeCoinSessionAPI.createStripeConnectAccount()
    await navigateTo(url, { external: true })
  }
  catch (error) {
    isStripeConnectLoading.value = false
    await handleError(error, {
      title: isManage
        ? $t('account_page_stripe_connect_manage_failed')
        : $t('account_page_stripe_connect_setup_failed'),
    })
  }
}

function handleAdultContentToggle(value: boolean) {
  if (value) {
    isAdultContentConfirmOpen.value = true
  }
  else {
    isAdultContentEnabled.value = false
  }
}

function confirmAdultContent() {
  isAdultContentEnabled.value = true
  isAdultContentConfirmOpen.value = false
}

const { customVoice, hasCustomVoice, fetchCustomVoice } = useCustomVoice()
const overlay = useOverlay()
const customVoiceModal = overlay.create(CustomVoiceUploadModal)
const blockingModal = useBlockingModal()
const subscription = useSubscriptionModal()

const route = useRoute()

watchImmediate(hasLoggedIn, async (loggedIn) => {
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
          await likeCoinSessionAPI.retryLikerPlusPayment()
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
        if (!isApp.value) {
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

useHead({
  title: $t('account_page_title'),
})

const { signMessageAsync } = useSignMessage()

const publishBookURL = computed(() => {
  return `${config.public.publishBookEndpoint}?utm_source=3ookcom&utm_medium=referral&utm_campaign=3ookcom_account`
})

const isPaymentPastDue = computed(() =>
  !!user.value?.isExpiredLikerPlus && user.value?.likerPlusSubscriptionStatus === 'past_due',
)

const subscriptionStateLabel = computed(() => {
  if (!user.value) return undefined
  if (user.value.isLikerPlus) {
    // TODO: Support Trial
    return $t('account_page_subscription_plus')
  }
  if (user.value.isExpiredLikerPlus) {
    if (isPaymentPastDue.value) {
      return $t('account_page_subscription_past_due')
    }
    return $t('account_page_subscription_expired')
  }
  return $t('account_page_subscription_free')
})

const likerPlusButtonLabel = computed(() => {
  if (user.value?.isLikerPlus) return $t('account_page_manage_subscription')
  if (isPaymentPastDue.value) return $t('account_page_update_payment')
  return $t('account_page_renew_subscription')
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
  displayNameInput.value = user.value?.displayName ?? ''
  isDisplayNameEditModalOpen.value = true
}

async function confirmDisplayNameEdit() {
  if (!isDisplayNameInputValid.value || isUpdatingDisplayName.value) return
  const nextDisplayName = displayNameInput.value.trim()
  isUpdatingDisplayName.value = true
  try {
    try {
      await likeCoinSessionAPI.updateUserProfile({ displayName: nextDisplayName })
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
    isDisplayNameEditModalOpen.value = false
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
      await likeCoinSessionAPI.uploadUserAvatar(resizedFile)
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

const isOpeningBillingPortal = ref(false)

async function handleLikerPlusButtonClick() {
  useLogEvent('account_liker_plus_button_click')

  if (!user.value?.isLikerPlus && !isPaymentPastDue.value) {
    await navigateTo(localeRoute({ name: 'member' }))
    return
  }
  if (isOpeningBillingPortal.value) return
  try {
    isOpeningBillingPortal.value = true
    const { url } = await likeCoinSessionAPI.fetchLikerPlusBillingPortalLink()
    // NOTE: Not using _blank here as some browsers block popups
    await navigateTo(url, { external: true })
  }
  catch (error) {
    isOpeningBillingPortal.value = false
    await handleError(error, {
      title: $t('error_billing_portal_failed'),
    })
  }
}

function openIntercomWithEmailFallback(prefillMessage?: string) {
  if (!isApp.value && window?.Intercom) {
    if (prefillMessage) {
      window.Intercom('showNewMessage', prefillMessage)
    }
    else {
      window.Intercom('show')
    }
    return 'chat'
  }
  let mailto = 'mailto:cs@3ook.com'
  if (prefillMessage) {
    mailto += `?subject=${encodeURIComponent(prefillMessage)}`
  }
  window.open(mailto, '_blank')
  return 'link'
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

const isDeleteAccountDialogOpen = ref(false)
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
    isDeleteAccountDialogOpen.value = false

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
