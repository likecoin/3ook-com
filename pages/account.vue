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
                :color="user?.isLikerPlus ? 'neutral' : 'secondary'"
                size="sm"
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
        v-if="hasLoggedIn"
        :label="$t('account_page_logout')"
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

const { t: $t } = useI18n()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const accountStore = useAccountStore()
const localeRoute = useLocaleRoute()
const { handleError } = useErrorHandler()

useHead({
  title: $t('account_page_title'),
})

const { $crispChatURL: crispChatURL, $crisp: crisp } = useNuxtApp()

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

async function handleLikerPlusButtonClick() {
  useLogEvent('account_liker_plus_button_click')

  if (!user.value?.isLikerPlus) {
    await navigateTo(localeRoute({ name: 'pricing' }))
    return
  }

  try {
    const { url } = await fetchLikerPlusBillingPortalLink()
    await navigateTo(url, { external: true, open: { target: '_blank' } })
  }
  catch (error) {
    await handleError(error, {
      title: $t('error_billing_portal_failed'),
    })
  }
}

async function handleCustomerServiceLinkButtonClick() {
  if (!crisp) {
    await navigateTo(crispChatURL, {
      external: true,
      open: { target: '_blank' },
    })
    useLogEvent('customer_service', { method: 'link' })
    return
  }
  useLogEvent('customer_service', { method: 'chat' })

  crisp?.do('chat:show')
  crisp?.do('chat:open')
}
</script>
