<template>
  <NuxtLayout
    name="default"
    :is-footer-visible="true"
  >
    <main class="w-full max-w-xl mx-auto p-4 space-y-4 phone:grow">
      <UCard
        v-if="!hasLoggedIn"
        :ui="{ header: 'flex justify-center items-center p-4 sm:p-4 bg-theme-black' }"
      >
        <template #header>
          <AppLogo
            :is-icon="false"
            :height="64"
          />
        </template>

        <UButton
          :label="$t('account_page_login')"
          :loading="accountStore.isLoggingIn"
          icon="i-material-symbols-login"
          color="primary"
          variant="outline"
          size="xl"
          block
          @click="handleLogin"
        />
      </UCard>

      <section
        v-if="hasLoggedIn"
        class="space-y-3 pt-4"
      >
        <h2
          class="px-4 text-lg font-bold"
          v-text="$t('account_page_account_title')"
        />

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
              v-if="user?.loginMethod === 'magic'"
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

      <section
        v-if="hasLoggedIn"
        class="space-y-3 pt-4"
      >
        <h2
          class="px-4 text-lg font-bold"
          v-text="$t('account_page_governance_title', { defaultValue: 'Governance' })"
        />

        <UCard :ui="{ body: '!p-0 divide-y-1 divide-(--ui-border)' }">
          <UButton
            :to="localeRoute({ name: 'account-governance' })"
            :label="$t('account_page_governance_button', { defaultValue: 'Manage Governance & Voting' })"
            leading-icon="i-material-symbols-how-to-vote-outline-rounded"
            trailing-icon="i-material-symbols-arrow-forward-rounded"
            variant="link"
            color="primary"
            size="lg"
            class="justify-between px-4 py-3"
          />
        </UCard>
      </section>

      <section class="space-y-3 pt-4">
        <h2
          class="px-4 text-lg font-bold"
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
  </NuxtLayout>
</template>

<script setup lang="ts">
// NOTE: Set `layout` to false for injecting props into `<NuxtLayout/>`.
definePageMeta({ layout: false })

const config = useRuntimeConfig()
const likeCoinSessionAPI = useLikeCoinSessionAPI()
const { t: $t, locale } = useI18n()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const accountStore = useAccountStore()
const localeRoute = useLocaleRoute()
const { handleError } = useErrorHandler()
const toast = useToast()
const isWindowFocused = useDocumentVisibility()
const { copy: copyToClipboard } = useClipboard()

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

async function handleLogin() {
  await accountStore.login()
}

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
    await navigateTo(localeRoute({ name: 'pricing' }))
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
</script>
