<template>
  <NuxtLayout
    name="default"
    :is-footer-visible-in-mobile="true"
  >
    <AppHeader :is-connect-hidden="false" />

    <main class="w-full max-w-xl mx-auto p-4 space-y-4 phone:grow">
      <div
        v-if="hasLoggedIn"
        class="flex items-center gap-4 px-2"
      >
        <UAvatar
          class="bg-white border-[#EBEBEB]"
          :src="user?.avatar"
          :alt="user?.displayName"
          icon="i-material-symbols-person-2-rounded"
          size="3xl"
        />
        <div
          class="font-semibold"
          v-text="user?.displayName || user?.likerId"
        />
      </div>
      <UCard v-else>
        <UButton
          :label="$t('account_page_login')"
          :loading="accountStore.isLoggingIn"
          variant="outline"
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

        <UCard :ui="{ body: '!px-3 space-y-4' }">
          <AccountSettingsItem
            v-if="user?.likerId"
            icon="i-material-symbols:identity-platform-rounded"
            :label="$t('account_page_account_id')"
          >
            <div
              class="text-sm font-mono"
              v-text="user?.likerId"
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
            class="items-start"
            icon="i-material-symbols-key-outline-rounded"
            :label="$t('account_page_evm_wallet')"
          >
            <div class="flex flex-col items-end py-2">
              <div
                class="text-xs/5 font-mono"
                v-text="user?.evmWallet"
              />
              <UButton
                v-if="user?.loginMethod === 'magic'"
                class="mt-1"
                :label="$t('account_page_export_private_key_button_label')"
                variant="outline"
                color="error"
                size="xs"
                @click="handleMagicButtonClick"
              />
            </div>
          </AccountSettingsItem>

          <AccountSettingsItem
            v-if="user?.likeWallet"
            icon="i-material-symbols-key-outline-rounded"
            :label="$t('account_page_cosmos_wallet')"
          >
            <div
              class="text-xs font-mono"
              v-text="user?.likeWallet"
            />
          </AccountSettingsItem>

          <AccountSettingsItem
            class="items-start"
            icon="i-material-symbols-diamond-outline-rounded"
            :label="$t('account_page_subscription')"
          >
            <div class="flex flex-col justify-center items-end gap-2 py-2">
              <div
                class="text-sm/5"
                v-text="user?.isLikerPlus ? $t('account_page_subscription_plus') : $t('account_page_subscription_free')"
              />
              <UButton
                :label="user?.isLikerPlus ? $t('account_page_manage_subscription') : $t('account_page_upgrade_to_plus')"
                variant="outline"
                :color="user?.isLikerPlus ? 'primary' : 'secondary'"
                size="sm"
                :loading="isOpeningBillingPortal"
                @click="handleLikerPlusButtonClick"
              />
            </div>
          </AccountSettingsItem>
        </UCard>
      </section>

      <section class="space-y-3 pt-4">
        <h2
          class="px-4 text-lg font-bold"
          v-text="$t('account_page_settings_and_help_title')"
        />

        <UCard :ui="{ body: '!px-3 space-y-4' }">
          <AccountSettingsItem
            icon="i-material-symbols-language"
            :label="$t('account_page_locale')"
          >
            <LocaleSwitcher :is-icon-hidden="true" />
          </AccountSettingsItem>

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
            trailing-icon="i-material-symbols-share-windows-rounded"
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
            trailing-icon="i-material-symbols-share-windows-rounded"
            color="neutral"
            size="lg"
            block
          />
        </UCard>
      </section>

      <UButton
        :label="$t('account_page_reader_cache_clear')"
        icon="i-material-symbols-delete-outline-rounded"
        color="neutral"
        variant="outline"
        size="lg"
        block
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

const likeCoinSessionAPI = useLikeCoinSessionAPI()
const config = useRuntimeConfig()
const { t: $t } = useI18n()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const accountStore = useAccountStore()
const localeRoute = useLocaleRoute()
const { handleError } = useErrorHandler()
const toast = useToast()
const isWindowFocused = useDocumentVisibility()

useHead({
  title: $t('account_page_title'),
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
    if (window.caches) {
      const keys = await window.caches.keys()
      if (keys?.length) {
        const bookKeys = keys.filter(key => key.startsWith(config.public.cacheKeyPrefix))
        await Promise.all(bookKeys.map(key => caches.delete(key)))

        if (window.localStorage) {
          bookKeys.forEach((key) => {
            // TODO: Refactor keys
            [
              'locations',
              'scale',
              'dual-page-mode',
              'right-to-left',
            ].forEach((suffix) => {
              window.localStorage.removeItem(`${key}-${suffix}`)
            })
          })
        }
      }
    }

    toast.add({
      title: $t('account_page_reader_cache_cleared'),
      color: 'success',
    })
  }
  catch (error) {
    await handleError(error, { title: $t('account_page_reader_cache_clear_failed') })
  }
}
</script>
